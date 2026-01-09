export type PriceAssetType = "stock" | "crypto" | "forex";

export interface PriceCacheEntry {
    id: string;
    ticker: string;
    type: PriceAssetType;
    date: string;
    dateMs: number;
    close: number;
    source: string;
    tickerKey: string;
}

const DB_NAME = "prosperitas-prices";
const STORE_NAME = "prices";
const FALLBACK_KEY = "prosperitas:price-cache";
const LATEST_PRICE_KEY = "prosperitas:latest-price-cache";

const isIndexedDbAvailable =
    typeof indexedDB !== "undefined" && typeof window !== "undefined";

const toDateMs = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();

const loadFallbackCache = () => {
    if (typeof window === "undefined") {
        return {} as Record<string, PriceCacheEntry>;
    }
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    if (!raw) return {} as Record<string, PriceCacheEntry>;
    try {
        return JSON.parse(raw) as Record<string, PriceCacheEntry>;
    } catch {
        return {} as Record<string, PriceCacheEntry>;
    }
};

const saveFallbackCache = (cache: Record<string, PriceCacheEntry>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(cache));
};

const loadLatestPriceCache = () => {
    if (typeof window === "undefined") {
        return {} as Record<string, PriceCacheEntry>;
    }
    const raw = window.localStorage.getItem(LATEST_PRICE_KEY);
    if (!raw) return {} as Record<string, PriceCacheEntry>;
    try {
        return JSON.parse(raw) as Record<string, PriceCacheEntry>;
    } catch {
        return {} as Record<string, PriceCacheEntry>;
    }
};

const saveLatestPriceCache = (cache: Record<string, PriceCacheEntry>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LATEST_PRICE_KEY, JSON.stringify(cache));
};

const openPricesDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                });
                store.createIndex("tickerKey", "tickerKey", { unique: false });
                store.createIndex("tickerDate", ["tickerKey", "dateMs"], {
                    unique: false,
                });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const runIndexedDbOperation = async <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
) => {
    const db = await openPricesDb();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = operation(store);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
    });
};

const makeTickerKey = (type: PriceAssetType, ticker: string) =>
    `${type}:${ticker}`;

const makePriceId = (type: PriceAssetType, ticker: string, date: string) =>
    `${type}:${ticker}:${date}`;

export const buildPriceCacheEntry = (
    type: PriceAssetType,
    ticker: string,
    date: string,
    close: number,
    source: string
): PriceCacheEntry => ({
    id: makePriceId(type, ticker, date),
    ticker,
    type,
    date,
    dateMs: toDateMs(date),
    close,
    source,
    tickerKey: makeTickerKey(type, ticker),
});

export const getCachedPrice = async (params: {
    type: PriceAssetType;
    ticker: string;
    date: string;
}) => {
    const { type, ticker, date } = params;
    const id = makePriceId(type, ticker, date);

    if (!isIndexedDbAvailable) {
        const fallback = loadFallbackCache();
        return fallback[id] ?? null;
    }

    return runIndexedDbOperation<PriceCacheEntry | undefined>(
        "readonly",
        (store) => store.get(id)
    ).then((result) => result ?? null);
};

export const setCachedPrices = async (entries: PriceCacheEntry[]) => {
    if (!entries.length) return;

    if (!isIndexedDbAvailable) {
        const fallback = loadFallbackCache();
        entries.forEach((entry) => {
            fallback[entry.id] = entry;
        });
        saveFallbackCache(fallback);
        return;
    }

    const db = await openPricesDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        entries.forEach((entry) => {
            store.put(entry);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const setLatestPriceEntry = (entry: PriceCacheEntry) => {
    if (typeof window === "undefined") return;
    const cache = loadLatestPriceCache();
    cache[entry.tickerKey] = entry;
    saveLatestPriceCache(cache);
};

export const getLatestPriceEntry = (params: {
    type: PriceAssetType;
    ticker: string;
}) => {
    if (typeof window === "undefined") return null;
    const { type, ticker } = params;
    const cache = loadLatestPriceCache();
    return cache[makeTickerKey(type, ticker)] ?? null;
};

export const getClosestCachedPrice = async (params: {
    type: PriceAssetType;
    ticker: string;
    date: string;
}) => {
    const { type, ticker, date } = params;
    const targetMs = toDateMs(date);
    const tickerKey = makeTickerKey(type, ticker);

    const entries = await getEntriesForTicker(tickerKey);
    if (!entries.length) return null;

    return entries.reduce<PriceCacheEntry | null>((closest, entry) => {
        if (!closest) return entry;
        const diff = Math.abs(entry.dateMs - targetMs);
        const closestDiff = Math.abs(closest.dateMs - targetMs);
        return diff < closestDiff ? entry : closest;
    }, null);
};

export const getMostRecentCachedPrice = async (params: {
    type: PriceAssetType;
    ticker: string;
}) => {
    const { type, ticker } = params;
    const tickerKey = makeTickerKey(type, ticker);

    if (!isIndexedDbAvailable) {
        const entries = await getEntriesForTicker(tickerKey);
        return (
            entries.sort((a, b) => b.dateMs - a.dateMs)[0] ?? null
        );
    }

    const db = await openPricesDb();
    return new Promise<PriceCacheEntry | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("tickerDate");
        const range = IDBKeyRange.bound(
            [tickerKey, 0],
            [tickerKey, Number.MAX_SAFE_INTEGER]
        );
        const request = index.openCursor(range, "prev");
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                resolve(cursor.value as PriceCacheEntry);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const getPreviousCachedPrice = async (params: {
    type: PriceAssetType;
    ticker: string;
    date: string;
}) => {
    const { type, ticker, date } = params;
    const targetMs = toDateMs(date);
    const tickerKey = makeTickerKey(type, ticker);

    if (!isIndexedDbAvailable) {
        const entries = await getEntriesForTicker(tickerKey);
        return (
            entries
                .filter((entry) => entry.dateMs <= targetMs)
                .sort((a, b) => b.dateMs - a.dateMs)[0] ?? null
        );
    }

    const db = await openPricesDb();
    return new Promise<PriceCacheEntry | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("tickerDate");
        const range = IDBKeyRange.bound(
            [tickerKey, 0],
            [tickerKey, targetMs]
        );
        const request = index.openCursor(range, "prev");
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                resolve(cursor.value as PriceCacheEntry);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

const getEntriesForTicker = async (tickerKey: string) => {
    if (!isIndexedDbAvailable) {
        const fallback = loadFallbackCache();
        return Object.values(fallback).filter(
            (entry) => entry.tickerKey === tickerKey
        );
    }

    const db = await openPricesDb();
    return new Promise<PriceCacheEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("tickerKey");
        const request = index.openCursor(IDBKeyRange.only(tickerKey));
        const entries: PriceCacheEntry[] = [];
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                entries.push(cursor.value as PriceCacheEntry);
                cursor.continue();
            } else {
                resolve(entries);
            }
        };
        request.onerror = () => reject(request.error);
    });
};
