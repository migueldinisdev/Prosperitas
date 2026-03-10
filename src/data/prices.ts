import {
    buildPriceCacheEntry,
    getCachedPrice,
    getMostRecentCachedPrice,
    getPreviousCachedPrice,
    setCachedPrices,
    PriceAssetType,
    PriceCacheEntry,
} from "./cache/priceCache";
import { fetchStockHistorical, fetchStockLive } from "./api/prices/stockApi";
import { fetchForexHistorical, fetchForexLive } from "./api/prices/forexApi";
import { fetchCryptoHistorical, fetchCryptoLive } from "./api/prices/cryptoApi";
import {
    PriceApiError,
    PriceFallbackError,
    TickerNotFoundError,
} from "./api/prices/errors";
import { store } from "../store";
import { setLivePrice } from "../store/slices/livePricesSlice";

export type { PriceAssetType };

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
    date?: string
) => {
    if (!date) {
        if (type === "stock") {
            const price = await fetchStockLive(ticker);
            return [price];
        }
        if (type === "forex") {
            const price = await fetchForexLive(ticker);
            return [price];
        }
        const price = await fetchCryptoLive(ticker);
        return [price];
    }

    if (type === "stock") {
        return fetchStockHistorical(ticker, date);
    }
    if (type === "forex") {
        return fetchForexHistorical(ticker, date);
    }
    return fetchCryptoHistorical(ticker, date);
};

export const getPrice = async (request: PriceRequest): Promise<PriceResult> => {
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
        } else {
            // Always hit the live API; cache is only for fallback/reference.
        }
    } catch (error) {
        throw error;
    }

    try {
        const apiEntries = await fetchFromApi(
            request.type,
            ticker,
            request.date
        );
        const cacheEntries = apiEntries.map((entry) =>
            buildPriceCacheEntry(
                request.type,
                ticker,
                entry.date,
                entry.close,
                entry.source
            )
        );

        const filteredEntries = request.date
            ? cacheEntries.filter((entry) => entry.date <= request.date!)
            : cacheEntries;
        if (!filteredEntries.length) {
            throw new PriceApiError("No price data returned from provider.");
        }

        await setCachedPrices(filteredEntries);
        if (!request.date) {
            store.dispatch(
                setLivePrice({
                    key: makeLivePriceKey(request.type, ticker),
                    type: request.type,
                    ticker,
                    value: filteredEntries[0].close,
                    updatedAt: new Date().toISOString(),
                    source: filteredEntries[0].source,
                })
            );
        }

        if (request.date) {
            const closest = selectPreviousEntry(filteredEntries, request.date);
            if (closest) {
                if (closest.date !== request.date) {
                    const aliasEntry = buildPriceCacheEntry(
                        request.type,
                        ticker,
                        request.date,
                        closest.close,
                        closest.source
                    );
                    await setCachedPrices([aliasEntry]);
                    return buildResult(aliasEntry);
                }
                return buildResult(closest);
            }
        }

        if (filteredEntries[0]) {
            return buildResult(filteredEntries[0]);
        }

        throw new PriceApiError("No price data returned from provider.");
    } catch (error) {
        if (error instanceof TickerNotFoundError) {
            throw error;
        }

        const baseError =
            error instanceof Error ? error : new Error("Unknown error");
        const errorMessage = baseError.message || "Price fetch failed.";

        if (request.date) {
            try {
                const closest = await getPreviousCachedPrice({
                    type: request.type,
                    ticker,
                    date: request.date,
                });
                if (closest) {
                    const fallbackEntry =
                        closest.date !== request.date
                            ? buildPriceCacheEntry(
                                  request.type,
                                  ticker,
                                  request.date,
                                  closest.close,
                                  closest.source
                              )
                            : closest;
                    if (fallbackEntry !== closest) {
                        await setCachedPrices([fallbackEntry]);
                    }
                    throw new PriceFallbackError(
                        errorMessage,
                        baseError,
                        buildResult(fallbackEntry, true)
                    );
                }
            } catch (cacheError) {
                throw cacheError;
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
