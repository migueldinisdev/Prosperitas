import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    Pencil,
    PieChart as PieIcon,
    Menu,
} from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { NetWorthHistoryChart } from "../../components/NetWorthHistoryChart";
import { PieChart } from "../../components/PieChart";
import { HoldingsTable, HoldingRow } from "../../components/HoldingsTable";
import { SyncStatusPills } from "../../components/SyncStatusPills";
import { ThemeToggle } from "../../components/ThemeToggle";
import { usePieData } from "../../hooks/usePieData";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import { Modal } from "../../ui/Modal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updatePie } from "../../store/slices/piesSlice";
import {
    selectPies,
    selectSettings,
    selectWalletTxState,
} from "../../store/selectors";
import { formatCurrency } from "../../utils/formatters";
import {
    calculatePositionCostBasis,
    getAllocationPercent,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
    toVisualValue,
} from "../../core/finance";
import { getWalletTxCurrencies } from "../../utils/netWorthHistory";

interface Props {
    onMenuClick: () => void;
}

export const PieDetail: React.FC<Props> = ({ onMenuClick }) => {
    const { id } = useParams();
    const { pie, assets } = usePieData(id);
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectSettings);
    const walletTx = useAppSelector(selectWalletTxState);
    const pies = useAppSelector(selectPies);

    const [isEditOpen, setEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editRisk, setEditRisk] = useState("");

    useEffect(() => {
        if (!pie) return;
        setEditName(pie.name ?? "");
        setEditDescription(pie.description ?? "");
        setEditRisk(pie.risk ? String(pie.risk) : "");
    }, [pie]);

    const existingNamesLower = useMemo(
        () =>
            new Set(
                Object.values(pies).map((entry) =>
                    entry.name.trim().toLowerCase(),
                ),
            ),
        [pies],
    );
    const editNameTrimmed = editName.trim();
    const currentNameLower = pie?.name?.trim().toLowerCase() ?? "";
    const isDuplicateName =
        editNameTrimmed.length > 0 &&
        existingNamesLower.has(editNameTrimmed.toLowerCase()) &&
        editNameTrimmed.toLowerCase() !== currentNameLower;

    const handleEditSave = () => {
        if (!pie || !editNameTrimmed || isDuplicateName) return;
        const riskValue = editRisk ? Number(editRisk) : undefined;
        dispatch(
            updatePie({
                id: pie.id,
                changes: {
                    name: editNameTrimmed,
                    description: editDescription.trim() || undefined,
                    risk: Number.isFinite(riskValue) ? riskValue : undefined,
                },
            }),
        );
        setEditOpen(false);
    };

    const livePricesByAsset = useAssetLivePrices(assets);
    const transactionCurrencies = useMemo(() => {
        const filtered = Object.values(walletTx).filter(
            (tx) => tx.pieId === id,
        );
        const currencies = new Set<string>(getWalletTxCurrencies(filtered));
        assets.forEach((asset) => currencies.add(asset.tradingCurrency));
        return Array.from(currencies);
    }, [assets, id, walletTx]);

    const forexRates = useForexLivePrices(
        transactionCurrencies,
        settings.visualCurrency,
    );

    const pieAssetIds = useMemo(
        () => new Set(pie?.assetIds ?? []),
        [pie?.assetIds],
    );
    const pieTransactions = useMemo(() => {
        if (pieAssetIds.size === 0) return [];
        return Object.values(walletTx).filter((tx) => {
            if (!("assetId" in tx) || !tx.assetId) return false;
            return pieAssetIds.has(tx.assetId);
        });
    }, [pieAssetIds, walletTx]);

    const { holdings, totals } = useMemo(() => {
        const costBasisByAsset = calculatePositionCostBasis(
            pieTransactions,
            settings.visualCurrency,
            forexRates,
        );
        const rows = assets.map((asset) => {
            const costAverage = asset.avgCost.value;
            const currentPrice = livePricesByAsset[asset.id] ?? costAverage;
            const value = getPositionCurrentValue(asset.amount, currentPrice);
            const valueVisual = toVisualValue(
                value,
                asset.tradingCurrency,
                settings.visualCurrency,
                forexRates,
            );
            const investedValue =
                costBasisByAsset.get(asset.id)?.costBasisVisual ??
                toVisualValue(
                    getPositionInvestedValue(asset.amount, costAverage),
                    asset.tradingCurrency,
                    settings.visualCurrency,
                    forexRates,
                );
            const pnl = getPnL(valueVisual, investedValue);
            const pnlPercent = getPnLPercent(valueVisual, investedValue);
            const costAverageVisual =
                asset.amount > 0 ? investedValue / asset.amount : 0;
            const currentPriceVisual = toVisualValue(
                currentPrice,
                asset.tradingCurrency,
                settings.visualCurrency,
                forexRates,
            );

            return {
                row: {
                    assetId: asset.id,
                    asset: asset.name,
                    ticker: asset.ticker,
                    units: asset.amount,
                    costAverage: costAverageVisual,
                    costCurrency: settings.visualCurrency,
                    currentPrice: currentPriceVisual,
                    currentPriceCurrency: settings.visualCurrency,
                    value: valueVisual,
                    valueCurrency: settings.visualCurrency,
                    pnl,
                    pnlCurrency: settings.visualCurrency,
                    pnlPercent: Number(pnlPercent.toFixed(2)),
                    currency: settings.visualCurrency,
                },
                investedValue,
            };
        });

        const totalValue = getTotalValue(rows.map((item) => item.row.value));
        const totalInvested = getTotalValue(
            rows.map((item) => item.investedValue),
        );
        const totalPnL = getTotalValue(rows.map((item) => item.row.pnl));

        return {
            holdings: rows.map(({ row }) => ({
                ...row,
                allocation: Number(
                    getAllocationPercent(row.value, totalValue).toFixed(2),
                ),
            })),
            totals: {
                currentValue: totalValue,
                invested: totalInvested,
                pnl: totalPnL,
            },
        };
    }, [
        assets,
        forexRates,
        livePricesByAsset,
        pieTransactions,
        settings.visualCurrency,
    ]);
    const unrealizedIsPositive = totals.pnl >= 0;

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
                                settings.visualCurrency,
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
                                settings.visualCurrency,
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
                                    Unrealized {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        totals.pnl,
                                        settings.visualCurrency,
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
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                                Description
                            </p>
                            <p className="text-sm text-app-foreground mt-1">
                                {description}
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditOpen(true)}
                            icon={<Pencil size={16} />}
                        >
                            Edit Pie
                        </Button>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Performance History" className="lg:col-span-2">
                        {pieTransactions.length > 0 ? (
                            <NetWorthHistoryChart
                                transactions={pieTransactions}
                                assets={assets}
                                baseCurrency={settings.visualCurrency}
                                height={260}
                                currency={settings.visualCurrency}
                                locale={settings.locale}
                                assetFilter={pieAssetIds}
                                includeCash={false}
                                includeDeposits={false}
                                includeWithdrawals={false}
                                includeDividends={false}
                                includeForex={false}
                            />
                        ) : (
                            <p className="text-sm text-app-muted">
                                Add transactions to see pie performance.
                            </p>
                        )}
                    </Card>
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

            <Modal
                isOpen={isEditOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Pie"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Pie Name
                        </label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(event) =>
                                setEditName(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                        {isDuplicateName && (
                            <p className="mt-2 text-sm text-app-warning">
                                A pie with this name already exists.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={editDescription}
                            onChange={(event) =>
                                setEditDescription(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Risk (1-5)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={editRisk}
                            onChange={(event) =>
                                setEditRisk(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleEditSave}
                        disabled={!editNameTrimmed || isDuplicateName}
                    >
                        Save Changes
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
