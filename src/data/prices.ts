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
    PriceBeforeListingError,
    PriceApiError,
    PriceFallbackError,
    TickerNotFoundError,
} from "./api/prices/errors";
import {
    getDirtyYahooTicker,
    getYahooTickerAvailableFrom,
    markYahooTickerDirty,
    rememberYahooTickerAvailableFrom,
    syncYahooTicker,
} from "./api/prices/yahooTickerStatus";
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

export interface PriceRequest {
    ticker: string;
    type: PriceAssetType;
    date?: string;
    symbolYF?: string;
    assetId?: string;
}

interface ApiPriceEntry {
    date: string;
    close: number;
    source: string;
}

interface ApiPriceResult {
    entries: ApiPriceEntry[];
    availableFrom?: string;
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
const lastStockErrorNotificationByKey = new Map<string, number>();
const yahooTickerValidationByAsset = new Map<string, Promise<void>>();
const yahooStockLiveRequests = new Map<
    string,
    Promise<Awaited<ReturnType<typeof fetchStockLive>>>
>();

const notifyYahooError = (ticker: string, error: unknown) => {
    const isInvalidTicker = error instanceof TickerNotFoundError;
    const status =
        error instanceof PriceApiError || error instanceof TickerNotFoundError
            ? error.status
            : undefined;
    const notificationKey = isInvalidTicker
        ? `invalid:${ticker}`
        : `status:${status ?? "unknown"}`;
    const now = Date.now();
    const lastNotification =
        lastStockErrorNotificationByKey.get(notificationKey) ?? 0;
    if (now - lastNotification < STOCK_ERROR_NOTIFICATION_COOLDOWN_MS) {
        return;
    }

    lastStockErrorNotificationByKey.set(notificationKey, now);
    let title = "Yahoo Finance request failed";
    let message =
        error instanceof Error
            ? error.message
            : `The Yahoo Finance request for ${ticker} failed.`;

    if (isInvalidTicker) {
        title = "Yahoo ticker not found";
    } else if (status === 429) {
        title = "Yahoo Finance rate limit reached";
        message = "Yahoo Finance is receiving too many requests. Please try again later.";
    } else if (status === 504) {
        title = "Yahoo Finance timed out";
    } else if (status && status >= 500) {
        title = "Yahoo Finance is unavailable";
    }

    store.dispatch(
        addNotification({
            type: "error",
            title,
            message,
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

const fetchStockLiveShared = (
    ticker: string,
    symbolYF?: string
) => {
    const yahooTicker = normalizeTicker(symbolYF || ticker);
    const existing = yahooStockLiveRequests.get(yahooTicker);
    if (existing) return existing;

    const request = fetchStockLive({
        symbol: ticker,
        symbolYF,
    })
        .then((price) => {
            if (price.availableFrom) {
                rememberYahooTickerAvailableFrom(
                    yahooTicker,
                    price.availableFrom
                );
            }
            return price;
        })
        .finally(() => {
            if (yahooStockLiveRequests.get(yahooTicker) === request) {
                yahooStockLiveRequests.delete(yahooTicker);
            }
        });
    yahooStockLiveRequests.set(yahooTicker, request);
    return request;
};

const discoverYahooTickerAvailableFrom = async (
    ticker: string,
    symbolYF?: string
) => {
    const yahooTicker = normalizeTicker(symbolYF || ticker);
    const cached = getYahooTickerAvailableFrom(yahooTicker);
    if (cached) return cached;
    const price = await fetchStockLiveShared(ticker, symbolYF);
    return price.availableFrom ?? null;
};

const fetchFromApi = async (
    type: PriceAssetType,
    ticker: string,
    date?: string,
    symbolYF?: string
): Promise<ApiPriceResult> => {
    if (!date) {
        if (type === "stock") {
            const price = await fetchStockLiveShared(ticker, symbolYF);
            return {
                entries: [price],
                availableFrom: price.availableFrom,
            };
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
        const yahooTicker =
            request.type === "stock"
                ? normalizeTicker(request.symbolYF || request.ticker)
                : "";
        const throwIfYahooTickerIsDirty = () => {
            if (!request.assetId || !yahooTicker) return;
            const dirtyTicker = getDirtyYahooTicker(
                request.assetId,
                yahooTicker
            );
            if (!dirtyTicker) return;
            throw new TickerNotFoundError(
                dirtyTicker.ticker,
                "stock",
                dirtyTicker.message,
                {
                    status: 404,
                    code: "DIRTY_YAHOO_TICKER",
                    provider: "yahoo",
                }
            );
        };

        if (request.type === "stock" && request.assetId) {
            syncYahooTicker(request.assetId, yahooTicker);
            throwIfYahooTickerIsDirty();
        }

        const handleYahooRequestError = (error: unknown): never => {
            if (request.type === "stock") {
                if (
                    request.assetId &&
                    error instanceof TickerNotFoundError &&
                    error.status === 404 &&
                    error.provider === "yahoo"
                ) {
                    markYahooTickerDirty(
                        request.assetId,
                        request.symbolYF || request.ticker,
                        error.message
                    );
                }
                notifyYahooError(ticker, error);
            }
            throw error;
        };

        if (request.type === "stock" && request.date) {
            const availableFrom =
                getYahooTickerAvailableFrom(yahooTicker) ??
                await discoverYahooTickerAvailableFrom(
                    ticker,
                    request.symbolYF
                ).catch(handleYahooRequestError);
            if (
                availableFrom &&
                request.date < availableFrom
            ) {
                throw new PriceBeforeListingError(
                    yahooTicker,
                    request.date,
                    availableFrom
                );
            }
        }

        const fetchApiResult = () =>
            fetchFromApi(
                request.type,
                ticker,
                request.date,
                request.symbolYF
            ).catch(handleYahooRequestError);

        let apiResult: ApiPriceResult;
        if (request.type === "stock" && request.assetId) {
            const validationKey = `${request.assetId}:${yahooTicker}`;
            const pendingValidation =
                yahooTickerValidationByAsset.get(validationKey);

            if (pendingValidation) {
                await pendingValidation;
                throwIfYahooTickerIsDirty();
                apiResult = await fetchApiResult();
            } else {
                let releaseValidation: () => void = () => undefined;
                const validation = new Promise<void>((resolve) => {
                    releaseValidation = resolve;
                });
                yahooTickerValidationByAsset.set(validationKey, validation);

                try {
                    apiResult = await fetchApiResult();
                } finally {
                    if (
                        yahooTickerValidationByAsset.get(validationKey) ===
                        validation
                    ) {
                        yahooTickerValidationByAsset.delete(validationKey);
                    }
                    releaseValidation();
                }
            }
        } else {
            apiResult = await fetchApiResult();
        }

        if (
            request.type === "stock" &&
            apiResult.availableFrom
        ) {
            rememberYahooTickerAvailableFrom(
                yahooTicker,
                apiResult.availableFrom
            );
        }

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
