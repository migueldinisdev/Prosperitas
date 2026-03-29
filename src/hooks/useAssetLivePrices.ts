import { useEffect, useMemo, useRef } from "react";
import { getPrice, PriceAssetType } from "../data/prices";
import { Asset } from "../core/schema-types";
import { useAppSelector } from "../store/hooks";
import { selectLivePrices } from "../store/selectors";

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();
const LIVE_PRICE_MAX_AGE_MS = 60 * 60 * 1000;

const isLivePriceFresh = (updatedAt?: string) => {
    if (!updatedAt) return false;
    const updatedAtMs = Date.parse(updatedAt);
    if (Number.isNaN(updatedAtMs)) return false;
    return Date.now() - updatedAtMs < LIVE_PRICE_MAX_AGE_MS;
};

const getAssetPriceRequest = (asset: Asset) => {
    if (asset.assetType === "cash") return null;
    if (asset.assetType === "crypto") {
        const quoteAlias =
            asset.cryptoQuoteAlias?.trim() ||
            (asset.tradingCurrency === "USD"
                ? "USDT"
                : asset.tradingCurrency ?? "");
        const pair = `${asset.ticker}${quoteAlias}`;
        const ticker = normalizeTicker(pair);
        if (!ticker) return null;
        return { type: "crypto" as PriceAssetType, ticker };
    }
    const symbolYF = normalizeTicker(asset.yfTicker ?? asset.ticker);
    const symbolStooq = normalizeTicker(asset.stooqTicker ?? "");
    const ticker = symbolYF || symbolStooq;
    if (!ticker) return null;
    return {
        type: "stock" as PriceAssetType,
        ticker,
        symbolYF: symbolYF || undefined,
        symbolStooq: symbolStooq || undefined,
    };
};

export const useAssetLivePrices = (assets: Asset[]) => {
    const livePrices = useAppSelector(selectLivePrices);
    const inFlightRequests = useRef(new Set<string>());
    const errorCount = useRef(0);
    const circuitBroken = useRef(false);
    const lastAttemptTime = useRef(0);
    const CIRCUIT_BREAKER_THRESHOLD = 3;
    const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

    const priceRequests = useMemo(
        () =>
            assets
                .map((asset) => ({
                    assetId: asset.id,
                    request: getAssetPriceRequest(asset),
                }))
                .filter(
                    (
                        entry
                    ): entry is {
                        assetId: string;
                        request: { type: PriceAssetType; ticker: string };
                    } => Boolean(entry.request)
                ),
        [assets]
    );

    useEffect(() => {
        // Check if circuit breaker is active
        if (circuitBroken.current) {
            const timeSinceLastAttempt = Date.now() - lastAttemptTime.current;
            if (timeSinceLastAttempt < COOLDOWN_PERIOD_MS) {
                return;
            }
            // Reset circuit breaker after cooldown
            circuitBroken.current = false;
            errorCount.current = 0;
        }

        const requestsToFetch = priceRequests.filter(({ request }) => {
            const key = `${request.type}:${request.ticker}`;
            const livePrice = livePrices[key];
            if (inFlightRequests.current.has(key)) {
                return false;
            }
            return !livePrice || !isLivePriceFresh(livePrice.updatedAt);
        });

        if (!requestsToFetch.length) {
            return;
        }

        const fetchPrices = async () => {
            lastAttemptTime.current = Date.now();
            requestsToFetch.forEach(({ request }) => {
                inFlightRequests.current.add(
                    `${request.type}:${request.ticker}`
                );
            });
            
            const results = await Promise.all(
                requestsToFetch.map(({ request }) =>
                    getPrice(request)
                        .then((result) => ({ success: true, result }))
                        .catch((error) => ({ success: false, error }))
                )
            );

            const successCount = results.filter((r) => r.success).length;
            const failureCount = results.filter((r) => !r.success).length;

            if (failureCount > 0 && successCount === 0) {
                errorCount.current += 1;

                if (errorCount.current >= CIRCUIT_BREAKER_THRESHOLD) {
                    circuitBroken.current = true;
                }
            } else if (successCount > 0) {
                // Reset error count on any success
                errorCount.current = 0;
            }
            
            requestsToFetch.forEach(({ request }) => {
                inFlightRequests.current.delete(
                    `${request.type}:${request.ticker}`
                );
            });
        };

        fetchPrices();
    }, [livePrices, priceRequests]);

    return useMemo(() => {
        return priceRequests.reduce<Record<string, number>>(
            (map, { assetId, request }) => {
                const key = `${request.type}:${request.ticker}`;
                const livePrice = livePrices[key];
                if (livePrice) {
                    map[assetId] = livePrice.value;
                }
                return map;
            },
            {}
        );
    }, [livePrices, priceRequests]);
};
