import {
    exportContentToFile,
    exportStateToFile,
    hydrateState,
    loadStateFromFile,
    serializeState,
} from "../data/persistence";
import { store } from "./index";
import { replaceState } from "./actions";
import {
    GOOGLE_DRIVE_APPDATA_SCOPE,
    GOOGLE_DRIVE_SAVE_FILENAME,
} from "../data/api/google/constants";
import {
    createAppDataFile,
    downloadFile,
    findAppDataFile,
    updateAppDataFile,
} from "../data/api/google/drive";
import {
    ensureValidAccessToken,
    ensureValidAccessTokenSilent,
    invalidateToken,
} from "../data/api/google/oauth";
import {
    GoogleDriveError,
    NoGoogleDriveSaveError,
} from "../data/api/google/errors";

const DRIVE_SCOPES = [GOOGLE_DRIVE_APPDATA_SCOPE];
let lastKnownDriveModifiedTime: string | null = null;

export interface DriveConflict {
    fileId: string;
    modifiedTime: string;
}

export class DriveConflictError extends Error {
    conflict: DriveConflict;

    constructor(conflict: DriveConflict) {
        super("Drive file has been updated since last sync.");
        this.name = "DriveConflictError";
        this.conflict = conflict;
    }
}

const backupFilename = (label: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `prosperitas-${label}-${timestamp}.json`;
};

const withGoogleDriveRetry = async <T>(
    action: (accessToken: string) => Promise<T>
): Promise<T> => {
    const accessToken = await ensureValidAccessToken(DRIVE_SCOPES);

    try {
        return await action(accessToken);
    } catch (error) {
        if (
            error instanceof GoogleDriveError &&
            (error.status === 401 || error.status === 403)
        ) {
            invalidateToken(DRIVE_SCOPES);
            const refreshedToken = await ensureValidAccessToken(DRIVE_SCOPES);
            return action(refreshedToken);
        }

        throw error;
    }
};

const withGoogleDriveSilent = async <T>(
    action: (accessToken: string) => Promise<T>
): Promise<T> => {
    const accessToken = await ensureValidAccessTokenSilent(DRIVE_SCOPES);

    try {
        return await action(accessToken);
    } catch (error) {
        if (
            error instanceof GoogleDriveError &&
            (error.status === 401 || error.status === 403)
        ) {
            invalidateToken(DRIVE_SCOPES);
            const refreshedToken = await ensureValidAccessTokenSilent(
                DRIVE_SCOPES
            );
            return action(refreshedToken);
        }

        throw error;
    }
};

export const importFromFile = async (file: File): Promise<void> => {
    const state = await loadStateFromFile(file);
    store.dispatch(replaceState(state));
};

export const exportToFile = async (): Promise<void> => {
    const state = store.getState();
    exportStateToFile(state);
};

export const importFromGoogleDrive = async (): Promise<void> => {
    await withGoogleDriveRetry(async (accessToken) => {
        const file = await findAppDataFile(
            accessToken,
            GOOGLE_DRIVE_SAVE_FILENAME
        );

        if (!file) {
            throw new NoGoogleDriveSaveError();
        }

        const content = await downloadFile(accessToken, file.id);
        const state = hydrateState(content);
        store.dispatch(replaceState(state));
        lastKnownDriveModifiedTime = file.modifiedTime;
    });
};

export const exportToGoogleDrive = async (): Promise<void> => {
    await withGoogleDriveRetry(async (accessToken) => {
        const content = serializeState(store.getState());
        const file = await findAppDataFile(
            accessToken,
            GOOGLE_DRIVE_SAVE_FILENAME
        );

        if (!file) {
            const created = await createAppDataFile(
                accessToken,
                GOOGLE_DRIVE_SAVE_FILENAME,
                content
            );
            lastKnownDriveModifiedTime =
                created.modifiedTime ?? new Date().toISOString();
            return;
        }

        if (!lastKnownDriveModifiedTime) {
            throw new DriveConflictError({
                fileId: file.id,
                modifiedTime: file.modifiedTime,
            });
        }

        if (file.modifiedTime !== lastKnownDriveModifiedTime) {
            throw new DriveConflictError({
                fileId: file.id,
                modifiedTime: file.modifiedTime,
            });
        }

        const updated = await updateAppDataFile(accessToken, file.id, content);
        lastKnownDriveModifiedTime =
            updated.modifiedTime ?? file.modifiedTime;
    });
};

export const importFromGoogleDriveSilent = async (): Promise<void> => {
    await withGoogleDriveSilent(async (accessToken) => {
        const file = await findAppDataFile(
            accessToken,
            GOOGLE_DRIVE_SAVE_FILENAME
        );

        if (!file) {
            throw new NoGoogleDriveSaveError();
        }

        const content = await downloadFile(accessToken, file.id);
        const state = hydrateState(content);
        store.dispatch(replaceState(state));
        lastKnownDriveModifiedTime = file.modifiedTime;
    });
};

export const resolveDriveConflictKeepCloud = async (
    conflict: DriveConflict
): Promise<void> => {
    exportStateToFile(store.getState(), backupFilename("local-backup"));
    await withGoogleDriveRetry(async (accessToken) => {
        const content = await downloadFile(accessToken, conflict.fileId);
        const state = hydrateState(content);
        store.dispatch(replaceState(state));
        lastKnownDriveModifiedTime = conflict.modifiedTime;
    });
};

export const resolveDriveConflictKeepLocal = async (
    conflict: DriveConflict
): Promise<void> => {
    await withGoogleDriveRetry(async (accessToken) => {
        const remoteContent = await downloadFile(
            accessToken,
            conflict.fileId
        );
        exportContentToFile(
            remoteContent,
            backupFilename("drive-backup")
        );

        const content = serializeState(store.getState());
        const updated = await updateAppDataFile(
            accessToken,
            conflict.fileId,
            content
        );
        lastKnownDriveModifiedTime =
            updated.modifiedTime ?? conflict.modifiedTime;
    });
};
