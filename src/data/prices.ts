import {
    buildPriceCacheEntry,
    getCachedPrice,
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
import { updateAsset } from "../store/slices/assetsSlice";
import { setForexLivePrice } from "../store/slices/forexLivePricesSlice";

export type { PriceAssetType };

export interface PriceResult {
    ticker: string;
    type: PriceAssetType;
    date: string;
    close: number;
    source: string;
    fromCache?: boolean;
}

export type PriceBatchStatus = "ok" | "fallback" | "empty";

export interface PriceBatchNote {
    status: PriceBatchStatus;
    errorMessage?: string;
    isFallback: boolean;
    isFromCache: boolean;
}

export interface PriceBatchResultItem {
    request: PriceRequest;
    value: PriceResult | null;
    error: Error | null;
    note: PriceBatchNote;
}

export interface PriceBatchResult {
    results: PriceBatchResultItem[];
    summary: string;
    counts: {
        ok: number;
        fallback: number;
        empty: number;
    };
}

interface PriceRequest {
    ticker: string;
    type: PriceAssetType;
    date?: string;
}

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();

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
            if (request.type === "forex") {
                store.dispatch(
                    setForexLivePrice({
                        pair: ticker,
                        rate: filteredEntries[0].close,
                        updatedAt: new Date().toISOString(),
                    })
                );
            } else {
                const assets = store.getState().assets;
                Object.values(assets).forEach((asset) => {
                    if (asset.ticker.toUpperCase() === ticker) {
                        store.dispatch(
                            updateAsset({
                                id: asset.id,
                                changes: {
                                    livePrice: {
                                        value: filteredEntries[0].close,
                                        currency: asset.tradingCurrency,
                                    },
                                    livePriceUpdatedAt: new Date().toISOString(),
                                },
                            })
                        );
                    }
                });
            }
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
            if (request.type === "forex") {
                const liveForex = store.getState().forexLivePrices[ticker];
                if (liveForex) {
                    throw new PriceFallbackError(errorMessage, baseError, {
                        ticker,
                        type: request.type,
                        date: liveForex.updatedAt.slice(0, 10),
                        close: liveForex.rate,
                        source: "fallback",
                    });
                }
            } else {
                const assets = store.getState().assets;
                const matched = Object.values(assets).find(
                    (asset) => asset.ticker.toUpperCase() === ticker
                );
                if (matched?.livePrice) {
                    throw new PriceFallbackError(errorMessage, baseError, {
                        ticker,
                        type: request.type,
                        date:
                            matched.livePriceUpdatedAt?.slice(0, 10) ??
                            new Date().toISOString().slice(0, 10),
                        close: matched.livePrice.value,
                        source: "fallback",
                    });
                }
            }
        }

        throw error;
    }
};

export const getPricesBatch = async (
    requests: PriceRequest[]
): Promise<PriceBatchResult> => {
    const settled = await Promise.allSettled(
        requests.map(async (request) => ({
            request,
            value: await getPrice(request),
        }))
    );

    const results: PriceBatchResultItem[] = settled.map((result, index) => {
        const request = requests[index];
        if (result.status === "fulfilled") {
            return {
                request,
                value: result.value.value,
                error: null,
                note: {
                    status: "ok",
                    isFallback: false,
                    isFromCache: result.value.value.fromCache ?? false,
                },
            };
        }

        const error = result.reason instanceof Error
            ? result.reason
            : new Error("Unknown error");

        if (error instanceof PriceFallbackError) {
            const fallbackValue =
                error.fallback && typeof error.fallback === "object"
                    ? (error.fallback as PriceResult)
                    : null;
            return {
                request,
                value: fallbackValue,
                error,
                note: {
                    status: "fallback",
                    errorMessage: error.message,
                    isFallback: true,
                    isFromCache: fallbackValue?.fromCache ?? true,
                },
            };
        }

        return {
            request,
            value: null,
            error,
            note: {
                status: "empty",
                errorMessage: error.message,
                isFallback: false,
                isFromCache: false,
            },
        };
    });

    const counts = results.reduce(
        (acc, item) => {
            acc[item.note.status] += 1;
            return acc;
        },
        { ok: 0, fallback: 0, empty: 0 }
    );

    return {
        results,
        counts,
        summary: `${counts.ok} ok, ${counts.fallback} fallback, ${counts.empty} empty`,
    };
};
