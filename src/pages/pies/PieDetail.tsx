import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    PieChart as PieIcon,
    Menu,
} from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PieChart } from "../../components/PieChart";
import { HoldingsTable, HoldingRow } from "../../components/HoldingsTable";
import { SyncStatusPills } from "../../components/SyncStatusPills";
import { ThemeToggle } from "../../components/ThemeToggle";
import { usePieData } from "../../hooks/usePieData";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useAppSelector } from "../../store/hooks";
import { selectSettings, selectWalletTxState } from "../../store/selectors";
import { formatCurrency } from "../../utils/formatters";
import {
    getAllocationPercent,
    calculateRealizedPnl,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
} from "../../core/finance";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";

interface Props {
    onMenuClick: () => void;
}

export const PieDetail: React.FC<Props> = ({ onMenuClick }) => {
    const { id } = useParams();
    const { pie, assets } = usePieData(id);
    const settings = useAppSelector(selectSettings);
    const walletTx = useAppSelector(selectWalletTxState);

    const livePricesByAsset = useAssetLivePrices(assets);
    const transactionCurrencies = useMemo(() => {
        const currencies = new Set<string>();
        Object.values(walletTx).forEach((tx) => {
            if (tx.pieId !== id) return;
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
    }, [id, walletTx]);

    const forexRates = useForexLivePrices(
        transactionCurrencies,
        settings.balanceCurrency
    );

    const { holdings, totals } = useMemo(() => {
        const rows = assets.map((asset) => {
            const costAverage = asset.avgCost.value;
            const currentPrice = livePricesByAsset[asset.id] ?? costAverage;
            const value = getPositionCurrentValue(asset.amount, currentPrice);
            const investedValue = getPositionInvestedValue(
                asset.amount,
                costAverage
            );
            const pnl = getPnL(value, investedValue);
            const pnlPercent = getPnLPercent(value, investedValue);

            return {
                row: {
                    asset: asset.name,
                    ticker: asset.ticker,
                    units: asset.amount,
                    costAverage,
                    currentPrice,
                    value,
                    pnl,
                    pnlPercent: Number(pnlPercent.toFixed(2)),
                    currency: asset.tradingCurrency,
                },
                investedValue,
            };
        });

        const totalValue = getTotalValue(rows.map((item) => item.row.value));
        const totalInvested = getTotalValue(
            rows.map((item) => item.investedValue)
        );
        const totalPnL = getTotalValue(rows.map((item) => item.row.pnl));

        return {
            holdings: rows.map(({ row }) => ({
                ...row,
                allocation: Number(
                    getAllocationPercent(row.value, totalValue).toFixed(2)
                ),
            })),
            totals: {
                currentValue: totalValue,
                invested: totalInvested,
                pnl: totalPnL,
            },
        };
    }, [assets, livePricesByAsset]);
    const realizedPnl = useMemo(
        () =>
            calculateRealizedPnl(
                Object.values(walletTx).filter((tx) => tx.pieId === id),
                settings.balanceCurrency,
                forexRates
            ),
        [forexRates, id, settings.balanceCurrency, walletTx]
    );
    const unrealizedIsPositive = totals.pnl >= 0;
    const realizedIsPositive = realizedPnl >= 0;

    const allocation = useMemo(() => {
        const colors = [
            "#6366f1",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#14b8a6",
        ];

        return holdings
            .map((holding, index) => ({
                name: holding.ticker,
                value: holding.value,
                color: colors[index % colors.length],
            }))
            .filter((entry) => entry.value > 0);
    }, [holdings]);

    const riskValue = pie?.risk ?? 0;
    const formattedName = pie?.name ?? "Pie";
    const description = pie?.description || "No description added yet.";

    return (
        <div className="pb-20">
            <header className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/pies"
                            className="p-2 -ml-2 text-app-muted hover:text-app-foreground rounded-lg hover:bg-app-surface transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-app-foreground flex items-center gap-3">
                            <span>{formattedName}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-app-surface border border-app-border text-app-muted">
                                <PieIcon size={14} />{" "}
                                {pie?.risk ? `Risk ${pie.risk}/5` : "Risk N/A"}
                            </span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onMenuClick}
                            className="lg:hidden p-2 text-app-muted hover:text-app-foreground rounded-lg hover:bg-app-surface transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <SyncStatusPills />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Current Value
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(
                                totals.currentValue,
                                settings.balanceCurrency
                            )}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Assets
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {assets.length}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Invested
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(
                                totals.invested,
                                settings.balanceCurrency
                            )}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            PnL
                        </p>
                        <div className="mt-2 space-y-2">
                            <div
                                className={`flex items-center gap-2 ${
                                    unrealizedIsPositive
                                        ? "text-app-success"
                                        : "text-app-danger"
                                }`}
                            >
                                {unrealizedIsPositive ? (
                                    <ArrowUpRight size={18} />
                                ) : (
                                    <ArrowDownLeft size={18} />
                                )}
                                <span className="text-lg font-bold">
                                    Unrealized{" "}
                                    {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        totals.pnl,
                                        settings.balanceCurrency
                                    )}
                                </span>
                            </div>
                            <div
                                className={`flex items-center gap-2 ${
                                    realizedIsPositive
                                        ? "text-app-success"
                                        : "text-app-danger"
                                }`}
                            >
                                {realizedIsPositive ? (
                                    <ArrowUpRight size={18} />
                                ) : (
                                    <ArrowDownLeft size={18} />
                                )}
                                <span className="text-lg font-bold">
                                    Realized{" "}
                                    {realizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        realizedPnl,
                                        settings.balanceCurrency
                                    )}
                                </span>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Risk Score
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-semibold text-app-foreground">
                                {pie?.risk ? `${pie.risk}/5` : "N/A"}
                            </span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                        key={level}
                                        className={`w-1 h-3 rounded-full ${
                                            level <= riskValue
                                                ? "bg-app-primary"
                                                : "bg-app-border"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="p-4">
                    <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                        Description
                    </p>
                    <p className="text-sm text-app-foreground mt-1">
                        {description}
                    </p>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Allocation" className="lg:col-span-1">
                        {allocation.length > 0 ? (
                            <PieChart data={allocation} height={250} />
                        ) : (
                            <p className="text-sm text-app-muted">
                                Add assets to see allocation breakdowns.
                            </p>
                        )}
                    </Card>
                </div>

                <Card title="Holdings">
                    {holdings.length > 0 ? (
                        <HoldingsTable holdings={holdings} />
                    ) : (
                        <p className="text-sm text-app-muted">
                            No assets added to this pie yet.
                        </p>
                    )}
                </Card>
            </main>
        </div>
    );
};
