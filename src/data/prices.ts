import {
    buildPriceCacheEntry,
    getCachedPrice,
    getClosestCachedPrice,
    getMostRecentCachedPrice,
    setCachedPrices,
    PriceAssetType,
    PriceCacheEntry,
} from "./cache/priceCache";
import { fetchStockHistorical, fetchStockLive } from "./api/prices/stockApi";
import { fetchForexHistorical, fetchForexLive } from "./api/prices/forexApi";
import { fetchCryptoHistorical, fetchCryptoLive } from "./api/prices/cryptoApi";
import { PriceApiError, TickerNotFoundError } from "./api/prices/errors";
import { store } from "../store";
import { addNotification } from "../store/slices/notificationsSlice";

export type { PriceAssetType };

export interface PriceResult {
    ticker: string;
    type: PriceAssetType;
    date: string;
    close: number;
    source: string;
    isApproximate?: boolean;
}

interface PriceRequest {
    ticker: string;
    type: PriceAssetType;
    date?: string;
    allowClosest?: boolean;
}

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();

const toDateMs = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();

const notifyError = (message: string) => {
    store.dispatch(
        addNotification({
            type: "error",
            title: "Price fetch failed",
            message,
        })
    );
};

const selectClosestEntry = (entries: PriceCacheEntry[], targetDate: string) => {
    if (!entries.length) return null;
    const targetMs = toDateMs(targetDate);
    return entries.reduce<PriceCacheEntry | null>((closest, entry) => {
        if (!closest) return entry;
        const diff = Math.abs(entry.dateMs - targetMs);
        const closestDiff = Math.abs(closest.dateMs - targetMs);
        return diff < closestDiff ? entry : closest;
    }, null);
};

const buildResult = (entry: PriceCacheEntry, approximate = false): PriceResult => ({
    ticker: entry.ticker,
    type: entry.type,
    date: entry.date,
    close: entry.close,
    source: entry.source,
    isApproximate: approximate || undefined,
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
    const allowClosest = request.allowClosest ?? true;

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
            const cached = await getMostRecentCachedPrice({
                type: request.type,
                ticker,
            });
            if (cached) {
                return buildResult(cached, true);
            }
        }
    } catch (error) {
        notifyError("Unable to read from the price cache.");
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

        try {
            await setCachedPrices(cacheEntries);
        } catch (error) {
            notifyError("Unable to update the price cache.");
            throw error;
        }

        if (request.date) {
            const closest = selectClosestEntry(cacheEntries, request.date);
            if (closest) {
                return buildResult(
                    closest,
                    closest.date !== request.date
                );
            }
        }

        if (cacheEntries[0]) {
            return buildResult(cacheEntries[0]);
        }

        throw new PriceApiError("No price data returned from provider.");
    } catch (error) {
        if (error instanceof TickerNotFoundError) {
            throw error;
        }

        if (allowClosest && request.date) {
            try {
                const closest = await getClosestCachedPrice({
                    type: request.type,
                    ticker,
                    date: request.date,
                });
                if (closest) {
                    return buildResult(closest, true);
                }
            } catch (cacheError) {
                notifyError("Unable to read from the price cache.");
                throw cacheError;
            }
        }

        if (allowClosest && !request.date) {
            try {
                const cached = await getMostRecentCachedPrice({
                    type: request.type,
                    ticker,
                });
                if (cached) {
                    return buildResult(cached, true);
                }
            } catch (cacheError) {
                notifyError("Unable to read from the price cache.");
                throw cacheError;
            }
        }

        const message =
            error instanceof Error ? error.message : "Price fetch failed.";
        notifyError(message);
        throw error;
    }
};
