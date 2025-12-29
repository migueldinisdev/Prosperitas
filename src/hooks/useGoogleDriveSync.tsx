import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { DriveFileMetadata } from "../api/googleDrive/googleDriveClient";
import {
    GoogleOAuthTokenClient,
    createGoogleTokenClient,
    revokeGoogleToken,
} from "../api/googleDrive/googleOAuth";
import {
    exportStateToGoogleDrive,
    importStateFromGoogleDrive,
} from "../store/persistence";
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

type GoogleDriveSyncState = {
    status: SyncStatus;
    isAuthenticated: boolean;
    error: string | null;
    accessToken: string | null;
    fileMeta: DriveFileMetadata | null;
    isDirty: boolean;
    trySilentSignIn: () => Promise<string | null>;
    signInInteractive: () => Promise<string | null>;
    loadFromDrive: (tokenOverride?: string) => Promise<boolean>;
    saveToDrive: (json: string, tokenOverride?: string) => Promise<boolean>;
    signOut: () => void;
};

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

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
    const tokenClientRef = useRef<GoogleOAuthTokenClient | null>(null);

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

    const ensureTokenClient = useCallback(
        async (): Promise<GoogleOAuthTokenClient> => {
        if (!tokenClientRef.current) {
            tokenClientRef.current = await createGoogleTokenClient(DRIVE_SCOPE);
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
            // no-op
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
        revokeGoogleToken(accessToken);
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
