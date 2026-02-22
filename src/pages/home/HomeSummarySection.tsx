import React, { useMemo } from "react";
import { Card } from "../../ui/Card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { NetWorthHistoryChart } from "../../components/NetWorthHistoryChart";
import {
    selectAssets,
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
import { useNetWorthHistory } from "../../hooks/useNetWorthHistory";
import {
    calculatePositionCostBasis,
    calculateRealizedPnl,
    getNetWorth,
    getPnL,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
    toVisualValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";
import { getWalletTxCurrencies } from "../../utils/netWorthHistory";

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

const shiftDate = (baseDate: Date, days = 0, months = 0) => {
    const shifted = new Date(baseDate);
    if (months !== 0) {
        shifted.setMonth(shifted.getMonth() + months);
    }
    if (days !== 0) {
        shifted.setDate(shifted.getDate() + days);
    }
    return shifted;
};

export const HomeSummarySection: React.FC = () => {
    const wallets = useAppSelector(selectWallets);
    const walletPositions = useAppSelector(selectWalletPositionsState);
    const assets = useAppSelector(selectAssets);
    const walletTxState = useAppSelector(selectWalletTxState);
    const settings = useAppSelector(selectSettings);
    const walletTx = useAppSelector(selectWalletTxState);

    const walletList = useMemo(() => Object.values(wallets), [wallets]);

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
        () => Object.values(walletTxState),
        [walletTxState]
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

    const totals = useMemo(() => {
        const costBasisByAsset = calculatePositionCostBasis(
            walletTransactions,
            settings.visualCurrency,
            forexRates
        );
        const holdingValues = positions.map(({ assetId, position }) => {
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
                currentValueVisual: toVisualValue(
                    currentValue,
                    tradingCurrency,
                    settings.visualCurrency,
                    forexRates
                ),
                investedValueVisual: investedValue,
            };
        });

        const totalInvested = getTotalValue(
            holdingValues.map((summary) => summary.investedValueVisual)
        );
        const totalCurrent = getTotalValue(
            holdingValues.map((summary) => summary.currentValueVisual)
        );
        const pnl = getPnL(totalCurrent, totalInvested);
        const realizedPnl = calculateRealizedPnl(
            Object.values(walletTx),
            settings.visualCurrency,
            forexRates,
            getForexRate
        );
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
            netWorth: getNetWorth(totalCurrent, cashTotal),
            pnl,
            realizedPnl,
        };
    }, [
        assets,
        cashBuckets,
        forexRates,
        getForexRate,
        livePricesByAsset,
        positions,
        settings.visualCurrency,
        walletTx,
        walletTransactions,
    ]);

    const totalUnrealizedPnl = useMemo(() => {
        return walletList.reduce((total, wallet) => {
            const positions = walletPositions[wallet.id] ?? {};
            const walletTransactionsForWallet = walletTransactions.filter(
                (tx) => tx.walletId === wallet.id
            );
            const costBasisByAsset = calculatePositionCostBasis(
                walletTransactionsForWallet,
                settings.visualCurrency,
                forexRates
            );
            const positionRows = Object.entries(positions).map(
                ([assetId, position]) => {
                    const asset = assets[assetId];
                    const costAverage = position.avgCost.value;
                    const currentPrice =
                        livePricesByAsset[assetId] ?? costAverage;
                    const currentValue = getPositionCurrentValue(
                        position.amount,
                        currentPrice
                    );
                    const tradingCurrency =
                        asset?.tradingCurrency ?? position.avgCost.currency;
                    const currentValueVisual = toVisualValue(
                        currentValue,
                        tradingCurrency,
                        settings.visualCurrency,
                        forexRates
                    );
                    const investedValueVisual =
                        costBasisByAsset.get(assetId)?.costBasisVisual ??
                        toVisualValue(
                            getPositionInvestedValue(
                                position.amount,
                                costAverage
                            ),
                            tradingCurrency,
                            settings.visualCurrency,
                            forexRates
                        );
                    return {
                        currentValue: currentValueVisual,
                        investedValue: investedValueVisual,
                    };
                }
            );
            const invested = getTotalValue(
                positionRows.map((row) => row.investedValue)
            );
            const current = getTotalValue(
                positionRows.map((row) => row.currentValue)
            );
            return total + getPnL(current, invested);
        }, 0);
    }, [
        assets,
        forexRates,
        livePricesByAsset,
        settings.visualCurrency,
        walletList,
        walletPositions,
        walletTransactions,
    ]);

    const pnlIsPositive = totalUnrealizedPnl >= 0;

    const netWorthComparisonDates = useMemo(() => {
        const now = new Date();
        return [
            { label: "24h", date: formatDateKey(shiftDate(now, -1)) },
            { label: "7d", date: formatDateKey(shiftDate(now, -7)) },
            { label: "1mo", date: formatDateKey(shiftDate(now, 0, -1)) },
            { label: "6mo", date: formatDateKey(shiftDate(now, 0, -6)) },
            { label: "12mo", date: formatDateKey(shiftDate(now, 0, -12)) },
        ];
    }, []);

    const { data: netWorthSnapshots } = useNetWorthHistory({
        transactions: walletTransactions,
        assets,
        baseCurrency: settings.visualCurrency,
        locale: settings.locale,
        snapshotDates: netWorthComparisonDates.map((item) => item.date),
    });

    const netWorthComparisons = useMemo(() => {
        const snapshotMap = new Map(
            netWorthSnapshots.map((snapshot) => [snapshot.date, snapshot.value])
        );

        return netWorthComparisonDates.map(({ label, date }) => {
            const previousValue = snapshotMap.get(date);
            if (previousValue === undefined || previousValue <= 0) {
                return {
                    label,
                    hasValue: false,
                    percent: 0,
                };
            }

            return {
                label,
                hasValue: true,
                percent:
                    ((totals.netWorth - previousValue) / previousValue) * 100,
            };
        });
    }, [netWorthComparisonDates, netWorthSnapshots, totals.netWorth]);

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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                        {netWorthComparisons.map((comparison) => {
                            const comparisonPositive = comparison.percent >= 0;
                            return (
                                <div
                                    key={comparison.label}
                                    className={`flex items-center justify-between text-xs font-medium px-2 py-1 rounded-full ${
                                        comparison.hasValue
                                            ? comparisonPositive
                                                ? "text-app-success bg-emerald-500/10"
                                                : "text-app-danger bg-rose-500/10"
                                            : "text-app-muted bg-app-surface"
                                    }`}
                                >
                                    <span>{comparison.label}</span>
                                    {comparison.hasValue ? (
                                        <span className="flex items-center gap-1">
                                            {comparisonPositive ? (
                                                <ArrowUpRight size={12} />
                                            ) : (
                                                <ArrowDownRight size={12} />
                                            )}
                                            {comparisonPositive ? "+" : ""}
                                            {comparison.percent.toFixed(2)}%
                                        </span>
                                    ) : (
                                        <span>n/a</span>
                                    )}
                                </div>
                            );
                        })}
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
                                    totalUnrealizedPnl,
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
                                    Realized PnL (All-time)
                                </p>
                            </div>
                            <p
                                className={`text-xl font-bold ${
                                    totals.realizedPnl >= 0
                                        ? "text-app-success"
                                        : "text-app-danger"
                                }`}
                            >
                                {totals.realizedPnl >= 0 ? "+" : ""}
                                {formatCurrency(
                                    totals.realizedPnl,
                                    settings.visualCurrency
                                )}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card title="Net Worth Growth">
                {walletTransactions.length > 0 ? (
                    <NetWorthHistoryChart
                        transactions={walletTransactions}
                        assets={assets}
                        baseCurrency={settings.visualCurrency}
                        height={200}
                        color="#10b981"
                        currency={settings.visualCurrency}
                        locale={settings.locale}
                    />
                ) : (
                    <p className="text-sm text-app-muted">
                        Add transactions to see net worth history.
                    </p>
                )}
            </Card>
        </div>
    );
};
