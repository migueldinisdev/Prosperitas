import { useEffect, useMemo, useState } from "react";
import { Asset, WalletTx } from "../core/schema-types";
import { getPricesBatch, PriceAssetType } from "../data/prices";
import {
    buildNetWorthHistory,
    getWalletTxCurrencies,
    NetWorthHistoryPoint,
} from "../utils/netWorthHistory";

interface UseNetWorthHistoryOptions {
    transactions: WalletTx[];
    assets: Record<string, Asset>;
    baseCurrency: string;
    locale?: string;
    assetFilter?: Set<string>;
    includeCash?: boolean;
    includeDeposits?: boolean;
    includeWithdrawals?: boolean;
    includeDividends?: boolean;
    includeForex?: boolean;
    snapshotDates?: string[];
}

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();

const getAssetPriceRequest = (asset: Asset) => {
    if (asset.assetType === "cash") return null;
    if (asset.assetType === "crypto") {
        const pair = `${asset.ticker}${asset.tradingCurrency ?? ""}`;
        const ticker = normalizeTicker(pair);
        if (!ticker) return null;
        return { type: "crypto" as PriceAssetType, ticker };
    }
    if (!asset.stooqTicker) return null;
    const ticker = normalizeTicker(asset.stooqTicker);
    if (!ticker) return null;
    return { type: "stock" as PriceAssetType, ticker };
};

const makePriceKey = (type: PriceAssetType, ticker: string, date: string) =>
    `${type}:${ticker}:${date}`;

const makeForexKey = (currency: string, date: string) => `${currency}:${date}`;

export const useNetWorthHistory = ({
    transactions,
    assets,
    baseCurrency,
    locale,
    assetFilter,
    includeCash = true,
    includeDeposits = true,
    includeWithdrawals = true,
    includeDividends = true,
    includeForex = true,
    snapshotDates,
}: UseNetWorthHistoryOptions): {
    data: NetWorthHistoryPoint[];
    isLoading: boolean;
} => {
    const [priceMap, setPriceMap] = useState<Map<string, number>>(
        () => new Map()
    );
    const [forexMap, setForexMap] = useState<Map<string, number>>(
        () => new Map()
    );
    const [isLoading, setIsLoading] = useState(false);

    const sortedTransactions = useMemo(
        () =>
            [...transactions].sort(
                (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
            ),
        [transactions]
    );

    const dates = useMemo(() => {
        if (snapshotDates && snapshotDates.length > 0) {
            return Array.from(new Set(snapshotDates)).sort((a, b) =>
                a.localeCompare(b)
            );
        }
        const unique = new Set<string>();
        sortedTransactions.forEach((tx) => unique.add(tx.date));
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [snapshotDates, sortedTransactions]);

    const assetIds = useMemo(() => {
        const ids = new Set<string>();
        sortedTransactions.forEach((tx) => {
            if ("assetId" in tx && tx.assetId) {
                if (!assetFilter || assetFilter.has(tx.assetId)) {
                    ids.add(tx.assetId);
                }
            }
        });
        if (assetFilter) {
            assetFilter.forEach((assetId) => ids.add(assetId));
        }
        return Array.from(ids);
    }, [assetFilter, sortedTransactions]);

    const assetMetadata = useMemo(() => {
        return assetIds.reduce<Record<string, { tradingCurrency?: string }>>(
            (map, assetId) => {
                const asset = assets[assetId];
                if (asset) {
                    map[assetId] = { tradingCurrency: asset.tradingCurrency };
                }
                return map;
            },
            {}
        );
    }, [assetIds, assets]);

    const priceRequests = useMemo(() => {
        if (!dates.length || !assetIds.length) return [];
        const requests: Array<{
            type: PriceAssetType;
            ticker: string;
            date: string;
        }> = [];
        assetIds.forEach((assetId) => {
            const asset = assets[assetId];
            if (!asset) return;
            const request = getAssetPriceRequest(asset);
            if (!request) return;
            dates.forEach((date) => {
                requests.push({ ...request, date });
            });
        });
        return requests;
    }, [assetIds, assets, dates]);

    const forexCurrencies = useMemo(() => {
        const currencies = new Set<string>(
            getWalletTxCurrencies(sortedTransactions)
        );
        assetIds.forEach((assetId) => {
            const tradingCurrency = assets[assetId]?.tradingCurrency;
            if (tradingCurrency) currencies.add(tradingCurrency);
        });
        currencies.delete(baseCurrency);
        return Array.from(currencies);
    }, [assetIds, assets, baseCurrency, sortedTransactions]);

    const forexRequests = useMemo(() => {
        if (!dates.length || !forexCurrencies.length) return [];
        const requests: Array<{
            type: "forex";
            ticker: string;
            date: string;
        }> = [];
        forexCurrencies.forEach((currency) => {
            const ticker = normalizeTicker(`${currency}${baseCurrency}`);
            if (!ticker) return;
            dates.forEach((date) => {
                requests.push({ type: "forex", ticker, date });
            });
        });
        return requests;
    }, [baseCurrency, dates, forexCurrencies]);

    useEffect(() => {
        let isActive = true;
        if (!dates.length) {
            setPriceMap(new Map());
            setForexMap(new Map());
            return () => {
                isActive = false;
            };
        }

        const requests = [...priceRequests, ...forexRequests];
        if (!requests.length) {
            return () => {
                isActive = false;
            };
        }

        const fetchPrices = async () => {
            setIsLoading(true);
            try {
                const batch = await getPricesBatch(requests);
                if (!isActive) return;
                const nextPriceMap = new Map<string, number>();
                const nextForexMap = new Map<string, number>();
                batch.results.forEach(({ request, value }) => {
                    if (!value) return;
                    if (request.type === "forex") {
                        const currency = request.ticker.slice(0, 3);
                        nextForexMap.set(
                            makeForexKey(currency, request.date ?? value.date),
                            value.close
                        );
                    } else {
                        nextPriceMap.set(
                            makePriceKey(
                                request.type,
                                normalizeTicker(request.ticker),
                                request.date ?? value.date
                            ),
                            value.close
                        );
                    }
                });
                setPriceMap(nextPriceMap);
                setForexMap(nextForexMap);
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        fetchPrices();

        return () => {
            isActive = false;
        };
    }, [dates, forexRequests, priceRequests]);

    const data = useMemo(() => {
        const getAssetPrice = (assetId: string, date: string) => {
            const asset = assets[assetId];
            if (!asset) return null;
            const request = getAssetPriceRequest(asset);
            if (!request) return null;
            const key = makePriceKey(
                request.type,
                normalizeTicker(request.ticker),
                date
            );
            const price = priceMap.get(key);
            return price ?? null;
        };

        const getForexRate = (currency: string, date: string) => {
            if (currency === baseCurrency) return 1;
            const rate = forexMap.get(makeForexKey(currency, date));
            return rate ?? null;
        };

        return buildNetWorthHistory({
            transactions: sortedTransactions,
            forexRates: {},
            baseCurrency,
            locale,
            assetFilter,
            includeCash,
            includeDeposits,
            includeWithdrawals,
            includeDividends,
            includeForex,
            assetMetadata,
            getAssetPrice,
            getForexRate,
            snapshotDates: dates,
        });
    }, [
        assetFilter,
        assetMetadata,
        assets,
        baseCurrency,
        dates,
        forexMap,
        includeCash,
        includeDeposits,
        includeDividends,
        includeForex,
        includeWithdrawals,
        locale,
        priceMap,
        sortedTransactions,
    ]);

    return { data, isLoading };
};
