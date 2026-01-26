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
import {
    calculatePositionCostBasis,
    calculateRealizedPnl,
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
        const pnlPercent = getPnLPercent(totalCurrent, totalInvested);
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
            pnlPercent,
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
