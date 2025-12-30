import {
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
            await createAppDataFile(
                accessToken,
                GOOGLE_DRIVE_SAVE_FILENAME,
                content
            );
            return;
        }

        await updateAppDataFile(accessToken, file.id, content);
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
    });
};
