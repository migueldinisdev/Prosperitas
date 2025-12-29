import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { GOOGLE_CLIENT_ID } from "../data/googleDrive/googleDriveClient";
import {
    createFileInAppData,
    downloadFile,
    findFileInAppData,
    updateFile,
    DriveFileMetadata,
} from "../data/googleDrive/googleDriveClient";
import { exportSaveJson } from "../store/saveSerialization";
import { hydrateStoreFromJson } from "../store/hydrateFromSave";
import { defaultState } from "../store/initialState";
import { store } from "../store";
import { hashString } from "../utils/hash";

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
    hasAttemptedSilentSignIn: boolean;
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
                    revoke?: (accessToken: string, done: () => void) => void;
                };
            };
        };
    }
}

let gisScriptPromise: Promise<void> | null = null;

const loadGisScript = (): Promise<void> => {
    if (typeof window === "undefined") {
        return Promise.reject(
            new Error("Google Identity Services requires a browser")
        );
    }

    if (window.google?.accounts?.oauth2) {
        console.debug("[GoogleDrive] GIS script already available");
        return Promise.resolve();
    }

    if (!gisScriptPromise) {
        gisScriptPromise = new Promise((resolve, reject) => {
            console.debug(
                "[GoogleDrive] Loading Google Identity Services script..."
            );
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.debug("[GoogleDrive] GIS script loaded");
                resolve();
            };
            script.onerror = () => {
                console.error(
                    "[GoogleDrive] Failed to load Google Identity Services script"
                );
                reject(new Error("Failed to load Google Identity Services"));
            };
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
    const [hasAttemptedSilentSignIn, setHasAttemptedSilentSignIn] =
        useState(false);
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
            console.debug("[GoogleDrive] Initializing token client");
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: DRIVE_SCOPE,
                callback: () => undefined,
            });
            tokenClientRef.current = client as TokenClient;
            console.debug("[GoogleDrive] Token client initialized");
        }

        return tokenClientRef.current;
    }, []);

    const requestAccessToken = useCallback(
        async (prompt: "" | "consent"): Promise<string> => {
            const client = await ensureTokenClient();
            return new Promise((resolve, reject) => {
                client.callback = (response) => {
                    console.debug(
                        "[GoogleDrive] token client callback",
                        response
                    );
                    if (response?.access_token) {
                        console.debug("[GoogleDrive] received access token");
                        resolve(response.access_token);
                        return;
                    }
                    const errMsg =
                        response?.error ||
                        "Google authentication did not return a token";
                    console.error("[GoogleDrive] token error", errMsg);
                    reject(new Error(errMsg));
                };
                console.debug(
                    "[GoogleDrive] requesting access token (prompt=",
                    prompt,
                    ")"
                );
                client.requestAccessToken({ prompt });
            });
        },
        [ensureTokenClient]
    );

    const trySilentSignIn = useCallback(async (): Promise<boolean> => {
        setStatus("authenticating");
        setError(null);
        console.debug("[GoogleDrive] Attempting silent sign-in");
        try {
            const token = await requestAccessToken("");
            console.debug("[GoogleDrive] silent sign-in succeeded");
            setAccessToken(token);
            setStatus("authenticated");
            return true;
        } catch (authError) {
            const message = authError instanceof Error ? authError.message : "";
            if (message.includes("Missing Google OAuth client ID")) {
                setStatus("error");
                setError(message);
            } else {
                setStatus("idle");
                setError(null);
            }
            console.debug("[GoogleDrive] silent sign-in failed", message);
            return false;
        } finally {
            setHasAttemptedSilentSignIn(true);
        }
    }, [requestAccessToken]);

    const signInInteractive = useCallback(async (): Promise<boolean> => {
        setStatus("authenticating");
        setError(null);
        console.debug("[GoogleDrive] Starting interactive sign-in");
        try {
            const token = await requestAccessToken("consent");
            console.debug("[GoogleDrive] interactive sign-in succeeded");
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
            console.error("[GoogleDrive] interactive sign-in failed", message);
            return false;
        }
    }, [requestAccessToken]);

    const handleDriveError = useCallback(
        (driveError: unknown, fallbackStatus: SyncStatus) => {
            console.error("[GoogleDrive] Drive error", driveError);
            const statusCode =
                typeof driveError === "object" &&
                driveError &&
                "status" in driveError
                    ? (driveError as { status?: number }).status
                    : undefined;

            if (statusCode === 401) {
                console.debug(
                    "[GoogleDrive] 401 Unauthorized - clearing session"
                );
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
            console.debug(
                "[GoogleDrive] loadFromDrive called but not authenticated"
            );
            return false;
        }

        setStatus("loading");
        setError(null);
        console.debug("[GoogleDrive] loadFromDrive starting");

        try {
            const existing = await findFileInAppData(
                accessToken,
                SAVE_FILE_NAME
            );
            console.debug("[GoogleDrive] findFileInAppData returned", existing);
            if (existing?.id) {
                const json = await downloadFile(accessToken, existing.id);
                console.debug(
                    "[GoogleDrive] downloaded file, size=",
                    json.length
                );
                hydrateStoreFromJson(json);
                setFileMeta(existing);
                setLastSavedSnapshotHash(hashString(json));
            } else {
                const defaultJson = JSON.stringify(defaultState);
                console.debug(
                    "[GoogleDrive] no existing file; creating default save in appData"
                );
                const metadata = await createFileInAppData(
                    accessToken,
                    SAVE_FILE_NAME,
                    SAVE_MIME_TYPE,
                    defaultJson
                );
                console.debug("[GoogleDrive] created default save", metadata);
                hydrateStoreFromJson(defaultJson);
                setFileMeta(metadata);
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
                console.debug(
                    "[GoogleDrive] saveToDrive called but not authenticated"
                );
                return false;
            }

            setStatus("saving");
            setError(null);
            console.debug(
                "[GoogleDrive] saveToDrive starting, bytes=",
                json.length
            );

            try {
                let targetMeta = fileMeta;
                if (!targetMeta) {
                    console.debug(
                        "[GoogleDrive] No cached fileMeta; searching for file in appData"
                    );
                    targetMeta = await findFileInAppData(
                        accessToken,
                        SAVE_FILE_NAME
                    );
                    console.debug(
                        "[GoogleDrive] findFileInAppData returned",
                        targetMeta
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

                console.debug("[GoogleDrive] save completed", metadata);
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
        console.debug("[GoogleDrive] signOut called");
        if (accessToken && window.google?.accounts?.oauth2?.revoke) {
            console.debug(
                "[GoogleDrive] revoking token via google.accounts.oauth2.revoke"
            );
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
            hasAttemptedSilentSignIn,
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
            hasAttemptedSilentSignIn,
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
