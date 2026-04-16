import React, { useMemo, useState } from "react";
import { AlertTriangle, Archive, Pencil } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../ui/Modal";
import { Tooltip } from "../../ui/Tooltip";
import { Button } from "../../ui/Button";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    selectAssets,
    selectPies,
    selectSettings,
    selectWalletPositionsState,
    selectWallets,
} from "../../store/selectors";
import { updateAsset } from "../../store/slices/assetsSlice";
import { updatePie } from "../../store/slices/piesSlice";
import { Currency, AssetType } from "../../core/schema-types";
import { formatCurrency } from "../../utils/formatters";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import { toVisualValue } from "../../core/finance";
import { YahooAPIStockSelect } from "../../components/YahooAPIStockSelect";
import { StooqAPIStockSelect } from "../../components/StooqAPIStockSelect";

interface Props {
    onMenuClick: () => void;
}

const currencyOptions: Currency[] = ["EUR", "USD", "GBP"];
const ZERO_EPSILON = 1e-9;

export const AssetsPage: React.FC<Props> = ({ onMenuClick }) => {
    const assets = useAppSelector(selectAssets);
    const pies = useAppSelector(selectPies);
    const wallets = useAppSelector(selectWallets);
    const walletPositions = useAppSelector(selectWalletPositionsState);
    const settings = useAppSelector(selectSettings);
    const dispatch = useAppDispatch();

    const assetList = useMemo(() => Object.values(assets), [assets]);
    const livePricesByAsset = useAssetLivePrices(assetList);

    const forexCurrencies = useMemo(() => {
        const currencies = new Set<string>();
        assetList.forEach((asset) => currencies.add(asset.tradingCurrency));
        currencies.add(settings.visualCurrency);
        return Array.from(currencies);
    }, [assetList, settings.visualCurrency]);

    const forexRates = useForexLivePrices(forexCurrencies, settings.visualCurrency);

    const duplicateNameSet = useMemo(() => {
        const counts = new Map<string, number>();
        assetList.forEach((asset) => {
            const key = asset.name.trim().toLowerCase();
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        return new Set(
            Array.from(counts.entries())
                .filter(([, count]) => count > 1)
                .map(([name]) => name),
        );
    }, [assetList]);

    const rows = useMemo(() => {
        return assetList
            .map((asset) => {
                const walletNames: string[] = [];
                let quantity = 0;
                let worthVisual = 0;

                Object.entries(walletPositions).forEach(([walletId, positions]) => {
                    const position = positions[asset.id];
                    if (!position) return;

                    quantity += position.amount;
                    if (Math.abs(position.amount) > ZERO_EPSILON) {
                        walletNames.push(wallets[walletId]?.name ?? walletId);
                    }

                    const currentPrice =
                        livePricesByAsset[asset.id] ?? position.avgCost.value;
                    const rawWorth = position.amount * currentPrice;
                    worthVisual += toVisualValue(
                        rawWorth,
                        asset.tradingCurrency,
                        settings.visualCurrency,
                        forexRates,
                    );
                });

                const isUsed = walletNames.length > 0;
                const canArchive = !isUsed && Math.abs(quantity) <= ZERO_EPSILON;
                const normalizedName = asset.name.trim().toLowerCase();
                const hasDuplicateName = duplicateNameSet.has(normalizedName);

                return {
                    asset,
                    quantity,
                    worthVisual,
                    walletNames,
                    canArchive,
                    hasDuplicateName,
                };
            })
            .sort((a, b) => a.asset.name.localeCompare(b.asset.name));
    }, [
        assetList,
        duplicateNameSet,
        forexRates,
        livePricesByAsset,
        settings.visualCurrency,
        walletPositions,
        wallets,
    ]);

    const [isEditAssetOpen, setEditAssetOpen] = useState(false);
    const [editAssetId, setEditAssetId] = useState<string | null>(null);
    const [editAssetType, setEditAssetType] = useState<AssetType>("stock");
    const [editAssetTicker, setEditAssetTicker] = useState("");
    const [editAssetName, setEditAssetName] = useState("");
    const [editAssetYfTicker, setEditAssetYfTicker] = useState("");
    const [editAssetYfSearch, setEditAssetYfSearch] = useState("");
    const [editAssetStooq, setEditAssetStooq] = useState("");
    const [editAssetStooqSearch, setEditAssetStooqSearch] = useState("");
    const [editAssetCurrency, setEditAssetCurrency] = useState<Currency>("USD");
    const [editAssetQuoteAlias, setEditAssetQuoteAlias] = useState("USDT");
    const [editAssetPieId, setEditAssetPieId] = useState("");

    const handleEditAssetOpen = (assetId: string) => {
        const asset = assets[assetId];
        if (!asset) return;
        const currentPieId =
            Object.values(pies).find((pie) => pie.assetIds.includes(assetId))?.id ??
            "";
        setEditAssetId(assetId);
        setEditAssetType(asset.assetType);
        setEditAssetTicker(asset.ticker);
        setEditAssetName(asset.name);
        setEditAssetYfTicker(asset.yfTicker ?? "");
        setEditAssetYfSearch(asset.yfTicker ?? "");
        setEditAssetStooq(asset.stooqTicker ?? "");
        setEditAssetStooqSearch(asset.stooqTicker ?? "");
        setEditAssetCurrency(asset.tradingCurrency);
        setEditAssetQuoteAlias(
            asset.assetType === "crypto"
                ? (asset.cryptoQuoteAlias ??
                      (asset.tradingCurrency === "USD"
                          ? "USDT"
                          : asset.tradingCurrency))
                : "",
        );
        setEditAssetPieId(currentPieId);
        setEditAssetOpen(true);
    };

    const handleEditAssetSave = () => {
        if (!editAssetId) return;
        const stooqValue =
            editAssetType === "stock" || editAssetType === "etf"
                ? (editAssetStooqSearch.trim() || editAssetStooq.trim()) || null
                : null;
        const yfValue =
            editAssetType === "stock" || editAssetType === "etf"
                ? (editAssetYfSearch.trim() || editAssetYfTicker.trim()).toUpperCase() ||
                  null
                : null;
        dispatch(
            updateAsset({
                id: editAssetId,
                changes: {
                    assetType: editAssetType,
                    ticker: editAssetTicker.trim().toUpperCase(),
                    name: editAssetName.trim() || editAssetTicker.trim(),
                    yfTicker: yfValue,
                    stooqTicker: stooqValue,
                    cryptoQuoteAlias:
                        editAssetType === "crypto"
                            ? editAssetQuoteAlias.trim().toUpperCase() || null
                            : null,
                    updatedAt: new Date().toISOString(),
                },
            }),
        );
        const nextPieId = editAssetPieId;
        Object.values(pies).forEach((pie) => {
            if (!pie.assetIds.includes(editAssetId)) return;
            if (pie.id === nextPieId) return;
            dispatch(
                updatePie({
                    id: pie.id,
                    changes: {
                        assetIds: pie.assetIds.filter(
                            (existingId) => existingId !== editAssetId,
                        ),
                    },
                }),
            );
        });
        if (nextPieId) {
            const targetPie = pies[nextPieId];
            if (targetPie && !targetPie.assetIds.includes(editAssetId)) {
                dispatch(
                    updatePie({
                        id: targetPie.id,
                        changes: {
                            assetIds: [...targetPie.assetIds, editAssetId],
                        },
                    }),
                );
            }
        }
        setEditAssetOpen(false);
    };

    const handleArchive = (assetId: string) => {
        dispatch(
            updateAsset({
                id: assetId,
                changes: {
                    isArchived: true,
                    updatedAt: new Date().toISOString(),
                },
            }),
        );
    };

    return (
        <div>
            <PageHeader title="Assets" onMenuClick={onMenuClick} />
            <main className="p-6 max-w-7xl mx-auto">
                <div className="overflow-x-auto rounded-xl border border-app-border">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-app-muted uppercase border-b border-app-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">Asset</th>
                                <th className="px-4 py-3 font-medium text-right">Quantity</th>
                                <th className="px-4 py-3 font-medium text-right">Worth ({settings.visualCurrency})</th>
                                <th className="px-4 py-3 font-medium text-center">Wallets Using It</th>
                                <th className="px-4 py-3 font-medium text-right">Edit</th>
                                <th className="px-4 py-3 font-medium text-right">Archive</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {rows.map((row) => {
                                const { asset, walletNames, canArchive, hasDuplicateName } = row;
                                const isArchived = Boolean(asset.isArchived);
                                return (
                                    <tr
                                        key={asset.id}
                                        className={`transition-colors ${
                                            isArchived
                                                ? "opacity-50 bg-app-surface/60"
                                                : "hover:bg-app-surface"
                                        }`}
                                    >
                                        <td className="px-4 py-3 font-medium text-app-foreground">
                                            <div className="inline-flex items-center gap-2">
                                                <span>
                                                    {asset.name}
                                                    <span className="text-app-muted ml-1">
                                                        {asset.ticker}
                                                    </span>
                                                </span>
                                                {hasDuplicateName && (
                                                    <Tooltip content="Same identifier can create confusion when selecting the asset in dropdowns. Please change one of those for something more specific.">
                                                        <AlertTriangle
                                                            size={14}
                                                            className="text-app-warning"
                                                        />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-app-muted">
                                            {row.quantity.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-app-foreground font-medium">
                                            {formatCurrency(
                                                row.worthVisual,
                                                settings.visualCurrency,
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-app-muted">
                                            {walletNames.length > 0 ? (
                                                <Tooltip
                                                    content={walletNames.join(", ")}
                                                    fullWidth
                                                    className="justify-center py-1"
                                                >
                                                    <span>{walletNames.length}</span>
                                                </Tooltip>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleEditAssetOpen(asset.id)}
                                                disabled={isArchived}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-app-muted hover:text-app-foreground hover:bg-app-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                aria-label="Edit asset"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canArchive ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleArchive(asset.id)}
                                                    disabled={isArchived}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg text-app-muted hover:text-app-danger hover:bg-app-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    aria-label="Archive asset"
                                                >
                                                    <Archive size={16} />
                                                </button>
                                            ) : (
                                                <Tooltip content="You can't archive an asset that is currently being used">
                                                    <span className="inline-flex">
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="inline-flex items-center justify-center p-2 rounded-lg text-app-muted opacity-40 cursor-not-allowed"
                                                            aria-label="Archive asset"
                                                        >
                                                            <Archive size={16} />
                                                        </button>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>

            <Modal
                isOpen={isEditAssetOpen}
                onClose={() => setEditAssetOpen(false)}
                title="Edit Asset"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Ticker
                            </label>
                            <input
                                type="text"
                                value={editAssetTicker}
                                onChange={(event) =>
                                    setEditAssetTicker(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={editAssetName}
                                onChange={(event) =>
                                    setEditAssetName(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Asset Type
                            </label>
                            <select
                                value={editAssetType}
                                onChange={(event) =>
                                    setEditAssetType(
                                        event.target.value as AssetType,
                                    )
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                <option value="stock">Stock</option>
                                <option value="etf">ETF</option>
                                <option value="crypto">Crypto</option>
                                <option value="bond">Bond</option>
                                <option value="cash">Cash</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Trading Currency
                            </label>
                            <select
                                value={editAssetCurrency}
                                disabled
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            >
                                {currencyOptions.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {editAssetType === "crypto" && (
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Crypto Quote Alias
                            </label>
                            <input
                                type="text"
                                value={editAssetQuoteAlias}
                                onChange={(event) =>
                                    setEditAssetQuoteAlias(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                placeholder="USDT"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Pie
                            </label>
                            <select
                                value={editAssetPieId}
                                onChange={(event) =>
                                    setEditAssetPieId(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                <option value="">No pie</option>
                                {Object.values(pies).map((pie) => (
                                    <option key={pie.id} value={pie.id}>
                                        {pie.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Yahoo Finance Ticker
                        </label>
                        <YahooAPIStockSelect
                            searchValue={editAssetYfSearch}
                            onSearchChange={(value) => {
                                setEditAssetYfSearch(value);
                                setEditAssetYfTicker(value);
                            }}
                            selectedValue={editAssetYfTicker}
                            onSelect={setEditAssetYfTicker}
                            placeholder="Search Yahoo ticker"
                            disabled={
                                editAssetType !== "stock" &&
                                editAssetType !== "etf"
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Stooq Ticker
                        </label>
                        <StooqAPIStockSelect
                            searchValue={editAssetStooqSearch}
                            onSearchChange={(value) => {
                                setEditAssetStooqSearch(value);
                                setEditAssetStooq(value);
                            }}
                            selectedValue={editAssetStooq}
                            onSelect={setEditAssetStooq}
                            placeholder="Search stooq ticker"
                            disabled={
                                editAssetType !== "stock" &&
                                editAssetType !== "etf"
                            }
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleEditAssetSave}
                        disabled={!editAssetTicker.trim() || !editAssetName.trim()}
                    >
                        Update Asset
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
