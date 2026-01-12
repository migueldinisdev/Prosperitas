import React, { useMemo } from "react";
import { Card } from "../../ui/Card";
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { AreaChart } from "../../components/AreaChart";
import { NetWorthSummaryCard } from "../../components/NetWorthSummaryCard";
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
import {
    buildNetWorthHistory,
    getWalletTxCurrencies,
} from "../../utils/netWorthHistory";
import {
    getConvertedValue,
    getNetWorth,
    calculateRealizedPnl,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";

export const HomeSummarySection: React.FC = () => {
    const wallets = useAppSelector(selectWallets);
    const walletPositions = useAppSelector(selectWalletPositionsState);
    const assets = useAppSelector(selectAssets);
    const walletTxState = useAppSelector(selectWalletTxState);
    const settings = useAppSelector(selectSettings);
    const walletTx = useAppSelector(selectWalletTxState);

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
        Object.values(walletTx).forEach((tx) => {
            switch (tx.type) {
                case "deposit":
                case "withdraw":
                case "dividend":
                    currencies.add(tx.amount.currency);
                    break;
                case "forex":
                    currencies.add(tx.from.currency);
                    currencies.add(tx.to.currency);
                    if (tx.fees) currencies.add(tx.fees.currency);
                    break;
                case "buy":
                case "sell":
                    currencies.add(tx.price.currency);
                    if (tx.fees) currencies.add(tx.fees.currency);
                    break;
            }
        });
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
    const historyCurrencies = useMemo(
        () => getWalletTxCurrencies(walletTransactions),
        [walletTransactions]
    );
    const historyForexRates = useForexLivePrices(
        historyCurrencies,
        settings.visualCurrency
    );
    const netWorthHistory = useMemo(
        () =>
            buildNetWorthHistory({
                transactions: walletTransactions,
                forexRates: historyForexRates,
                baseCurrency: settings.visualCurrency,
                locale: settings.locale,
            }),
        [
            historyForexRates,
            settings.locale,
            settings.visualCurrency,
            walletTransactions,
        ]
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
        const realizedPnl = calculateRealizedPnl(
            Object.values(walletTx),
            settings.visualCurrency,
            forexRates
        );
        const cashTotal = getTotalValue(
            cashBuckets.map((bucket) =>
                toVisualValue(bucket.value, bucket.currency)
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
        livePricesByAsset,
        positions,
        settings.visualCurrency,
        forexRates,
        walletTx,
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
                {netWorthHistory.length > 0 ? (
                    <AreaChart
                        data={netWorthHistory}
                        dataKey="value"
                        height={200}
                        color="#10b981"
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
