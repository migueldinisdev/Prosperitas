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

export interface HistoricalPriceCoverage {
    id: string;
    ticker: string;
    type: PriceAssetType;
    tickerKey: string;
    from: string;
    to: string;
    fromMs: number;
    toMs: number;
}

const DB_NAME = "prosperitas-prices";
const DB_VERSION = 2;
const PRICE_STORE_NAME = "prices";
const COVERAGE_STORE_NAME = "historicalCoverage";
const FALLBACK_KEY = "prosperitas:price-cache";
const COVERAGE_FALLBACK_KEY = "prosperitas:price-coverage";
const DAY_MS = 24 * 60 * 60 * 1000;

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

const loadFallbackCoverage = () => {
    if (typeof window === "undefined") {
        return {} as Record<string, HistoricalPriceCoverage>;
    }
    const raw = window.localStorage.getItem(COVERAGE_FALLBACK_KEY);
    if (!raw) return {} as Record<string, HistoricalPriceCoverage>;
    try {
        return JSON.parse(raw) as Record<string, HistoricalPriceCoverage>;
    } catch {
        return {} as Record<string, HistoricalPriceCoverage>;
    }
};

const saveFallbackCoverage = (
    coverage: Record<string, HistoricalPriceCoverage>
) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
        COVERAGE_FALLBACK_KEY,
        JSON.stringify(coverage)
    );
};

const openPricesDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(PRICE_STORE_NAME)) {
                const store = db.createObjectStore(PRICE_STORE_NAME, {
                    keyPath: "id",
                });
                store.createIndex("tickerKey", "tickerKey", { unique: false });
                store.createIndex("tickerDate", ["tickerKey", "dateMs"], {
                    unique: false,
                });
            }
            if (!db.objectStoreNames.contains(COVERAGE_STORE_NAME)) {
                const store = db.createObjectStore(COVERAGE_STORE_NAME, {
                    keyPath: "id",
                });
                store.createIndex("tickerKey", "tickerKey", {
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
        const tx = db.transaction(PRICE_STORE_NAME, mode);
        const store = tx.objectStore(PRICE_STORE_NAME);
        const request = operation(store);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
    });
};

const makeTickerKey = (type: PriceAssetType, ticker: string) =>
    `${type}:${ticker}`;

const makePriceId = (type: PriceAssetType, ticker: string, date: string) =>
    `${type}:${ticker}:${date}`;

const makeCoverageId = (
    type: PriceAssetType,
    ticker: string,
    from: string,
    to: string
) => `${type}:${ticker}:${from}:${to}`;

const buildCoverageEntry = (params: {
    type: PriceAssetType;
    ticker: string;
    from: string;
    to: string;
}): HistoricalPriceCoverage => ({
    id: makeCoverageId(
        params.type,
        params.ticker,
        params.from,
        params.to
    ),
    ticker: params.ticker,
    type: params.type,
    tickerKey: makeTickerKey(params.type, params.ticker),
    from: params.from,
    to: params.to,
    fromMs: toDateMs(params.from),
    toMs: toDateMs(params.to),
});

const coverageRangesTouch = (
    left: HistoricalPriceCoverage,
    right: HistoricalPriceCoverage
) =>
    left.fromMs <= right.toMs + DAY_MS &&
    left.toMs >= right.fromMs - DAY_MS;

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
        const tx = db.transaction(PRICE_STORE_NAME, "readwrite");
        const store = tx.objectStore(PRICE_STORE_NAME);
        entries.forEach((entry) => {
            store.put(entry);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const setHistoricalPriceCoverage = async (params: {
    type: PriceAssetType;
    ticker: string;
    from: string;
    to: string;
}) => {
    const ticker = params.ticker.trim().toUpperCase();
    let entry = buildCoverageEntry({ ...params, ticker });

    if (!isIndexedDbAvailable) {
        const coverage = loadFallbackCoverage();
        Object.values(coverage).forEach((existing) => {
            if (
                existing.tickerKey !== entry.tickerKey ||
                !coverageRangesTouch(existing, entry)
            ) {
                return;
            }
            delete coverage[existing.id];
            entry = buildCoverageEntry({
                type: entry.type,
                ticker: entry.ticker,
                from:
                    existing.from < entry.from
                        ? existing.from
                        : entry.from,
                to: existing.to > entry.to ? existing.to : entry.to,
            });
        });
        coverage[entry.id] = entry;
        saveFallbackCoverage(coverage);
        return;
    }

    const db = await openPricesDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(COVERAGE_STORE_NAME, "readwrite");
        const store = tx.objectStore(COVERAGE_STORE_NAME);
        const index = store.index("tickerKey");
        const request = index.openCursor(
            IDBKeyRange.only(entry.tickerKey)
        );
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const existing =
                    cursor.value as HistoricalPriceCoverage;
                if (coverageRangesTouch(existing, entry)) {
                    cursor.delete();
                    entry = buildCoverageEntry({
                        type: entry.type,
                        ticker: entry.ticker,
                        from:
                            existing.from < entry.from
                                ? existing.from
                                : entry.from,
                        to:
                            existing.to > entry.to
                                ? existing.to
                                : entry.to,
                    });
                }
                cursor.continue();
                return;
            }
            store.put(entry);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getHistoricalPriceCoverage = async (params: {
    type: PriceAssetType;
    ticker: string;
    date: string;
}) => {
    const tickerKey = makeTickerKey(
        params.type,
        params.ticker.trim().toUpperCase()
    );
    const targetMs = toDateMs(params.date);
    const selectCoverage = (entries: HistoricalPriceCoverage[]) =>
        entries
            .filter(
                (entry) =>
                    entry.fromMs <= targetMs && entry.toMs >= targetMs
            )
            .sort((a, b) => b.fromMs - a.fromMs)[0] ?? null;

    if (!isIndexedDbAvailable) {
        return selectCoverage(
            Object.values(loadFallbackCoverage()).filter(
                (entry) => entry.tickerKey === tickerKey
            )
        );
    }

    const db = await openPricesDb();
    return new Promise<HistoricalPriceCoverage | null>((resolve, reject) => {
        const tx = db.transaction(COVERAGE_STORE_NAME, "readonly");
        const store = tx.objectStore(COVERAGE_STORE_NAME);
        const index = store.index("tickerKey");
        const request = index.openCursor(IDBKeyRange.only(tickerKey));
        const entries: HistoricalPriceCoverage[] = [];
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                entries.push(cursor.value as HistoricalPriceCoverage);
                cursor.continue();
            } else {
                resolve(selectCoverage(entries));
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearCachedPricesForTicker = async (params: {
    type: PriceAssetType;
    ticker: string;
}) => {
    const ticker = params.ticker.trim().toUpperCase();
    const tickerKey = makeTickerKey(params.type, ticker);

    if (!isIndexedDbAvailable) {
        const fallback = loadFallbackCache();
        const matchingPriceIds = Object.values(fallback)
            .filter((entry) => entry.tickerKey === tickerKey)
            .map((entry) => entry.id);
        matchingPriceIds.forEach((id) => {
            delete fallback[id];
        });
        saveFallbackCache(fallback);

        const coverage = loadFallbackCoverage();
        const matchingCoverageIds = Object.values(coverage)
            .filter((entry) => entry.tickerKey === tickerKey)
            .map((entry) => entry.id);
        matchingCoverageIds.forEach((id) => {
            delete coverage[id];
        });
        saveFallbackCoverage(coverage);
        return matchingPriceIds.length;
    }

    const db = await openPricesDb();
    return new Promise<number>((resolve, reject) => {
        const tx = db.transaction(
            [PRICE_STORE_NAME, COVERAGE_STORE_NAME],
            "readwrite"
        );
        let deletedPriceCount = 0;
        [PRICE_STORE_NAME, COVERAGE_STORE_NAME].forEach((storeName) => {
            const index = tx.objectStore(storeName).index("tickerKey");
            const request = index.openCursor(IDBKeyRange.only(tickerKey));
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) return;
                cursor.delete();
                if (storeName === PRICE_STORE_NAME) {
                    deletedPriceCount += 1;
                }
                cursor.continue();
            };
        });
        tx.oncomplete = () => resolve(deletedPriceCount);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
};

export const clearAllCachedPrices = async () => {
    if (!isIndexedDbAvailable) {
        const deletedCount = Object.keys(loadFallbackCache()).length;
        saveFallbackCache({});
        saveFallbackCoverage({});
        return deletedCount;
    }

    const db = await openPricesDb();
    return new Promise<number>((resolve, reject) => {
        const tx = db.transaction(
            [PRICE_STORE_NAME, COVERAGE_STORE_NAME],
            "readwrite"
        );
        const priceStore = tx.objectStore(PRICE_STORE_NAME);
        const coverageStore = tx.objectStore(COVERAGE_STORE_NAME);
        const priceCountRequest = priceStore.count();
        priceStore.clear();
        coverageStore.clear();
        tx.oncomplete = () => resolve(priceCountRequest.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
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
        const tx = db.transaction(PRICE_STORE_NAME, "readonly");
        const store = tx.objectStore(PRICE_STORE_NAME);
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
        const tx = db.transaction(PRICE_STORE_NAME, "readonly");
        const store = tx.objectStore(PRICE_STORE_NAME);
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
        const tx = db.transaction(PRICE_STORE_NAME, "readonly");
        const store = tx.objectStore(PRICE_STORE_NAME);
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
