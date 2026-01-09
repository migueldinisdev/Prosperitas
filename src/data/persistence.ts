import {
    ProsperitasState,
    PersistedState,
    PERSISTED_KEYS,
} from "../core/schema-types";
import { CURRENT_SCHEMA_VERSION } from "../store/initialState";

const REQUIRED_KEYS = PERSISTED_KEYS.filter(
    (key) => key !== "forexLivePrices"
);

const validateStateShape = (data: unknown): data is PersistedState => {
    if (!data || typeof data !== "object") return false;
    return REQUIRED_KEYS.every((key) => key in (data as Record<string, unknown>));
};

const migrateState = (state: PersistedState): PersistedState => {
    // Future migrations will be added here when schemaVersion changes.
    const migrated = {
        forexLivePrices: state.forexLivePrices ?? {},
        ...state,
    };

    if (migrated.schemaVersion === CURRENT_SCHEMA_VERSION) {
        return migrated;
    }

    return {
        ...migrated,
        schemaVersion: CURRENT_SCHEMA_VERSION,
    };
};

export const serializeState = (state: ProsperitasState): string => {
    // Only serialize persisted keys (exclude notifications)
    const persistedState: PersistedState = {
        schemaVersion: state.schemaVersion,
        meta: {
            ...state.meta,
            updatedAt: new Date().toISOString(),
        },
        settings: state.settings,
        account: state.account,
        categories: state.categories,
        balance: state.balance,
        assets: state.assets,
        wallets: state.wallets,
        walletPositions: state.walletPositions,
        walletTx: state.walletTx,
        pies: state.pies,
        forexLivePrices: state.forexLivePrices,
    };

    return JSON.stringify(persistedState, null, 2);
};

export const hydrateState = (raw: string): PersistedState => {
    const parsed = JSON.parse(raw);

    if (!validateStateShape(parsed)) {
        throw new Error("Imported state is missing required keys.");
    }

    return migrateState(parsed as PersistedState);
};

export const exportContentToFile = (
    content: string,
    filename = "prosperitas.json"
) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const exportStateToFile = (
    state: ProsperitasState,
    filename?: string
) => {
    const serialized = serializeState(state);
    exportContentToFile(serialized, filename);
};

export const loadStateFromFile = async (
    file: File
): Promise<PersistedState> => {
    const raw = await file.text();
    return hydrateState(raw);
};
