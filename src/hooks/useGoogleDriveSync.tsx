import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { GOOGLE_CLIENT_ID } from "../config/google";
import { DriveFileMetadata } from "../data/googleDrive/googleDriveClient";
import {
    exportStateToGoogleDrive,
    importStateFromGoogleDrive,
} from "../data/persistence";
import { exportSaveJson } from "../store/saveSerialization";
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
    trySilentSignIn: () => Promise<string | null>;
    signInInteractive: () => Promise<string | null>;
    loadFromDrive: (tokenOverride?: string) => Promise<boolean>;
    saveToDrive: (json: string, tokenOverride?: string) => Promise<boolean>;
    signOut: () => void;
};

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

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

    const trySilentSignIn = useCallback(async (): Promise<string | null> => {
        setStatus("authenticating");
        setError(null);
        try {
            const token = await requestAccessToken("");
            setAccessToken(token);
            setStatus("authenticated");
            return token;
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
            return null;
        } finally {
            setHasAttemptedSilentSignIn(true);
        }
    }, [requestAccessToken]);

    const signInInteractive = useCallback(async (): Promise<string | null> => {
        setStatus("authenticating");
        setError(null);
        try {
            const token = await requestAccessToken("consent");
            setAccessToken(token);
            setStatus("authenticated");
            return token;
        } catch (authError) {
            const message =
                authError instanceof Error
                    ? authError.message
                    : "Google authentication failed";
            setStatus("error");
            setError(message);
            return null;
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

    const loadFromDrive = useCallback(async (tokenOverride?: string): Promise<boolean> => {
        const token = tokenOverride ?? accessToken;
        if (!token) {
            setStatus("idle");
            setError("Not authenticated");
            return false;
        }

        setStatus("loading");
        setError(null);

        try {
            const { json, fileMeta: meta } = await importStateFromGoogleDrive(
                token
            );
            setFileMeta(meta);
            setLastSavedSnapshotHash(hashString(json));
            setStatus("ready");
            return true;
        } catch (driveError) {
            handleDriveError(driveError, "error");
            return false;
        }
    }, [accessToken, handleDriveError]);

    const saveToDrive = useCallback(
        async (json: string, tokenOverride?: string): Promise<boolean> => {
            const token = tokenOverride ?? accessToken;
            if (!token) {
                setStatus("idle");
                setError("Not authenticated");
                return false;
            }

            setStatus("saving");
            setError(null);

            try {
                const { fileMeta: meta } = await exportStateToGoogleDrive(
                    token,
                    json
                );
                setFileMeta(meta);
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
