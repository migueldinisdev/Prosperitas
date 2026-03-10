import { useEffect, useMemo, useRef } from "react";
import { getPrice } from "../data/prices";
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

export const useForexLivePrices = (
    currencies: string[],
    visualCurrency: string
) => {
    const livePrices = useAppSelector(selectLivePrices);
    const inFlightRequests = useRef(new Set<string>());
    const errorCount = useRef(0);
    const circuitBroken = useRef(false);
    const lastAttemptTime = useRef(0);
    const CIRCUIT_BREAKER_THRESHOLD = 3;
    const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

    const forexRequests = useMemo(() => {
        const uniqueCurrencies = Array.from(new Set(currencies));
        return uniqueCurrencies
            .filter((currency) => currency !== visualCurrency)
            .map((currency) => {
                const ticker = normalizeTicker(`${currency}${visualCurrency}`);
                return { currency, ticker };
            })
            .filter((request) => request.ticker.length > 0);
    }, [currencies, visualCurrency]);

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

        const requestsToFetch = forexRequests.filter(({ ticker }) => {
            const key = `forex:${ticker}`;
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
            requestsToFetch.forEach(({ ticker }) => {
                inFlightRequests.current.add(`forex:${ticker}`);
            });
            
            const results = await Promise.all(
                requestsToFetch.map(({ ticker }) =>
                    getPrice({ type: "forex", ticker })
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
            
            requestsToFetch.forEach(({ ticker }) => {
                inFlightRequests.current.delete(`forex:${ticker}`);
            });
        };

        fetchPrices();
    }, [forexRequests, livePrices]);

    return useMemo(() => {
        return forexRequests.reduce<Record<string, number>>(
            (map, { currency, ticker }) => {
                const key = `forex:${ticker}`;
                const livePrice = livePrices[key];
                if (livePrice) {
                    map[currency] = livePrice.value;
                }
                return map;
            },
            {}
        );
    }, [forexRequests, livePrices]);
};
