import {
    buildPriceCacheEntry,
    clearAllCachedPrices,
    clearCachedPricesForTicker,
    getCachedPrice,
    getHistoricalPriceCoverage,
    getMostRecentCachedPrice,
    getPreviousCachedPrice,
    setCachedPrices,
    setHistoricalPriceCoverage,
    PriceAssetType,
    PriceCacheEntry,
} from "./cache/priceCache";
import { fetchStockHistorical, fetchStockLive } from "./api/prices/stockApi";
import { fetchForexHistorical, fetchForexLive } from "./api/prices/forexApi";
import { fetchCryptoHistorical, fetchCryptoLive } from "./api/prices/cryptoApi";
import {
    PriceApiError,
    PriceFallbackError,
} from "./api/prices/errors";
import { store } from "../store";
import { setLivePrice } from "../store/slices/livePricesSlice";
import { addNotification } from "../store/slices/notificationsSlice";

export type { PriceAssetType };
export { clearAllCachedPrices, clearCachedPricesForTicker };

export interface PriceResult {
    ticker: string;
    type: PriceAssetType;
    date: string;
    close: number;
    source: string;
    fromCache?: boolean;
}

interface PriceRequest {
    ticker: string;
    type: PriceAssetType;
    date?: string;
    symbolYF?: string;
}

interface ApiPriceEntry {
    date: string;
    close: number;
    source: string;
}

interface ApiPriceResult {
    entries: ApiPriceEntry[];
    coverage?: {
        from: string;
        to: string;
    };
}

export interface PriceBatchRequest extends PriceRequest {}

export interface PriceBatchResult {
    request: PriceBatchRequest;
    value: PriceResult | null;
    error?: unknown;
}

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();

const makeLivePriceKey = (type: PriceAssetType, ticker: string) =>
    `${type}:${ticker}`;

const toDateMs = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();

const MAX_HISTORICAL_FALLBACK_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const STOCK_ERROR_NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;
const lastStockErrorNotificationByTicker = new Map<string, number>();

const notifyInvalidYahooTicker = (ticker: string) => {
    const now = Date.now();
    const lastNotification =
        lastStockErrorNotificationByTicker.get(ticker) ?? 0;
    if (now - lastNotification < STOCK_ERROR_NOTIFICATION_COOLDOWN_MS) {
        return;
    }

    lastStockErrorNotificationByTicker.set(ticker, now);
    store.dispatch(
        addNotification({
            type: "error",
            title: "Yahoo ticker request failed",
            message: `The Yahoo Finance request for ${ticker} failed because the ticker is wrong.`,
            timeout: 8000,
        })
    );
};

const isRecentPreviousEntry = (
    entry: PriceCacheEntry,
    targetDate: string
) => {
    const ageMs = toDateMs(targetDate) - entry.dateMs;
    return ageMs >= 0 && ageMs <= MAX_HISTORICAL_FALLBACK_AGE_MS;
};

const selectPreviousEntry = (entries: PriceCacheEntry[], targetDate: string) => {
    if (!entries.length) return null;
    const targetMs = toDateMs(targetDate);
    return entries.reduce<PriceCacheEntry | null>((previous, entry) => {
        if (entry.dateMs > targetMs) {
            return previous;
        }
        if (!previous) return entry;
        return entry.dateMs > previous.dateMs ? entry : previous;
    }, null);
};

const buildResult = (
    entry: PriceCacheEntry,
    fromCache = false
): PriceResult => ({
    ticker: entry.ticker,
    type: entry.type,
    date: entry.date,
    close: entry.close,
    source: entry.source,
    fromCache,
});

const fetchFromApi = async (
    type: PriceAssetType,
    ticker: string,
    date?: string,
    symbolYF?: string
): Promise<ApiPriceResult> => {
    if (!date) {
        if (type === "stock") {
            const price = await fetchStockLive({
                symbol: ticker,
                symbolYF,
            });
            return { entries: [price] };
        }
        if (type === "forex") {
            const price = await fetchForexLive(ticker);
            return { entries: [price] };
        }
        const price = await fetchCryptoLive(ticker);
        return { entries: [price] };
    }

    if (type === "stock") {
        return fetchStockHistorical(
            {
                symbol: ticker,
                symbolYF,
            },
            date
        );
    }
    if (type === "forex") {
        const entries = await fetchForexHistorical(ticker, date);
        const dates = [date, ...entries.map((entry) => entry.date)].sort(
            (a, b) => a.localeCompare(b)
        );
        return {
            entries,
            coverage: {
                from: dates[0],
                to: dates[dates.length - 1],
            },
        };
    }
    const entries = await fetchCryptoHistorical(ticker, date);
    return {
        entries,
        coverage: { from: date, to: date },
    };
};

const getPriceUnshared = async (
    request: PriceRequest
): Promise<PriceResult> => {
    const ticker = normalizeTicker(request.ticker);

    try {
        if (request.date) {
            const cached = await getCachedPrice({
                type: request.type,
                ticker,
                date: request.date,
            });
            if (cached) {
                return buildResult(cached, true);
            }
            const coverage = await getHistoricalPriceCoverage({
                type: request.type,
                ticker,
                date: request.date,
            });
            if (coverage) {
                const previous = await getPreviousCachedPrice({
                    type: request.type,
                    ticker,
                    date: request.date,
                });
                if (
                    previous &&
                    previous.date >= coverage.from &&
                    isRecentPreviousEntry(previous, request.date)
                ) {
                    return buildResult(previous, true);
                }
            }
        } else {
            // Always hit the live API; cache is only for fallback/reference.
        }
    } catch (error) {
        throw error;
    }

    try {
        const apiResult = await fetchFromApi(
            request.type,
            ticker,
            request.date,
            request.symbolYF
        ).catch((error) => {
            if (request.type === "stock") {
                notifyInvalidYahooTicker(ticker);
            }
            throw error;
        });
        const cacheEntries = apiResult.entries.map((entry) =>
            buildPriceCacheEntry(
                request.type,
                ticker,
                entry.date,
                entry.close,
                entry.source
            )
        );

        const eligibleEntries = request.date
            ? cacheEntries.filter((entry) => entry.date <= request.date!)
            : cacheEntries;
        if (!eligibleEntries.length) {
            throw new PriceApiError("No price data returned from provider.");
        }

        await setCachedPrices(cacheEntries);
        if (!request.date) {
            store.dispatch(
                setLivePrice({
                    key: makeLivePriceKey(request.type, ticker),
                    type: request.type,
                    ticker,
                    value: eligibleEntries[0].close,
                    updatedAt: new Date().toISOString(),
                    source: eligibleEntries[0].source,
                })
            );
        }

        if (request.date) {
            const closest = selectPreviousEntry(eligibleEntries, request.date);
            if (closest && isRecentPreviousEntry(closest, request.date)) {
                if (apiResult.coverage) {
                    await setHistoricalPriceCoverage({
                        type: request.type,
                        ticker,
                        from: apiResult.coverage.from,
                        to: apiResult.coverage.to,
                    });
                }
                return buildResult(closest);
            }
            throw new PriceApiError(
                "No sufficiently recent price data returned from provider."
            );
        }

        if (eligibleEntries[0]) {
            return buildResult(eligibleEntries[0]);
        }

        throw new PriceApiError("No price data returned from provider.");
    } catch (error) {
        const baseError =
            error instanceof Error ? error : new Error("Unknown error");
        const errorMessage = baseError.message || "Price fetch failed.";

        if (request.date) {
            const closest = await getPreviousCachedPrice({
                type: request.type,
                ticker,
                date: request.date,
            });
            if (closest && isRecentPreviousEntry(closest, request.date)) {
                throw new PriceFallbackError(
                    errorMessage,
                    baseError,
                    buildResult(closest, true)
                );
            }
        }

        if (!request.date) {
            const cachedLive = await getMostRecentCachedPrice({
                type: request.type,
                ticker,
            });
            if (cachedLive) {
                throw new PriceFallbackError(
                    errorMessage,
                    baseError,
                    buildResult(cachedLive, true)
                );
            }

            const livePrice =
                store.getState().livePrices[makeLivePriceKey(request.type, ticker)];
            if (livePrice) {
                throw new PriceFallbackError(errorMessage, baseError, {
                    ticker,
                    type: request.type,
                    date: livePrice.updatedAt.slice(0, 10),
                    close: livePrice.value,
                    source: "fallback",
                });
            }
        }

        throw error;
    }
};

const inFlightHistoricalPriceRequests = new Map<
    string,
    Promise<PriceResult>
>();

export const getPrice = (request: PriceRequest): Promise<PriceResult> => {
    if (!request.date) {
        return getPriceUnshared(request);
    }

    const key = `${request.type}:${normalizeTicker(request.ticker)}:${request.date}`;
    const existing = inFlightHistoricalPriceRequests.get(key);
    if (existing) return existing;

    const pending = getPriceUnshared(request).finally(() => {
        if (inFlightHistoricalPriceRequests.get(key) === pending) {
            inFlightHistoricalPriceRequests.delete(key);
        }
    });
    inFlightHistoricalPriceRequests.set(key, pending);
    return pending;
};

export const getPricesBatch = async (
    requests: PriceBatchRequest[]
): Promise<{ results: PriceBatchResult[] }> => {
    const results = await Promise.all(
        requests.map(async (request) => {
            try {
                const value = await getPrice(request);
                return { request, value };
            } catch (error) {
                // Use fallback price if available
                if (error instanceof PriceFallbackError && error.fallback) {
                    return { 
                        request, 
                        value: error.fallback as PriceResult 
                    };
                }
                return { request, value: null, error };
            }
        })
    );

    return { results };
};
