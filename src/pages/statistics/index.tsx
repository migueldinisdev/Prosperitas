import React, { useMemo } from "react";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../ui/Card";
import { PieChart } from "../../components/PieChart";
import {
    selectAssets,
    selectPies,
    selectSettings,
    selectWalletPositionsState,
    selectWallets,
} from "../../store/selectors";
import { useAppSelector } from "../../store/hooks";
import { Asset } from "../../core/schema-types";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import {
    getAllocationPercent,
    getConvertedValue,
    getNetWorth,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";

const assetTypeColors: Record<string, string> = {
    stock: "#d61544",
    etf: "#f97316",
    crypto: "#f59e0b",
    bond: "#8b5cf6",
    cash: "#10b981",
    other: "#6366f1",
};

const currencyPalette = ["#0ea5e9", "#22c55e", "#6366f1", "#f43f5e", "#14b8a6"];

const momentumStats = [
    { label: "Best month", value: "April +4.1%" },
    { label: "Worst month", value: "September -2.3%" },
    { label: "Avg monthly flow", value: "+€1,120" },
    { label: "Fees paid YTD", value: "€320" },
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

    const positions = useMemo(
        () =>
            Object.entries(walletPositions).flatMap(([, positionsByAsset]) =>
                Object.entries(positionsByAsset)
                    .filter(([, position]) => position.amount > 0)
                    .map(([assetId, position]) => ({
                        assetId,
                        position,
                    }))
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
        const currencies = new Set<string>();
        positionAssets.forEach((asset) => currencies.add(asset.tradingCurrency));
        cashBuckets.forEach((bucket) => currencies.add(bucket.currency));
        return Array.from(currencies);
    }, [cashBuckets, positionAssets]);

    const forexRates = useForexLivePrices(
        forexCurrencies,
        settings.visualCurrency
    );

    const toVisualValue = (amount: number, currency: string) => {
        if (currency === settings.visualCurrency) {
            return amount;
        }
        const rate = forexRates[currency];
        if (!rate) return amount;
        return getConvertedValue(amount, rate);
    };

    const holdingSummaries = useMemo(() => {
        return positions.map(({ assetId, position }) => {
            const asset = assets[assetId];
            const costAverage = position.avgCost.value;
            const currentPrice = livePricesByAsset[assetId] ?? costAverage;
            const currentValue = getPositionCurrentValue(
                position.amount,
                currentPrice
            );
            const investedValue = getPositionInvestedValue(
                position.amount,
                costAverage
            );
            const tradingCurrency = asset?.tradingCurrency ?? "USD";
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
                    tradingCurrency
                ),
                investedValueVisual: toVisualValue(
                    investedValue,
                    tradingCurrency
                ),
            };
        });
    }, [assets, livePricesByAsset, positions, settings.visualCurrency, forexRates]);

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
                toVisualValue(bucket.value, bucket.currency)
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

    const summaryStats = [
        {
            label: "Total net worth",
            value: formatCurrency(totals.netWorth, settings.visualCurrency),
            change: `${totals.pnlPercent.toFixed(2)}% vs cost`,
            helper: "Holdings + cash",
        },
        {
            label: "Total invested",
            value: formatCurrency(totals.invested, settings.visualCurrency),
            change: `${totals.pnlPercent.toFixed(2)}% vs cost`,
            helper: `Across ${Object.keys(wallets).length} wallets`,
        },
        {
            label: "Current value",
            value: formatCurrency(totals.current, settings.visualCurrency),
            change: "Realtime valuation",
            helper: "Holdings only",
        },
        {
            label: "Total PnL",
            value: `${totals.pnl > 0 ? "+" : ""}${formatCurrency(
                totals.pnl,
                settings.visualCurrency
            )}`,
            change: `${totals.pnlPercent.toFixed(2)}% total`,
            helper: "Unrealized vs cost average",
        },
        {
            label: "Cash buffer",
            value: formatCurrency(totals.cash, settings.visualCurrency),
            change: `${getAllocationPercent(
                totals.cash,
                totals.current + totals.cash
            ).toFixed(2)}% of total`,
            helper: "Liquid reserves",
        },
    ];

    const assetTypeData = useMemo(() => {
        const totalValue = getTotalValue(
            holdingSummaries.map((summary) => summary.currentValueVisual)
        );
        const totalsByType = holdingSummaries.reduce<Record<string, number>>(
            (acc, summary) => {
                acc[summary.assetType] =
                    (acc[summary.assetType] ?? 0) + summary.currentValueVisual;
                return acc;
            },
            {}
        );

        return Object.entries(totalsByType)
            .map(([type, value]) => ({
                name: type.toUpperCase(),
                value: Number(
                    getAllocationPercent(value, totalValue).toFixed(2)
                ),
                color: assetTypeColors[type] ?? "#94a3b8",
            }))
            .filter((entry) => entry.value > 0);
    }, [holdingSummaries]);

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
                current + toVisualValue(bucket.value, bucket.currency)
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
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {summaryStats.map((stat) => (
                        <Card key={stat.label}>
                            <p className="text-xs uppercase tracking-wider text-app-muted font-semibold">
                                {stat.label}
                            </p>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-2xl font-semibold text-app-foreground">
                                    {stat.value}
                                </span>
                                <span className="text-xs text-app-success font-semibold">
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-xs text-app-muted mt-2">
                                {stat.helper}
                            </p>
                        </Card>
                    ))}
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="space-y-3">
                            {momentumStats.map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-app-muted">
                                        {item.label}
                                    </span>
                                    <span className="text-app-foreground font-semibold">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 rounded-xl border border-app-border bg-app-bg/50 p-3 text-xs text-app-muted">
                            Insight: Concentration risk is limited—top 5
                            holdings represent 72% of the portfolio while
                            cash-like assets cover 6 months of expenses.
                        </div>
                    </Card>
                </section>
            </main>
        </div>
    );
};
