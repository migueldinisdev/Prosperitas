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

const buildResult = (entry: PriceCacheEntry): PriceResult => ({
    ticker: entry.ticker,
    type: entry.type,
    date: entry.date,
    close: entry.close,
    source: entry.source,
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
                return buildResult(cached);
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
                    throw new PriceFallbackError(
                        errorMessage,
                        baseError,
                        buildResult(closest)
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
