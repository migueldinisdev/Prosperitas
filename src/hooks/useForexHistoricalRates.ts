import { useEffect, useMemo, useState } from "react";
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

        if (!forexRequests.length) {
            setForexMap(new Map());
            return () => {
                isActive = false;
            };
        }

        const fetchForex = async () => {
            setIsLoading(true);
            try {
                const batch = await getPricesBatch(forexRequests);
                if (!isActive) return;
                const nextMap = new Map<string, number>();
                batch.results.forEach(({ request, value }) => {
                    if (!value) return;
                    const currency = request.ticker.slice(0, 3);
                    const date = request.date ?? value.date;
                    nextMap.set(makeForexKey(currency, date), value.close);
                });
                setForexMap(nextMap);
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
