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
];

const validateStateShape = (data: unknown): data is ProsperitasState => {
    if (!data || typeof data !== "object") return false;
    return requiredKeys.every((key) => key in (data as Record<string, unknown>));
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

export const saveStateToFile = (state: ProsperitasState) => {
    const serialized = JSON.stringify(state, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prosperitas-${state.schemaVersion}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

export const loadStateFromFile = async (
    file: File
): Promise<ProsperitasState> => {
    const raw = await file.text();
    const parsed = JSON.parse(raw);

    if (!validateStateShape(parsed)) {
        throw new Error("Imported state is missing required keys.");
    }

    return migrateState(parsed as ProsperitasState);
};
