import React, { useMemo } from "react";
import { Card } from "../../ui/Card";
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { AreaChart } from "../../components/AreaChart";
import { NetWorthSummaryCard } from "../../components/NetWorthSummaryCard";
import {
    selectAssets,
    selectSettings,
    selectWalletPositionsState,
    selectWallets,
} from "../../store/selectors";
import { useAppSelector } from "../../store/hooks";
import { Asset } from "../../core/schema-types";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import {
    getConvertedValue,
    getNetWorth,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";

const mockChartData = [
    { name: "Jan", value: 105000 },
    { name: "Feb", value: 108000 },
    { name: "Mar", value: 106000 },
    { name: "Apr", value: 112000 },
    { name: "May", value: 118000 },
    { name: "Jun", value: 124500 },
];

export const HomeSummarySection: React.FC = () => {
    const wallets = useAppSelector(selectWallets);
    const walletPositions = useAppSelector(selectWalletPositionsState);
    const assets = useAppSelector(selectAssets);
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
        positionAssets.forEach((asset) =>
            currencies.add(asset.tradingCurrency)
        );
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

    const totals = useMemo(() => {
        const holdingValues = positions.map(({ assetId, position }) => {
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

        const totalInvested = getTotalValue(
            holdingValues.map((summary) => summary.investedValueVisual)
        );
        const totalCurrent = getTotalValue(
            holdingValues.map((summary) => summary.currentValueVisual)
        );
        const pnl = getPnL(totalCurrent, totalInvested);
        const pnlPercent = getPnLPercent(totalCurrent, totalInvested);
        const cashTotal = getTotalValue(
            cashBuckets.map((bucket) =>
                toVisualValue(bucket.value, bucket.currency)
            )
        );

        return {
            netWorth: getNetWorth(totalCurrent, cashTotal),
            pnl,
            pnlPercent,
        };
    }, [
        assets,
        cashBuckets,
        livePricesByAsset,
        positions,
        settings.visualCurrency,
        forexRates,
    ]);

    const pnlIsPositive = totals.pnl >= 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
                <Card className="md:col-span-1">
                    <p className="text-app-muted text-sm font-medium mb-1">
                        Total Net Worth
                    </p>
                    <h2 className="text-4xl font-bold text-app-foreground tracking-tight mb-2">
                        {formatCurrency(
                            totals.netWorth,
                            settings.visualCurrency
                        )}
                    </h2>
                    <div
                        className={`flex items-center gap-1 text-sm font-medium w-fit px-2 py-1 rounded-full mb-4 ${
                            pnlIsPositive
                                ? "text-app-success bg-emerald-500/10"
                                : "text-app-danger bg-rose-500/10"
                        }`}
                    >
                        {pnlIsPositive ? (
                            <ArrowUpRight size={14} />
                        ) : (
                            <ArrowDownRight size={14} />
                        )}
                        <span>
                            {pnlIsPositive ? "+" : ""}
                            {totals.pnlPercent.toFixed(2)}% vs cost
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div
                                    className={`p-1.5 rounded-lg ${
                                        pnlIsPositive
                                            ? "bg-emerald-500/10 text-app-success"
                                            : "bg-rose-500/10 text-app-danger"
                                    }`}
                                >
                                    {pnlIsPositive ? (
                                        <ArrowUpRight size={16} />
                                    ) : (
                                        <ArrowDownRight size={16} />
                                    )}
                                </div>
                                <p className="text-app-muted text-xs font-medium">
                                    Unrealized PnL
                                </p>
                            </div>
                            <p
                                className={`text-xl font-bold ${
                                    pnlIsPositive
                                        ? "text-app-success"
                                        : "text-app-danger"
                                }`}
                            >
                                {pnlIsPositive ? "+" : ""}
                                {formatCurrency(
                                    totals.pnl,
                                    settings.visualCurrency
                                )}
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-app-border/40 rounded-lg text-app-muted">
                                    <ArrowDownRight size={16} />
                                </div>
                                <p className="text-app-muted text-xs font-medium">
                                    Realized PnL (YTD)
                                </p>
                            </div>
                            <p className="text-xl font-bold text-app-muted">
                                {formatCurrency(0, settings.visualCurrency)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card title="Net Worth Growth">
                <AreaChart
                    data={mockChartData}
                    dataKey="value"
                    height={200}
                    color="#10b981"
                />
            </Card>
        </div>
    );
};
