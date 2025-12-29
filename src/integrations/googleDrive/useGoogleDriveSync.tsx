import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { GOOGLE_CLIENT_ID } from "../../config/google";
import {
    createFileInAppData,
    downloadFile,
    findFileInAppData,
    updateFile,
    DriveFileMetadata,
} from "./googleDriveClient";
import { exportSaveJson } from "../../store/saveSerialization";
import { hydrateStoreFromJson } from "../../store/hydrateFromSave";
import { defaultState } from "../../store/initialState";
import { store } from "../../store";
import { hashString } from "../../utils/hash";

type SyncStatus =
    | "idle"
    | "authenticating"
    | "authenticated"
    | "loading"
    | "ready"
    | "saving"
    | "error";

type TokenClient = {
    requestAccessToken: (options: { prompt?: string }) => void;
    callback: (response: { access_token?: string; error?: string }) => void;
};

type GoogleDriveSyncState = {
    status: SyncStatus;
    isAuthenticated: boolean;
    error: string | null;
    accessToken: string | null;
    fileMeta: DriveFileMetadata | null;
    isDirty: boolean;
    trySilentSignIn: () => Promise<boolean>;
    signInInteractive: () => Promise<boolean>;
    loadFromDrive: () => Promise<boolean>;
    saveToDrive: (json: string) => Promise<boolean>;
    signOut: () => void;
};

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const SAVE_FILE_NAME = "prosperitas-save.json";
const SAVE_MIME_TYPE = "application/json";

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (options: {
                        client_id: string;
                        scope: string;
                        callback: () => void;
                    }) => unknown;
                    revoke?: (
                        accessToken: string,
                        done: () => void
                    ) => void;
                };
            };
        };
    }
}

let gisScriptPromise: Promise<void> | null = null;

const loadGisScript = (): Promise<void> => {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Google Identity Services requires a browser"));
    }

    if (window.google?.accounts?.oauth2) {
        return Promise.resolve();
    }

    if (!gisScriptPromise) {
        gisScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () =>
                reject(new Error("Failed to load Google Identity Services"));
            document.head.appendChild(script);
        });
    }

    return gisScriptPromise;
};

const GoogleDriveSyncContext = createContext<GoogleDriveSyncState | null>(null);

export const GoogleDriveSyncProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [status, setStatus] = useState<SyncStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [fileMeta, setFileMeta] = useState<DriveFileMetadata | null>(null);
    const [currentSnapshotHash, setCurrentSnapshotHash] = useState(() =>
        hashString(exportSaveJson(store.getState()))
    );
    const [lastSavedSnapshotHash, setLastSavedSnapshotHash] = useState(() =>
        hashString(exportSaveJson(store.getState()))
    );
    const tokenClientRef = useRef<TokenClient | null>(null);

    const isAuthenticated = Boolean(accessToken);
    const isDirty = currentSnapshotHash !== lastSavedSnapshotHash;

    useEffect(() => {
        let debounceTimer: number | undefined;
        const unsubscribe = store.subscribe(() => {
            if (debounceTimer) {
                window.clearTimeout(debounceTimer);
            }
            debounceTimer = window.setTimeout(() => {
                const json = exportSaveJson(store.getState());
                setCurrentSnapshotHash(hashString(json));
            }, 500);
        });

        return () => {
            if (debounceTimer) {
                window.clearTimeout(debounceTimer);
            }
            unsubscribe();
        };
    }, []);

    const ensureTokenClient = useCallback(async (): Promise<TokenClient> => {
        if (!GOOGLE_CLIENT_ID) {
            throw new Error(
                "Missing Google OAuth client ID. Set VITE_GOOGLE_CLIENT_ID."
            );
        }

        await loadGisScript();

        if (!tokenClientRef.current) {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: DRIVE_SCOPE,
                callback: () => undefined,
            });
            tokenClientRef.current = client as TokenClient;
        }

        return tokenClientRef.current;
    }, []);

    const requestAccessToken = useCallback(
        async (prompt: "" | "consent"): Promise<string> => {
            const client = await ensureTokenClient();
            return new Promise((resolve, reject) => {
                client.callback = (response) => {
                    if (response?.access_token) {
                        resolve(response.access_token);
                        return;
                    }
                    reject(
                        new Error(
                            response?.error ||
                                "Google authentication did not return a token"
                        )
                    );
                };
                client.requestAccessToken({ prompt });
            });
        },
        [ensureTokenClient]
    );

    const trySilentSignIn = useCallback(async (): Promise<boolean> => {
        setStatus("authenticating");
        setError(null);
        try {
            const token = await requestAccessToken("");
            setAccessToken(token);
            setStatus("authenticated");
            return true;
        } catch (authError) {
            const message =
                authError instanceof Error ? authError.message : "";
            if (message.includes("Missing Google OAuth client ID")) {
                setStatus("error");
                setError(message);
            } else {
                setStatus("idle");
                setError(null);
            }
            return false;
        }
    }, [requestAccessToken]);

    const signInInteractive = useCallback(async (): Promise<boolean> => {
        setStatus("authenticating");
        setError(null);
        try {
            const token = await requestAccessToken("consent");
            setAccessToken(token);
            setStatus("authenticated");
            return true;
        } catch (authError) {
            const message =
                authError instanceof Error
                    ? authError.message
                    : "Google authentication failed";
            setStatus("error");
            setError(message);
            return false;
        }
    }, [requestAccessToken]);

    const handleDriveError = useCallback(
        (driveError: unknown, fallbackStatus: SyncStatus) => {
            const statusCode =
                typeof driveError === "object" &&
                driveError &&
                "status" in driveError
                    ? (driveError as { status?: number }).status
                    : undefined;

            if (statusCode === 401) {
                setAccessToken(null);
                setFileMeta(null);
                setStatus("idle");
                setError("Session expired. Please sign in again.");
                return;
            }

            const message =
                driveError instanceof Error
                    ? driveError.message
                    : "Google Drive request failed";
            setStatus(fallbackStatus);
            setError(message);
        },
        []
    );

    const loadFromDrive = useCallback(async (): Promise<boolean> => {
        if (!accessToken) {
            setStatus("idle");
            setError("Not authenticated");
            return false;
        }

        setStatus("loading");
        setError(null);

        try {
            const existing = await findFileInAppData(
                accessToken,
                SAVE_FILE_NAME
            );
            if (existing?.id) {
                const json = await downloadFile(accessToken, existing.id);
                hydrateStoreFromJson(json);
                setFileMeta(existing);
                setLastSavedSnapshotHash(hashString(json));
            } else {
                const defaultJson = JSON.stringify(defaultState);
                hydrateStoreFromJson(defaultJson);
                setFileMeta(null);
                setLastSavedSnapshotHash(hashString(defaultJson));
            }
            setStatus("ready");
            return true;
        } catch (driveError) {
            handleDriveError(driveError, "error");
            return false;
        }
    }, [accessToken, handleDriveError]);

    const saveToDrive = useCallback(
        async (json: string): Promise<boolean> => {
            if (!accessToken) {
                setStatus("idle");
                setError("Not authenticated");
                return false;
            }

            setStatus("saving");
            setError(null);

            try {
                let targetMeta = fileMeta;
                if (!targetMeta) {
                    targetMeta = await findFileInAppData(
                        accessToken,
                        SAVE_FILE_NAME
                    );
                }

                const metadata = targetMeta?.id
                    ? await updateFile(
                          accessToken,
                          targetMeta.id,
                          SAVE_MIME_TYPE,
                          json
                      )
                    : await createFileInAppData(
                          accessToken,
                          SAVE_FILE_NAME,
                          SAVE_MIME_TYPE,
                          json
                      );

                setFileMeta(metadata);
                setLastSavedSnapshotHash(hashString(json));
                setStatus("ready");
                return true;
            } catch (driveError) {
                handleDriveError(driveError, "error");
                return false;
            }
        },
        [accessToken, fileMeta, handleDriveError]
    );

    const signOut = useCallback(() => {
        if (accessToken && window.google?.accounts?.oauth2?.revoke) {
            window.google.accounts.oauth2.revoke(accessToken, () => undefined);
        }
        setAccessToken(null);
        setFileMeta(null);
        setStatus("idle");
        setError(null);
        setLastSavedSnapshotHash(currentSnapshotHash);
    }, [accessToken, currentSnapshotHash]);

    const value = useMemo<GoogleDriveSyncState>(
        () => ({
            status,
            isAuthenticated,
            error,
            accessToken,
            fileMeta,
            isDirty,
            trySilentSignIn,
            signInInteractive,
            loadFromDrive,
            saveToDrive,
            signOut,
        }),
        [
            status,
            isAuthenticated,
            error,
            accessToken,
            fileMeta,
            isDirty,
            trySilentSignIn,
            signInInteractive,
            loadFromDrive,
            saveToDrive,
            signOut,
        ]
    );

    return (
        <GoogleDriveSyncContext.Provider value={value}>
            {children}
        </GoogleDriveSyncContext.Provider>
    );
};

export const useGoogleDriveSync = (): GoogleDriveSyncState => {
    const context = useContext(GoogleDriveSyncContext);
    if (!context) {
        throw new Error(
            "useGoogleDriveSync must be used within GoogleDriveSyncProvider"
        );
    }
    return context;
};
