import { useEffect, useMemo, useRef, useState } from "react";
import { getPricesBatch } from "../data/prices";

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();
const makeForexKey = (currency: string, date: string) => `${currency}:${date}`;

export const useForexHistoricalRates = (
    currencies: string[],
    dates: string[],
    baseCurrency: string
): {
    forexMap: Map<string, number>;
    getForexRate: (currency: string, date: string) => number | null;
    isLoading: boolean;
} => {
    const [forexMap, setForexMap] = useState<Map<string, number>>(
        () => new Map()
    );
    const [isLoading, setIsLoading] = useState(false);
    const errorCount = useRef(0);
    const circuitBroken = useRef(false);
    const lastAttemptTime = useRef(0);
    const CIRCUIT_BREAKER_THRESHOLD = 3;
    const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

    const normalizedDates = useMemo(() => {
        const unique = Array.from(new Set(dates));
        return unique.sort((a, b) => a.localeCompare(b));
    }, [dates]);

    const normalizedCurrencies = useMemo(() => {
        const unique = Array.from(
            new Set(
                currencies
                    .map((currency) => currency.trim().toUpperCase())
                    .filter((currency) => currency)
            )
        );
        return unique.filter((currency) => currency !== baseCurrency);
    }, [baseCurrency, currencies]);

    const forexRequests = useMemo(() => {
        if (!normalizedDates.length || !normalizedCurrencies.length) return [];
        return normalizedCurrencies.flatMap((currency) => {
            const ticker = normalizeTicker(`${currency}${baseCurrency}`);
            if (!ticker) return [];
            return normalizedDates.map((date) => ({
                type: "forex" as const,
                ticker,
                date,
            }));
        });
    }, [baseCurrency, normalizedCurrencies, normalizedDates]);

    useEffect(() => {
        let isActive = true;

        // Check if circuit breaker is active
        if (circuitBroken.current) {
            const timeSinceLastAttempt = Date.now() - lastAttemptTime.current;
            if (timeSinceLastAttempt < COOLDOWN_PERIOD_MS) {
                return () => {
                    isActive = false;
                };
            }
            // Reset circuit breaker after cooldown
            circuitBroken.current = false;
            errorCount.current = 0;
        }

        if (!forexRequests.length) {
            setForexMap(new Map());
            return () => {
                isActive = false;
            };
        }

        const fetchForex = async () => {
            setIsLoading(true);
            lastAttemptTime.current = Date.now();
            
            try {
                const batch = await getPricesBatch(forexRequests);
                if (!isActive) return;
                
                const nextMap = new Map<string, number>();
                let successCount = 0;
                let failureCount = 0;
                
                batch.results.forEach(({ request, value, error }) => {
                    if (value) {
                        successCount++;
                        const currency = request.ticker.slice(0, 3);
                        const date = request.date ?? value.date;
                        nextMap.set(makeForexKey(currency, date), value.close);
                    } else if (error) {
                        failureCount++;
                    }
                });
                
                setForexMap(nextMap);
                
                // Update circuit breaker state
                if (failureCount > 0 && successCount === 0) {
                    errorCount.current += 1;

                    if (errorCount.current >= CIRCUIT_BREAKER_THRESHOLD) {
                        circuitBroken.current = true;
                    }
                } else if (successCount > 0) {
                    // Reset error count on any success
                    errorCount.current = 0;
                }
            } catch (error) {
                if (isActive) {
                    errorCount.current += 1;
                    
                    if (errorCount.current >= CIRCUIT_BREAKER_THRESHOLD) {
                        circuitBroken.current = true;
                    }
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        fetchForex();

        return () => {
            isActive = false;
        };
    }, [forexRequests]);

    const getForexRate = (currency: string, date: string) => {
        if (currency === baseCurrency) return 1;
        return forexMap.get(makeForexKey(currency, date)) ?? null;
    };

    return { forexMap, getForexRate, isLoading };
};
