import { ProsperitasState } from "../core/schema-types";
import { CURRENT_SCHEMA_VERSION } from "../store/initialState";

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
    "notifications",
];

const validateStateShape = (data: unknown): data is ProsperitasState => {
    if (!data || typeof data !== "object") return false;
    return requiredKeys.every((key) => key in (data as Record<string, unknown>));
};

const migrateState = (state: ProsperitasState): ProsperitasState => {
    const baseState: ProsperitasState = {
        ...state,
        notifications: Array.isArray(state.notifications)
            ? state.notifications
            : [],
    };
    // Future migrations will be added here when schemaVersion changes.
    if (baseState.schemaVersion === CURRENT_SCHEMA_VERSION) {
        return baseState;
    }

    return {
        ...baseState,
        schemaVersion: CURRENT_SCHEMA_VERSION,
    };
};

export const serializeState = (state: ProsperitasState): string => {
    const payload = {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: new Date().toISOString(),
        },
    };

    return JSON.stringify(payload, null, 2);
};

export const hydrateState = (raw: string): ProsperitasState => {
    const parsed = JSON.parse(raw);

    if (!validateStateShape(parsed)) {
        throw new Error("Imported state is missing required keys.");
    }

    return migrateState(parsed as ProsperitasState);
};

export const exportStateToFile = (state: ProsperitasState) => {
    const serialized = serializeState(state);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prosperitas.json";
    link.click();
    URL.revokeObjectURL(url);
};

export const loadStateFromFile = async (
    file: File
): Promise<ProsperitasState> => {
    const raw = await file.text();
    return hydrateState(raw);
};
