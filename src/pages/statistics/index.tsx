import React, { useMemo } from "react";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../ui/Card";
import { PieChart } from "../../components/PieChart";
import {
    selectAssets,
    selectPies,
    selectSettings,
    selectWalletPositionsState,
    selectWalletTxState,
    selectWallets,
} from "../../store/selectors";
import { useAppSelector } from "../../store/hooks";
import { Asset } from "../../core/schema-types";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import { useForexHistoricalRates } from "../../hooks/useForexHistoricalRates";
import {
    calculatePositionCostBasis,
    calculateRealizedPnl,
    getAllocationPercent,
    getNetWorth,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
    toVisualValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";
import { getWalletTxCurrencies } from "../../utils/netWorthHistory";

const assetTypeColors: Record<string, string> = {
    stock: "#d61544",
    etf: "#f97316",
    crypto: "#f59e0b",
    bond: "#8b5cf6",
    cash: "#10b981",
    other: "#6366f1",
};

const currencyPalette = ["#0ea5e9", "#22c55e", "#6366f1", "#f43f5e", "#14b8a6"];
const piePalette = [
    "#3b82f6",
    "#f97316",
    "#22c55e",
    "#a855f7",
    "#f43f5e",
    "#14b8a6",
];

interface Props {
    onMenuClick: () => void;
}

export const StatisticsPage: React.FC<Props> = ({ onMenuClick }) => {
    const wallets = useAppSelector(selectWallets);
    const walletPositions = useAppSelector(selectWalletPositionsState);
    const assets = useAppSelector(selectAssets);
    const pies = useAppSelector(selectPies);
    const settings = useAppSelector(selectSettings);
    const walletTx = useAppSelector(selectWalletTxState);

    const positions = useMemo(
        () =>
            Object.entries(walletPositions).flatMap(([, positionsByAsset]) =>
                Object.entries(positionsByAsset).map(
                    ([assetId, position]) => ({
                        assetId,
                        position,
                    })
                )
            ),
        [walletPositions]
    );

    const positionAssets = useMemo(
        () =>
            positions
                .map(({ assetId }) => assets[assetId])
                .filter((asset): asset is Asset => Boolean(asset)),
        [assets, positions]
    );

    const livePricesByAsset = useAssetLivePrices(positionAssets);

    const cashBuckets = useMemo(
        () =>
            Object.values(wallets).flatMap((wallet) => {
                if (Array.isArray(wallet.cash)) {
                    return wallet.cash;
                }
                return Object.entries(wallet.cash ?? {}).map(
                    ([currency, value]) => ({
                        currency,
                        value: Number(value),
                    })
                );
            }),
        [wallets]
    );

    const forexCurrencies = useMemo(() => {
        const currencies = new Set<string>(getWalletTxCurrencies(walletTx));
        positionAssets.forEach((asset) =>
            currencies.add(asset.tradingCurrency)
        );
        cashBuckets.forEach((bucket) => currencies.add(bucket.currency));
        return Array.from(currencies);
    }, [cashBuckets, positionAssets, walletTx]);

    const forexRates = useForexLivePrices(
        forexCurrencies,
        settings.visualCurrency
    );

    const walletTransactions = useMemo(
        () => Object.values(walletTx),
        [walletTx]
    );

    const transactionDates = useMemo(
        () => walletTransactions.map((tx) => tx.date),
        [walletTransactions]
    );

    const { getForexRate } = useForexHistoricalRates(
        forexCurrencies,
        transactionDates,
        settings.visualCurrency
    );

    const holdingSummaries = useMemo(() => {
        const costBasisByAsset = calculatePositionCostBasis(
            walletTransactions,
            settings.visualCurrency,
            forexRates
        );
        return positions.map(({ assetId, position }) => {
            const asset = assets[assetId];
            const costAverage = position.avgCost.value;
            const currentPrice = livePricesByAsset[assetId] ?? costAverage;
            const currentValue = getPositionCurrentValue(
                position.amount,
                currentPrice
            );
            const tradingCurrency = asset?.tradingCurrency ?? "USD";
            const investedValue =
                costBasisByAsset.get(assetId)?.costBasisVisual ??
                toVisualValue(
                    getPositionInvestedValue(position.amount, costAverage),
                    tradingCurrency,
                    settings.visualCurrency,
                    forexRates
                );
            return {
                assetId,
                name: asset?.name ?? assetId,
                ticker: asset?.ticker ?? assetId,
                assetType: asset?.assetType ?? "other",
                tradingCurrency,
                currentValue,
                investedValue,
                currentValueVisual: toVisualValue(
                    currentValue,
                    tradingCurrency,
                    settings.visualCurrency,
                    forexRates
                ),
                investedValueVisual: investedValue,
            };
        });
    }, [
        assets,
        settings.visualCurrency,
        forexRates,
        getForexRate,
        livePricesByAsset,
        positions,
        walletTransactions,
    ]);

    const totals = useMemo(() => {
        const totalInvested = getTotalValue(
            holdingSummaries.map((summary) => summary.investedValueVisual)
        );
        const totalCurrent = getTotalValue(
            holdingSummaries.map((summary) => summary.currentValueVisual)
        );
        const totalPnL = getPnL(totalCurrent, totalInvested);
        const totalPnLPercent = getPnLPercent(totalCurrent, totalInvested);
        const cashTotal = getTotalValue(
            cashBuckets.map((bucket) =>
                toVisualValue(
                    bucket.value,
                    bucket.currency,
                    settings.visualCurrency,
                    forexRates
                )
            )
        );

        return {
            invested: totalInvested,
            current: totalCurrent,
            pnl: totalPnL,
            pnlPercent: totalPnLPercent,
            cash: cashTotal,
            netWorth: getNetWorth(totalCurrent, cashTotal),
        };
    }, [cashBuckets, holdingSummaries, forexRates, settings.visualCurrency]);
    const realizedPnl = useMemo(
        () =>
            calculateRealizedPnl(
                walletTransactions,
                settings.visualCurrency,
                forexRates,
                getForexRate
            ),
        [forexRates, getForexRate, settings.visualCurrency, walletTransactions]
    );
    const totalPnl = totals.pnl + realizedPnl;
    const unrealizedIsPositive = totals.pnl >= 0;
    const realizedIsPositive = realizedPnl >= 0;
    const totalIsPositive = totalPnl >= 0;

    const assetTypeData = useMemo(() => {
        const totalsByType = holdingSummaries.reduce<Record<string, number>>(
            (acc, summary) => {
                acc[summary.assetType] =
                    (acc[summary.assetType] ?? 0) + summary.currentValueVisual;
                return acc;
            },
            {}
        );

        const cashTotal = cashBuckets.reduce((sum, bucket) => {
            return (
                sum +
                toVisualValue(
                    bucket.value,
                    bucket.currency,
                    settings.visualCurrency,
                    forexRates
                )
            );
        }, 0);

        if (cashTotal > 0) {
            totalsByType.cash = (totalsByType.cash ?? 0) + cashTotal;
        }

        const totalValue = getTotalValue(Object.values(totalsByType));

        return Object.entries(totalsByType)
            .map(([type, value]) => ({
                name: type.toUpperCase(),
                value: Number(
                    getAllocationPercent(value, totalValue).toFixed(2)
                ),
                color: assetTypeColors[type] ?? "#94a3b8",
            }))
            .filter((entry) => entry.value > 0);
    }, [cashBuckets, forexRates, holdingSummaries, settings.visualCurrency]);

    const currencyData = useMemo(() => {
        const totalsByCurrency = new Map<string, number>();
        holdingSummaries.forEach((summary) => {
            const current = totalsByCurrency.get(summary.tradingCurrency) ?? 0;
            totalsByCurrency.set(
                summary.tradingCurrency,
                current + summary.currentValueVisual
            );
        });
        cashBuckets.forEach((bucket) => {
            const current = totalsByCurrency.get(bucket.currency) ?? 0;
            totalsByCurrency.set(
                bucket.currency,
                current +
                    toVisualValue(
                        bucket.value,
                        bucket.currency,
                        settings.visualCurrency,
                        forexRates
                    )
            );
        });
        const totalValue = getTotalValue(Array.from(totalsByCurrency.values()));

        return Array.from(totalsByCurrency.entries())
            .map(([currency, value], index) => ({
                name: currency,
                value: Number(
                    getAllocationPercent(value, totalValue).toFixed(2)
                ),
                color: currencyPalette[index % currencyPalette.length],
            }))
            .filter((entry) => entry.value > 0);
    }, [cashBuckets, holdingSummaries, forexRates, settings.visualCurrency]);

    const riskData = useMemo(() => {
        const buckets = {
            low: 0,
            medium: 0,
            high: 0,
        };

        Object.values(pies).forEach((pie) => {
            const risk = pie.risk ?? 0;
            const pieValue = pie.assetIds.reduce((sum, assetId) => {
                const holding = holdingSummaries.find(
                    (summary) => summary.assetId === assetId
                );
                return sum + (holding?.currentValueVisual ?? 0);
            }, 0);

            if (risk <= 2) buckets.low += pieValue;
            else if (risk === 3) buckets.medium += pieValue;
            else buckets.high += pieValue;
        });

        const totalValue = buckets.low + buckets.medium + buckets.high;

        return [
            {
                name: "Low (1-2)",
                value: Number(
                    getAllocationPercent(buckets.low, totalValue).toFixed(2)
                ),
                color: "#10b981",
            },
            {
                name: "Medium (3)",
                value: Number(
                    getAllocationPercent(buckets.medium, totalValue).toFixed(2)
                ),
                color: "#f59e0b",
            },
            {
                name: "High (4-5)",
                value: Number(
                    getAllocationPercent(buckets.high, totalValue).toFixed(2)
                ),
                color: "#ef4444",
            },
        ].filter((entry) => entry.value > 0);
    }, [holdingSummaries, pies]);

    const pieAllocationData = useMemo(() => {
        const valueByAssetId = holdingSummaries.reduce<Map<string, number>>(
            (map, summary) => {
                map.set(
                    summary.assetId,
                    (map.get(summary.assetId) ?? 0) +
                        summary.currentValueVisual
                );
                return map;
            },
            new Map()
        );
        const pieTotals = Object.values(pies).map((pie) => {
            const pieValue = pie.assetIds.reduce((sum, assetId) => {
                return sum + (valueByAssetId.get(assetId) ?? 0);
            }, 0);
            return { id: pie.id, name: pie.name, value: pieValue };
        });

        const totalValue = getTotalValue(
            pieTotals.map((pie) => pie.value)
        );

        return pieTotals
            .map((pie, index) => ({
                name: pie.name,
                value: Number(
                    getAllocationPercent(pie.value, totalValue).toFixed(2)
                ),
                color: piePalette[index % piePalette.length],
            }))
            .filter((entry) => entry.value > 0);
    }, [holdingSummaries, pies]);

    const topHoldings = useMemo(() => {
        const totalValue = getTotalValue(
            holdingSummaries.map((summary) => summary.currentValueVisual)
        );
        return [...holdingSummaries]
            .sort((a, b) => b.currentValueVisual - a.currentValueVisual)
            .slice(0, 5)
            .map((summary) => ({
                name: `${summary.name} (${summary.ticker})`,
                value: Number(
                    getAllocationPercent(
                        summary.currentValueVisual,
                        totalValue
                    ).toFixed(2)
                ),
            }));
    }, [holdingSummaries]);

    return (
        <div className="pb-20">
            <PageHeader title="Statistics" onMenuClick={onMenuClick} />

            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Total Net Worth
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(totals.netWorth, settings.visualCurrency)}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-app-muted">
                            <p>
                                Assets {formatCurrency(totals.current, settings.visualCurrency)}
                            </p>
                            <p>
                                Cash {formatCurrency(totals.cash, settings.visualCurrency)}
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Open Positions
                        </p>
                        <div className="mt-2 space-y-2">
                            <p className="text-2xl font-bold text-app-foreground">
                                {formatCurrency(totals.current, settings.visualCurrency)}
                            </p>
                            <p className="text-sm text-app-muted">
                                Unrealized
                                <span
                                    className={`ml-2 font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(totals.pnl, settings.visualCurrency)}
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Cost Basis
                                <span className="ml-2 text-app-foreground font-semibold">
                                    {formatCurrency(totals.invested, settings.visualCurrency)}
                                </span>
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Performance
                        </p>
                        <div className="mt-2 space-y-2">
                            <p className="text-sm text-app-muted">
                                Unrealized
                                <span
                                    className={`ml-2 font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(totals.pnl, settings.visualCurrency)}
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Realized
                                <span
                                    className={`ml-2 font-semibold ${
                                        realizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {realizedIsPositive ? "+" : ""}
                                    {formatCurrency(realizedPnl, settings.visualCurrency)}
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Total
                                <span
                                    className={`ml-2 font-semibold ${
                                        totalIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {totalIsPositive ? "+" : ""}
                                    {formatCurrency(totalPnl, settings.visualCurrency)}
                                </span>
                            </p>
                        </div>
                    </Card>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Allocation by Asset Class">
                        <PieChart data={assetTypeData} height={300} />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {assetTypeData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Currency Exposure">
                        <PieChart data={currencyData} height={300} />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {currencyData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Allocation by Pie">
                        <PieChart data={pieAllocationData} height={300} />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {pieAllocationData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Risk Distribution">
                        <PieChart data={riskData} height={260} />
                        <div className="mt-4 grid gap-2">
                            {riskData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Top Holdings">
                        <div className="space-y-4">
                            {topHoldings.map((holding) => (
                                <div key={holding.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-app-foreground">
                                            {holding.name}
                                        </span>
                                        <span className="text-app-muted">
                                            {holding.value}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-app-border/60">
                                        <div
                                            className="h-2 rounded-full bg-app-accent"
                                            style={{
                                                width: `${holding.value}%`,
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Momentum & Costs">
                        <div className="mt-1 rounded-xl border border-app-border bg-app-bg/50 p-3 text-sm text-app-muted">
                            Keep this section for future trend/cost analytics.
                        </div>
                    </Card>
                </section>
            </main>
        </div>
    );
};
