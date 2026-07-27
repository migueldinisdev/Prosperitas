import {
    Asset,
    AssetsState,
    ProsperitasState,
    PersistedState,
    PERSISTED_KEYS,
} from "../core/schema-types";
import { CURRENT_SCHEMA_VERSION } from "../store/initialState";

const REQUIRED_KEYS = PERSISTED_KEYS.filter((key) => key !== "livePrices");
const DEFAULT_SP500_ACC_SYMBOL = "VUAA.DE";
const DEFAULT_SP500_ACC_CURRENCY = "EUR";
const DEFAULT_PRICE_REQUESTS_PER_SECOND = 60;

type LegacyAsset = Asset & {
    stooqTicker?: string | null;
};

const migrateAssets = (assets: AssetsState): AssetsState =>
    Object.fromEntries(
        Object.entries(assets).map(([assetId, legacyAsset]) => {
            const { stooqTicker, ...asset } = legacyAsset as LegacyAsset;
            const migratedYahooTicker =
                asset.yfTicker?.trim()
                    ? asset.yfTicker
                    : stooqTicker?.trim()
                      ? stooqTicker
                      : null;

            return [
                assetId,
                {
                    ...asset,
                    yfTicker: migratedYahooTicker || null,
                },
            ];
        })
    );

const validateStateShape = (data: unknown): data is PersistedState => {
    if (!data || typeof data !== "object") return false;
    return REQUIRED_KEYS.every((key) => key in (data as Record<string, unknown>));
};

export const migrateState = (state: PersistedState): PersistedState => {
    const migrated = {
        ...state,
        assets: migrateAssets(state.assets),
        livePrices: state.livePrices ?? {},
        settings: {
            ...state.settings,
            sp500AccSymbol:
                state.settings.sp500AccSymbol ?? DEFAULT_SP500_ACC_SYMBOL,
            sp500AccCurrency:
                state.settings.sp500AccCurrency ?? DEFAULT_SP500_ACC_CURRENCY,
            priceRequestsPerSecond:
                state.settings.priceRequestsPerSecond ??
                DEFAULT_PRICE_REQUESTS_PER_SECOND,
        },
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
        assets: migrateAssets(state.assets),
        wallets: state.wallets,
        walletPositions: state.walletPositions,
        walletTx: state.walletTx,
        pies: state.pies,
        livePrices: state.livePrices,
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
