import React, { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { PieCard } from "./PieCard";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { AddPieCard } from "./AddPieCard";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    selectAssets,
    selectPies,
    selectSettings,
    selectWalletTxState,
} from "../../store/selectors";
import { addPie } from "../../store/slices/piesSlice";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import {
    calculateRealizedPnl,
    getPnL,
    getPositionCurrentValue,
    getPositionInvestedValue,
} from "../../core/finance";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";

interface Props {
    onMenuClick: () => void;
}

export const PiesPage: React.FC<Props> = ({ onMenuClick }) => {
    const pies = useAppSelector(selectPies);
    const assets = useAppSelector(selectAssets);
    const settings = useAppSelector(selectSettings);
    const walletTx = useAppSelector(selectWalletTxState);
    const dispatch = useAppDispatch();

    const [isAddOpen, setAddOpen] = useState(false);
    const [pieName, setPieName] = useState("");
    const [pieDescription, setPieDescription] = useState("");
    const [pieRisk, setPieRisk] = useState("");

    const existingNamesLower = useMemo(
        () => new Set(Object.values(pies).map((pie) => pie.name.toLowerCase())),
        [pies]
    );

    const pieNameTrimmed = pieName.trim();
    const isDuplicateName =
        pieNameTrimmed.length > 0 &&
        existingNamesLower.has(pieNameTrimmed.toLowerCase());

    const pieList = useMemo(() => Object.values(pies), [pies]);

    const pieAssets = useMemo(() => {
        const assetIds = new Set<string>();
        pieList.forEach((pie) => {
            pie.assetIds.forEach((assetId) => assetIds.add(assetId));
        });
        return Array.from(assetIds)
            .map((assetId) => assets[assetId])
            .filter(Boolean);
    }, [assets, pieList]);

    const livePricesByAsset = useAssetLivePrices(pieAssets);

    const transactionCurrencies = useMemo(() => {
        const currencies = new Set<string>();
        Object.values(walletTx).forEach((tx) => {
            if (!tx.pieId) return;
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
        pieAssets.forEach((asset) =>
            currencies.add(asset.tradingCurrency)
        );
        return Array.from(currencies);
    }, [pieAssets, walletTx]);

    const forexRates = useForexLivePrices(
        transactionCurrencies,
        settings.balanceCurrency
    );

    const handleCreatePie = () => {
        const id = `pie_${Date.now()}`;
        const name = pieNameTrimmed || "New Pie";
        if (existingNamesLower.has(name.toLowerCase())) return;
        const riskValue = pieRisk ? Number(pieRisk) : undefined;

        dispatch(
            addPie({
                id,
                name,
                description: pieDescription || undefined,
                risk:
                    riskValue && riskValue >= 1 && riskValue <= 5
                        ? riskValue
                        : undefined,
                assetIds: [],
            })
        );
        setPieName("");
        setPieDescription("");
        setPieRisk("");
        setAddOpen(false);
    };

    return (
        <div className="pb-20">
            <PageHeader
                title="Pies"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pieList.map((pie) => {
                        const pieAssets = pie.assetIds
                            .map((assetId) => assets[assetId])
                            .filter(Boolean);
                        const holdingSummaries = pieAssets.map((asset) => {
                            const currentPrice =
                                livePricesByAsset[asset.id] ??
                                asset.avgCost.value;
                            const currentValue = getPositionCurrentValue(
                                asset.amount,
                                currentPrice
                            );
                            const investedValue = getPositionInvestedValue(
                                asset.amount,
                                asset.avgCost.value
                            );
                            return {
                                currentValue,
                                investedValue,
                            };
                        });
                        const totalValue = holdingSummaries.reduce(
                            (total, summary) => total + summary.currentValue,
                            0
                        );
                        const totalInvested = holdingSummaries.reduce(
                            (total, summary) => total + summary.investedValue,
                            0
                        );
                        const unrealizedPnl = getPnL(
                            totalValue,
                            totalInvested
                        );
                        const realizedPnl = calculateRealizedPnl(
                            Object.values(walletTx).filter(
                                (tx) => tx.pieId === pie.id
                            ),
                            settings.balanceCurrency,
                            forexRates
                        );
                        return (
                            <PieCard
                                key={pie.id}
                                pieId={pie.id}
                                name={pie.name}
                                description={pie.description}
                                risk={pie.risk}
                                totalValue={totalValue}
                                unrealizedPnl={unrealizedPnl}
                                realizedPnl={realizedPnl}
                                assetCount={pieAssets.length}
                                currency={settings.balanceCurrency}
                            />
                        );
                    })}
                    <AddPieCard onClick={() => setAddOpen(true)} />
                </div>
            </main>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setAddOpen(false)}
                title="Create New Pie"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Pie Name
                        </label>
                        <input
                            type="text"
                            value={pieName}
                            onChange={(event) => setPieName(event.target.value)}
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
                            value={pieDescription}
                            onChange={(event) =>
                                setPieDescription(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Risk (1-5)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={5}
                            value={pieRisk}
                            onChange={(event) => setPieRisk(event.target.value)}
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleCreatePie}
                        disabled={!pieNameTrimmed || isDuplicateName}
                    >
                        Create Pie
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
