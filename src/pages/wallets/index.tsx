import React, { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { WalletCard } from "./WalletCard";
import { AddWalletCard } from "./AddWalletCard";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    selectAssets,
    selectSettings,
    selectWalletPositionsState,
    selectWalletTxState,
    selectWallets,
} from "../../store/selectors";
import { addWallet } from "../../store/slices/walletsSlice";
import { Asset, Money } from "../../core/schema-types";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import { useForexHistoricalRates } from "../../hooks/useForexHistoricalRates";
import {
    calculatePositionCostBasis,
    calculateRealizedPnl,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
    toVisualMoney,
    toVisualValue,
} from "../../core/finance";

interface Props {
    onMenuClick: () => void;
}

const normalizeCashBuckets = (
    cash: Money[] | Record<string, number> | undefined
) => {
    if (!cash) return [];
    if (Array.isArray(cash)) return cash;
    return Object.entries(cash).map(([currency, value]) => ({
        currency,
        value: Number(value),
    }));
};

export const WalletsPage: React.FC<Props> = ({ onMenuClick }) => {
    const wallets = useAppSelector(selectWallets);
    const settings = useAppSelector(selectSettings);
    const walletPositions = useAppSelector(selectWalletPositionsState);
    const walletTx = useAppSelector(selectWalletTxState);
    const assets = useAppSelector(selectAssets);
    const dispatch = useAppDispatch();

    const [isAddOpen, setAddOpen] = useState(false);
    const [walletName, setWalletName] = useState("");
    const [walletDescription, setWalletDescription] = useState("");

    const existingNamesLower = useMemo(
        () => new Set(Object.values(wallets).map((w) => w.name.toLowerCase())),
        [wallets]
    );
    const walletNameTrimmed = walletName.trim();
    const isDuplicateName =
        walletNameTrimmed.length > 0 &&
        existingNamesLower.has(walletNameTrimmed.toLowerCase());

    const walletList = useMemo(() => Object.values(wallets), [wallets]);

    const walletAssets = useMemo(() => {
        const assetIds = new Set<string>();
        Object.values(walletPositions).forEach((positions) => {
            Object.entries(positions).forEach(([assetId, position]) => {
                if (position.amount > 0) {
                    assetIds.add(assetId);
                }
            });
        });
        return Array.from(assetIds)
            .map((assetId) => assets[assetId])
            .filter((asset): asset is Asset => Boolean(asset));
    }, [assets, walletPositions]);

    const livePricesByAsset = useAssetLivePrices(walletAssets);

    const transactionCurrencies = useMemo(() => {
        const currencies = new Set<string>();
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
    }, [walletTx]);

    const forexCurrencies = useMemo(() => {
        const currencies = new Set<string>();
        walletList.forEach((wallet) => {
            normalizeCashBuckets(wallet.cash).forEach((bucket) =>
                currencies.add(bucket.currency)
            );
        });
        transactionCurrencies.forEach((currency) => currencies.add(currency));
        walletAssets.forEach((asset) => currencies.add(asset.tradingCurrency));
        return Array.from(currencies);
    }, [transactionCurrencies, walletAssets, walletList]);

    const forexRates = useForexLivePrices(
        forexCurrencies,
        settings.visualCurrency
    );

    const transactionDates = useMemo(
        () => Object.values(walletTx).map((tx) => tx.date),
        [walletTx]
    );

    const { getForexRate } = useForexHistoricalRates(
        forexCurrencies,
        transactionDates,
        settings.visualCurrency
    );

    const walletSummaries = useMemo(() => {
        return walletList.map((wallet) => {
            const positions = walletPositions[wallet.id] ?? {};
            const walletTransactions = Object.values(walletTx).filter(
                (tx) => tx.walletId === wallet.id
            );
            const costBasisByAsset = calculatePositionCostBasis(
                walletTransactions,
                settings.visualCurrency,
                forexRates,
                getForexRate
            );
            const positionRows = Object.entries(positions)
                .filter(([, position]) => position.amount > 0)
                .map(([assetId, position]) => {
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
                });

            const invested = getTotalValue(
                positionRows.map((row) => row.investedValue)
            );
            const current = getTotalValue(
                positionRows.map((row) => row.currentValue)
            );
            const pnl = getPnL(current, invested);
            const pnlPercent = getPnLPercent(current, invested);

            const cashTotal = getTotalValue(
                normalizeCashBuckets(wallet.cash).map((bucket) =>
                    toVisualMoney(
                        bucket,
                        settings.visualCurrency,
                        forexRates
                    )
                )
            );

            const realizedPnl = calculateRealizedPnl(
                walletTransactions,
                settings.visualCurrency,
                forexRates,
                getForexRate
            );

            return {
                wallet,
                value: current + cashTotal,
                unrealizedPnl: pnl,
                unrealizedPnlPercent: pnlPercent,
                realizedPnl,
            };
        });
    }, [
        assets,
        forexRates,
        getForexRate,
        livePricesByAsset,
        settings.visualCurrency,
        walletList,
        walletPositions,
        walletTx,
    ]);

    const handleCreateWallet = () => {
        const id = `wallet_${Date.now()}`;
        const name = walletNameTrimmed || "New Wallet";
        if (existingNamesLower.has(name.toLowerCase())) return;
        dispatch(
            addWallet({
                id,
                name,
                description: walletDescription || undefined,
                cash: [{ value: 0, currency: settings.balanceCurrency }],
                txIds: [],
            })
        );
        setWalletName("");
        setWalletDescription("");
        setAddOpen(false);
    };

    return (
        <div className="pb-20">
            <PageHeader
                title="Wallets"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {walletSummaries.map(
                        ({
                            wallet,
                            value,
                            unrealizedPnl,
                            unrealizedPnlPercent,
                            realizedPnl,
                        }) => (
                        <WalletCard
                            key={wallet.id}
                            walletId={wallet.id}
                            name={wallet.name}
                            value={value}
                            unrealizedPnl={unrealizedPnl}
                            unrealizedPnlPercent={unrealizedPnlPercent}
                            realizedPnl={realizedPnl}
                            currency={settings.visualCurrency}
                            type={wallet.description}
                        />
                    ))}
                    <AddWalletCard onClick={() => setAddOpen(true)} />
                </div>
            </main>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setAddOpen(false)}
                title="Add New Wallet"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Platform Name
                        </label>
                        <input
                            type="text"
                            value={walletName}
                            onChange={(event) =>
                                setWalletName(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                        {isDuplicateName && (
                            <p className="mt-2 text-sm text-app-warning">
                                A wallet with this name already exists.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={walletDescription}
                            onChange={(event) =>
                                setWalletDescription(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleCreateWallet}
                        disabled={!walletNameTrimmed || isDuplicateName}
                    >
                        Create Wallet
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
