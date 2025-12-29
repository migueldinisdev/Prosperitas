import { ProsperitasState } from "../core/schema-types";
import { CURRENT_SCHEMA_VERSION, defaultState } from "../store/initialState";
import { replaceState, store } from "../store";
import {
    createFileInAppData,
    downloadFile,
    findFileInAppData,
    updateFile,
    DriveFileMetadata,
} from "./googleDrive/googleDriveClient";
import { exportSaveJson } from "../store/saveSerialization";

const requiredKeys: (keyof ProsperitasState)[] = [
    "schemaVersion",
    "meta",
    "settings",
    "account",
    "categories",
    "balance",
    "assets",
    "wallets",
    "walletPositions",
    "walletTx",
    "pies",
];

const validateStateShape = (data: unknown): data is ProsperitasState => {
    if (!data || typeof data !== "object") return false;
    return requiredKeys.every((key) => key in (data as Record<string, unknown>));
};

const parseStateJson = (raw: string): ProsperitasState => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        console.error("Failed to parse imported state JSON", error);
        throw error;
    }

    if (!validateStateShape(parsed)) {
        const error = new Error("Imported state is missing required keys.");
        console.error(error);
        throw error;
    }

    return migrateState(parsed as ProsperitasState);
};

const migrateState = (state: ProsperitasState): ProsperitasState => {
    // Future migrations will be added here when schemaVersion changes.
    if (state.schemaVersion === CURRENT_SCHEMA_VERSION) {
        return state;
    }

    return {
        ...state,
        schemaVersion: CURRENT_SCHEMA_VERSION,
    };
};

const getBaseState = (): ProsperitasState => {
    const state = store.getState() as ProsperitasState | undefined;
    return state ?? defaultState;
};

export const exportStateToFile = (state: ProsperitasState) => {
    const payload = {
        version: Date.now(),
        ...state,
    };
    const serialized = JSON.stringify(payload, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prosperitas.json";
    link.click();
    URL.revokeObjectURL(url);
};

export const loadStateFromFile = async (file: File): Promise<ProsperitasState> => {
    const raw = await file.text();
    return parseStateJson(raw);
};

export const importStateFromFile = async (file: File): Promise<ProsperitasState> => {
    const nextState = await loadStateFromFile(file);
    store.dispatch(replaceState(nextState));
    return nextState;
};

const DRIVE_FILE_NAME = "prosperitas-save.json";
const DRIVE_MIME_TYPE = "application/json";

export const importStateFromGoogleDrive = async (
    accessToken: string
): Promise<{ json: string; fileMeta: DriveFileMetadata | null }> => {
    const existing = await findFileInAppData(accessToken, DRIVE_FILE_NAME);
    if (existing?.id) {
        const json = await downloadFile(accessToken, existing.id);
        const nextState = parseStateJson(json);
        store.dispatch(replaceState(nextState));
        return { json, fileMeta: existing };
    }

    const baseState = getBaseState();
    const json = exportSaveJson(store.getState());
    const fileMeta = await createFileInAppData(
        accessToken,
        DRIVE_FILE_NAME,
        DRIVE_MIME_TYPE,
        json
    );
    store.dispatch(replaceState(baseState));
    return { json, fileMeta };
};

export const exportStateToGoogleDrive = async (
    accessToken: string,
    jsonOverride?: string
): Promise<{ json: string; fileMeta: DriveFileMetadata }> => {
    const json = jsonOverride ?? exportSaveJson(store.getState());
    const existing = await findFileInAppData(accessToken, DRIVE_FILE_NAME);
    const fileMeta = existing?.id
        ? await updateFile(accessToken, existing.id, DRIVE_MIME_TYPE, json)
        : await createFileInAppData(
              accessToken,
              DRIVE_FILE_NAME,
              DRIVE_MIME_TYPE,
              json
          );
    return { json, fileMeta };
};
