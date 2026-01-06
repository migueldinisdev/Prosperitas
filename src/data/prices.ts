import { cryptoProvider } from "./api/crypto";
import { forexProvider } from "./api/forex";
import { stockProvider } from "./api/stock";

export type AssetType = "stock" | "crypto" | "forex";

export interface PriceRequest {
    ticker: string;
    type: AssetType;
    date?: string | Date;
    allowClosest?: boolean;
}

export interface PriceCandle {
    close: number;
    date: string;
    symbol: string;
    source: string;
}

export interface PriceProviderResponse {
    close: number;
    date: string;
    symbol?: string;
    source?: string;
}

export interface PriceProvider {
    source: string;
    fetchCandle: (request: {
        ticker: string;
        date?: string;
    }) => Promise<PriceProviderResponse | null>;
}

export interface PriceProviders {
    stock: PriceProvider;
    crypto: PriceProvider;
    forex: PriceProvider;
}

interface CachedCandle extends PriceCandle {
    id: string;
    symbolKey: string;
    type: AssetType;
    dateKey: string;
    dateMs: number;
    isLive: boolean;
    updatedAt: string;
}

export const defaultProviders: PriceProviders = {
    stock: stockProvider,
    crypto: cryptoProvider,
    forex: forexProvider,
};

const DB_NAME = "prosperitas-price-cache";
const DB_VERSION = 1;
const STORE_NAME = "candles";
const MIN_DATE_MS = -8640000000000000;
const MAX_DATE_MS = 8640000000000000;

const isIndexedDbAvailable =
    typeof indexedDB !== "undefined" && typeof window !== "undefined";

const memoryCache = new Map<string, CachedCandle>();

const normalizeSymbol = (ticker: string) => ticker.trim().toUpperCase();

const normalizeDate = (date: string | Date) => {
    const parsed = typeof date === "string" ? new Date(date) : date;
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const buildCacheId = (symbolKey: string, dateKey: string) =>
    `${symbolKey}:${dateKey}`;

const openPriceDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                });
                store.createIndex("symbolKey", "symbolKey", {
                    unique: false,
                });
                store.createIndex("symbolDate", ["symbolKey", "dateMs"], {
                    unique: false,
                });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const runDbOperation = <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
) =>
    openPriceDb().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, mode);
                const store = tx.objectStore(STORE_NAME);
                const request = operation(store);
                request.onsuccess = () => resolve(request.result as T);
                request.onerror = () => reject(request.error);
            })
    );

const getCachedById = async (id: string) => {
    if (!isIndexedDbAvailable) {
        return memoryCache.get(id) ?? null;
    }

    return runDbOperation<CachedCandle | null>("readonly", (store) =>
        store.get(id)
    );
};

const putCached = async (record: CachedCandle) => {
    if (!isIndexedDbAvailable) {
        memoryCache.set(record.id, record);
        return;
    }

    await runDbOperation("readwrite", (store) => store.put(record));
};

const getLatestCachedCandle = async (symbolKey: string) => {
    if (!isIndexedDbAvailable) {
        const values = Array.from(memoryCache.values()).filter(
            (record) => record.symbolKey === symbolKey
        );
        values.sort((a, b) => b.dateMs - a.dateMs);
        return values[0] ?? null;
    }

    const db = await openPriceDb();
    return new Promise<CachedCandle | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("symbolDate");
        const range = IDBKeyRange.bound(
            [symbolKey, MIN_DATE_MS],
            [symbolKey, MAX_DATE_MS]
        );
        const request = index.openCursor(range, "prev");
        request.onsuccess = () => {
            const cursor = request.result as IDBCursorWithValue | null;
            resolve(cursor ? (cursor.value as CachedCandle) : null);
        };
        request.onerror = () => reject(request.error);
    });
};

const getClosestCachedCandle = async (symbolKey: string, targetMs: number) => {
    if (!isIndexedDbAvailable) {
        const values = Array.from(memoryCache.values()).filter(
            (record) => record.symbolKey === symbolKey
        );
        if (!values.length) return null;
        return values.reduce((closest, record) => {
            const delta = Math.abs(record.dateMs - targetMs);
            const closestDelta = Math.abs(closest.dateMs - targetMs);
            return delta < closestDelta ? record : closest;
        });
    }

    const db = await openPriceDb();
    const previous = await new Promise<CachedCandle | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("symbolDate");
        const range = IDBKeyRange.bound(
            [symbolKey, MIN_DATE_MS],
            [symbolKey, targetMs]
        );
        const request = index.openCursor(range, "prev");
        request.onsuccess = () => {
            const cursor = request.result as IDBCursorWithValue | null;
            resolve(cursor ? (cursor.value as CachedCandle) : null);
        };
        request.onerror = () => reject(request.error);
    });

    const next = await new Promise<CachedCandle | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("symbolDate");
        const range = IDBKeyRange.bound(
            [symbolKey, targetMs],
            [symbolKey, MAX_DATE_MS]
        );
        const request = index.openCursor(range, "next");
        request.onsuccess = () => {
            const cursor = request.result as IDBCursorWithValue | null;
            resolve(cursor ? (cursor.value as CachedCandle) : null);
        };
        request.onerror = () => reject(request.error);
    });

    if (previous && next) {
        const prevDelta = Math.abs(previous.dateMs - targetMs);
        const nextDelta = Math.abs(next.dateMs - targetMs);
        return prevDelta <= nextDelta ? previous : next;
    }

    return previous ?? next ?? null;
};

const toPriceCandle = (record: CachedCandle): PriceCandle => ({
    close: record.close,
    date: record.date,
    symbol: record.symbol,
    source: record.source,
});

const createCachedRecord = (params: {
    candle: PriceProviderResponse;
    type: AssetType;
    symbol: string;
    symbolKey: string;
    source: string;
    isLive: boolean;
}): CachedCandle => {
    const normalizedDate = normalizeDate(params.candle.date) ?? new Date();
    const dateKey = toDateKey(normalizedDate);
    return {
        id: buildCacheId(params.symbolKey, params.isLive ? "live" : dateKey),
        symbolKey: params.symbolKey,
        symbol: params.symbol,
        type: params.type,
        close: params.candle.close,
        date: normalizedDate.toISOString(),
        dateKey,
        dateMs: normalizedDate.getTime(),
        source: params.source,
        isLive: params.isLive,
        updatedAt: new Date().toISOString(),
    };
};

const cacheCandle = async (
    candle: PriceProviderResponse,
    params: {
        type: AssetType;
        symbol: string;
        symbolKey: string;
        source: string;
        storeLive: boolean;
    }
) => {
    const record = createCachedRecord({
        candle,
        type: params.type,
        symbol: params.symbol,
        symbolKey: params.symbolKey,
        source: params.source,
        isLive: false,
    });
    await putCached(record);

    if (params.storeLive) {
        const liveRecord = createCachedRecord({
            candle,
            type: params.type,
            symbol: params.symbol,
            symbolKey: params.symbolKey,
            source: params.source,
            isLive: true,
        });
        await putCached(liveRecord);
    }
};

export const createPriceService = (providers: PriceProviders = defaultProviders) => {
    return {
        getPrice: (request: PriceRequest) => getPrice(request, providers),
    };
};

export const getPrice = async (
    request: PriceRequest,
    providers: PriceProviders = defaultProviders
): Promise<PriceCandle | null> => {
    const symbol = normalizeSymbol(request.ticker);
    const symbolKey = `${request.type}:${symbol}`;
    const requestedDate = request.date ? normalizeDate(request.date) : null;
    const requestedDateKey = requestedDate ? toDateKey(requestedDate) : null;

    if (requestedDateKey) {
        const cached = await getCachedById(
            buildCacheId(symbolKey, requestedDateKey)
        );
        if (cached) return toPriceCandle(cached);
    } else {
        const cachedLive = await getCachedById(buildCacheId(symbolKey, "live"));
        if (cachedLive) return toPriceCandle(cachedLive);
    }

    const provider = providers[request.type];
    let response: PriceProviderResponse | null = null;

    try {
        response = await provider.fetchCandle({
            ticker: symbol,
            date: requestedDate?.toISOString(),
        });
    } catch (error) {
        response = null;
    }

    if (response) {
        const source = response.source ?? provider.source;
        const responseSymbol = response.symbol ?? symbol;
        await cacheCandle(response, {
            type: request.type,
            symbol: responseSymbol,
            symbolKey,
            source,
            storeLive: !requestedDateKey,
        });

        const responseDate = normalizeDate(response.date) ?? new Date();
        const responseDateKey = toDateKey(responseDate);

        if (requestedDateKey && responseDateKey !== requestedDateKey) {
            if (request.allowClosest && requestedDate) {
                const closest = await getClosestCachedCandle(
                    symbolKey,
                    requestedDate.getTime()
                );
                return closest ? toPriceCandle(closest) : null;
            }
            return null;
        }

        return {
            close: response.close,
            date: responseDate.toISOString(),
            symbol: responseSymbol,
            source,
        };
    }

    if (requestedDateKey) {
        if (request.allowClosest && requestedDate) {
            const closest = await getClosestCachedCandle(
                symbolKey,
                requestedDate.getTime()
            );
            return closest ? toPriceCandle(closest) : null;
        }
        return null;
    }

    const latest = await getLatestCachedCandle(symbolKey);
    return latest ? toPriceCandle(latest) : null;
};
