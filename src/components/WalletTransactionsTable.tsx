import React, { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
    WalletTx,
    AssetsState,
    Money,
    Currency,
} from "../core/schema-types";
import { formatCurrency } from "../utils/formatters";
import { useAppDispatch } from "../store/hooks";
import {
    removeWalletTransaction,
    updateWalletTransaction,
} from "../store/thunks/walletThunks";
import { ConfirmModal } from "../ui/ConfirmModal";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { normalizeDecimalSeparator } from "../utils/numberInput";

interface WalletTransactionsTableProps {
    transactions: WalletTx[];
    assets: AssetsState;
}

const formatMoney = (money?: Money) =>
    money ? formatCurrency(money.value, money.currency) : "-";

const formatType = (type: WalletTx["type"]) =>
    type.charAt(0).toUpperCase() + type.slice(1);

const currencyOptions: Currency[] = ["EUR", "USD", "GBP"];
const getInputDecimals = (value: string) => {
    const trimmed = normalizeDecimalSeparator(value).trim();
    if (!trimmed.includes(".")) return 0;
    return trimmed.split(".")[1].length;
};
const roundToInputPrecision = (value: string) => {
    const parsed = Number(normalizeDecimalSeparator(value));
    if (!Number.isFinite(parsed)) return parsed;
    const decimals = getInputDecimals(value);
    if (decimals <= 0) return parsed;
    const factor = 10 ** decimals;
    return Math.round(parsed * factor) / factor;
};

export const WalletTransactionsTable = React.memo(
    ({ transactions, assets }: WalletTransactionsTableProps) => {
        console.log("WalletTransactionsTable re-rendered");

        const [currentPage, setCurrentPage] = useState(1);
        const [transactionsPerPage, setTransactionsPerPage] = useState(10);
        const dispatch = useAppDispatch();
        const [confirmTx, setConfirmTx] = useState<WalletTx | null>(null);
        const [editTx, setEditTx] = useState<WalletTx | null>(null);
        const [editDate, setEditDate] = useState("");
        const [editAmount, setEditAmount] = useState("");
        const [editCurrency, setEditCurrency] = useState<Currency>("EUR");
        const [editAssetId, setEditAssetId] = useState("");
        const [editQuantity, setEditQuantity] = useState("");
        const [editPrice, setEditPrice] = useState("");
        const [editPriceCurrency, setEditPriceCurrency] =
            useState<Currency>("USD");
        const [editFees, setEditFees] = useState("");
        const [editFeesCurrency, setEditFeesCurrency] =
            useState<Currency>("USD");
        const [editFxPair, setEditFxPair] = useState("");
        const [editFxRate, setEditFxRate] = useState("");
        const [editFromAmount, setEditFromAmount] = useState("");
        const [editFromCurrency, setEditFromCurrency] =
            useState<Currency>("EUR");
        const [editToAmount, setEditToAmount] = useState("");
        const [editToCurrency, setEditToCurrency] = useState<Currency>("USD");
        const [editCreatedAt, setEditCreatedAt] = useState<string | null>(null);

        const totalPages = useMemo(
            () => Math.ceil(transactions.length / transactionsPerPage),
            [transactions.length, transactionsPerPage]
        );

        const handlePageChange = (page: number) => {
            setCurrentPage(page);
        };

        const handleTransactionsPerPageChange = (
            event: React.ChangeEvent<HTMLSelectElement>
        ) => {
            setTransactionsPerPage(Number(event.target.value));
            setCurrentPage(1); // Reset to first page when changing items per page
        };
        const handleDecimalInputChange =
            (setter: React.Dispatch<React.SetStateAction<string>>) =>
            (event: React.ChangeEvent<HTMLInputElement>) => {
                setter(normalizeDecimalSeparator(event.target.value));
            };

        const paginatedTransactions = useMemo(() => {
            const start = (currentPage - 1) * transactionsPerPage;
            const end = start + transactionsPerPage;
            return transactions.slice(start, end);
        }, [transactions, currentPage, transactionsPerPage]);
        const assetOptions = useMemo(
            () =>
                Object.values(assets).sort((a, b) =>
                    a.ticker.localeCompare(b.ticker)
                ),
            [assets]
        );

        const handleEditOpen = (tx: WalletTx) => {
            setEditTx(tx);
            setEditDate(tx.date);
            setEditCreatedAt(tx.createdAt);
            setEditAmount("");
            setEditCurrency("EUR");
            setEditAssetId("");
            setEditQuantity("");
            setEditPrice("");
            setEditPriceCurrency("USD");
            setEditFees("");
            setEditFeesCurrency("USD");
            setEditFxPair("");
            setEditFxRate("");
            setEditFromAmount("");
            setEditFromCurrency("EUR");
            setEditToAmount("");
            setEditToCurrency("USD");
            if (tx.type === "deposit" || tx.type === "withdraw") {
                setEditAmount(tx.amount.value.toString());
                setEditCurrency(tx.amount.currency);
            }
            if (tx.type === "dividend") {
                setEditAmount(tx.amount.value.toString());
                setEditCurrency(tx.amount.currency);
                setEditAssetId(tx.assetId ?? "");
            }
            if (tx.type === "buy" || tx.type === "sell") {
                setEditAssetId(tx.assetId);
                setEditQuantity(tx.quantity.toString());
                setEditPrice(tx.price.value.toString());
                setEditPriceCurrency(tx.price.currency);
                setEditFees(tx.fees ? tx.fees.value.toString() : "");
                setEditFeesCurrency(tx.fees?.currency ?? tx.price.currency);
                setEditFxPair(tx.fxPair ?? "");
                setEditFxRate(tx.fxRate ? tx.fxRate.toString() : "");
            }
            if (tx.type === "forex") {
                setEditFromAmount(tx.from.value.toString());
                setEditFromCurrency(tx.from.currency);
                setEditToAmount(tx.to.value.toString());
                setEditToCurrency(tx.to.currency);
                setEditFees(tx.fees ? tx.fees.value.toString() : "");
                setEditFeesCurrency(tx.fees?.currency ?? tx.from.currency);
                setEditFxRate(tx.fxRate ? tx.fxRate.toString() : "");
            }
        };

        const handleEditSave = () => {
            if (!editTx) return;
            const base = {
                id: editTx.id,
                walletId: editTx.walletId,
                date: editDate,
                createdAt: editCreatedAt ?? editTx.createdAt,
                pieId: editTx.pieId,
            };
            if (editTx.type === "deposit" || editTx.type === "withdraw") {
                dispatch(
                    updateWalletTransaction({
                        ...base,
                        type: editTx.type,
                        amount: {
                            value: Number(editAmount),
                            currency: editCurrency,
                        },
                    })
                );
            }
            if (editTx.type === "dividend") {
                dispatch(
                    updateWalletTransaction({
                        ...base,
                        type: "dividend",
                        amount: {
                            value: Number(editAmount),
                            currency: editCurrency,
                        },
                        assetId: editAssetId || undefined,
                    })
                );
            }
            if (editTx.type === "buy" || editTx.type === "sell") {
                dispatch(
                    updateWalletTransaction({
                        ...base,
                        type: editTx.type,
                        assetId: editAssetId,
                        quantity: roundToInputPrecision(editQuantity),
                        price: {
                            value: roundToInputPrecision(editPrice),
                            currency: editPriceCurrency,
                        },
                        fxPair: editFxPair.trim() || undefined,
                        fxRate: editFxRate ? Number(editFxRate) : undefined,
                        fees:
                            Number(editFees) > 0
                                ? {
                                      value: roundToInputPrecision(editFees),
                                      currency: editFeesCurrency,
                                  }
                                : undefined,
                    })
                );
            }
            if (editTx.type === "forex") {
                dispatch(
                    updateWalletTransaction({
                        ...base,
                        type: "forex",
                        from: {
                            value: Number(editFromAmount),
                            currency: editFromCurrency,
                        },
                        to: {
                            value: Number(editToAmount),
                            currency: editToCurrency,
                        },
                        fees:
                            Number(editFees) > 0
                                ? {
                                      value: Number(editFees),
                                      currency: editFeesCurrency,
                                  }
                                : undefined,
                        fxRate: editFxRate ? Number(editFxRate) : undefined,
                    })
                );
            }
            setEditTx(null);
        };

        const isEditDisabled = (() => {
            if (!editTx) return true;
            if (editTx.type === "deposit" || editTx.type === "withdraw") {
                return Number(editAmount) <= 0 || !editDate;
            }
            if (editTx.type === "dividend") {
                return Number(editAmount) <= 0 || !editDate;
            }
            if (editTx.type === "buy" || editTx.type === "sell") {
                return (
                    !editAssetId ||
                    Number(editQuantity) <= 0 ||
                    Number(editPrice) <= 0 ||
                    !editDate
                );
            }
            if (editTx.type === "forex") {
                return (
                    Number(editFromAmount) <= 0 ||
                    Number(editToAmount) <= 0 ||
                    !editDate
                );
            }
            return true;
        })();

        if (transactions.length === 0) {
            return (
                <div className="text-sm text-app-muted">
                    No wallet transactions yet.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <label
                            htmlFor="transactionsPerPage"
                            className="text-sm text-app-muted mr-2"
                        >
                            Transactions per page:
                        </label>
                        <select
                            id="transactionsPerPage"
                            value={transactionsPerPage}
                            onChange={handleTransactionsPerPageChange}
                            className="text-sm border border-app-border rounded px-2 py-1"
                        >
                            {[10, 20, 50].map((count) => (
                                <option key={count} value={count}>
                                    {count}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {Array.from(
                            { length: totalPages },
                            (_, index) => index + 1
                        ).map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 rounded ${
                                    page === currentPage
                                        ? "bg-app-primary text-white"
                                        : "bg-app-surface text-app-muted"
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-app-muted uppercase border-b border-app-border">
                        <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Asset</th>
                            <th className="px-4 py-3 font-medium text-right">
                                Quantity
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Price
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Amount
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Fees
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                FX
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Edit
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Delete
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                        {paginatedTransactions.map((tx) => {
                            const asset =
                                "assetId" in tx && tx.assetId
                                    ? assets[tx.assetId]
                                    : undefined;
                            const assetLabel = asset
                                ? `${asset.ticker} • ${asset.name}`
                                : "-";

                            let quantity: string | number = "-";
                            let price = "-";
                            let amount = "-";
                            let fees = "-";
                            let fx = "-";

                            if (
                                tx.type === "deposit" ||
                                tx.type === "withdraw"
                            ) {
                                amount = formatMoney(tx.amount);
                            }

                            if (tx.type === "dividend") {
                                amount = formatMoney(tx.amount);
                            }

                            if (tx.type === "forex") {
                                amount = `${formatMoney(
                                    tx.from
                                )} → ${formatMoney(tx.to)}`;
                                fees = formatMoney(tx.fees);
                                fx = tx.fxRate
                                    ? `${tx.from.currency}/${tx.to.currency} @ ${tx.fxRate}`
                                    : "-";
                            }

                            if (tx.type === "buy" || tx.type === "sell") {
                                quantity = tx.quantity.toLocaleString();
                                price = formatMoney(tx.price);
                                amount = formatCurrency(
                                    tx.price.value * tx.quantity,
                                    tx.price.currency
                                );
                                fees = tx.fees ? formatMoney(tx.fees) : "-";
                                fx =
                                    tx.fxPair && tx.fxRate
                                        ? `${tx.fxPair} @ ${tx.fxRate}`
                                        : "-";
                            }

                            return (
                                <tr
                                    key={tx.id}
                                    className="group hover:bg-app-surface transition-colors"
                                >
                                    <td className="px-4 py-3 text-app-muted">
                                        {tx.date}
                                    </td>
                                    <td className="px-4 py-3 text-app-foreground font-medium">
                                        {formatType(tx.type)}
                                    </td>
                                    <td className="px-4 py-3 text-app-muted">
                                        {assetLabel}
                                    </td>
                                    <td className="px-4 py-3 text-right text-app-muted">
                                        {quantity}
                                    </td>
                                    <td className="px-4 py-3 text-right text-app-muted">
                                        {price}
                                    </td>
                                    <td className="px-4 py-3 text-right text-app-foreground font-medium">
                                        {amount}
                                    </td>
                                    <td className="px-4 py-3 text-right text-app-muted">
                                        {fees}
                                    </td>
                                    <td className="px-4 py-3 text-right text-app-muted">
                                        {fx}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleEditOpen(tx)}
                                            className="inline-flex items-center justify-center p-2 rounded-lg text-app-muted hover:text-app-foreground hover:bg-app-surface transition-colors"
                                            aria-label="Edit transaction"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setConfirmTx(tx)}
                                            className="inline-flex items-center justify-center p-2 rounded-lg text-app-danger hover:text-app-danger/90 hover:bg-app-danger/10 transition-colors"
                                            aria-label="Delete transaction"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <ConfirmModal
                    isOpen={Boolean(confirmTx)}
                    onClose={() => setConfirmTx(null)}
                    onConfirm={() => {
                        if (!confirmTx) return;
                        dispatch(removeWalletTransaction(confirmTx.id));
                        setConfirmTx(null);
                    }}
                    title="Delete transaction"
                    description="This will remove the transaction and update wallet balances."
                    confirmLabel="Delete Transaction"
                />
                <Modal
                    isOpen={Boolean(editTx)}
                    onClose={() => setEditTx(null)}
                    title="Edit Transaction"
                >
                    {editTx && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-app-muted mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(event) =>
                                        setEditDate(event.target.value)
                                    }
                                    className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                />
                            </div>
                            {(editTx.type === "deposit" ||
                                editTx.type === "withdraw" ||
                                editTx.type === "dividend") && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-app-muted mb-1">
                                            Amount
                                        </label>
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={(event) =>
                                                handleDecimalInputChange(setEditAmount)(
                                                    event
                                                )
                                            }
                                            min="0"
                                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-app-muted mb-1">
                                            Currency
                                        </label>
                                        <select
                                            value={editCurrency}
                                            onChange={(event) =>
                                                setEditCurrency(
                                                    event.target
                                                        .value as Currency
                                                )
                                            }
                                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                        >
                                            {currencyOptions.map((currency) => (
                                                <option
                                                    key={currency}
                                                    value={currency}
                                                >
                                                    {currency}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {editTx.type === "dividend" && (
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Asset (optional)
                                    </label>
                                    <select
                                        value={editAssetId}
                                        onChange={(event) =>
                                            setEditAssetId(
                                                event.target.value
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        <option value="">No asset</option>
                                        {assetOptions.map((asset) => (
                                            <option
                                                key={asset.id}
                                                value={asset.id}
                                            >
                                                {asset.ticker} • {asset.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {(editTx.type === "buy" ||
                                editTx.type === "sell") && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-app-muted mb-1">
                                            Asset
                                        </label>
                                        <select
                                            value={editAssetId}
                                            onChange={(event) =>
                                                setEditAssetId(
                                                    event.target.value
                                                )
                                            }
                                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                        >
                                            {assetOptions.map((asset) => (
                                                <option
                                                    key={asset.id}
                                                    value={asset.id}
                                                >
                                                    {asset.ticker} • {asset.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                value={editQuantity}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditQuantity)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                Price
                                            </label>
                                            <input
                                                type="number"
                                                value={editPrice}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditPrice)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                Price Currency
                                            </label>
                                            <select
                                                value={editPriceCurrency}
                                                onChange={(event) =>
                                                    setEditPriceCurrency(
                                                        event.target
                                                            .value as Currency
                                                    )
                                                }
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            >
                                                {currencyOptions.map(
                                                    (currency) => (
                                                        <option
                                                            key={currency}
                                                            value={currency}
                                                        >
                                                            {currency}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                FX Pair (optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={editFxPair}
                                                onChange={(event) =>
                                                    setEditFxPair(
                                                        event.target.value
                                                    )
                                                }
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                FX Rate (optional)
                                            </label>
                                            <input
                                                type="number"
                                                value={editFxRate}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditFxRate)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                Fees (optional)
                                            </label>
                                            <input
                                                type="number"
                                                value={editFees}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditFees)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-app-muted mb-1">
                                            Fees Currency
                                        </label>
                                        <select
                                            value={editFeesCurrency}
                                            onChange={(event) =>
                                                setEditFeesCurrency(
                                                    event.target
                                                        .value as Currency
                                                )
                                            }
                                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                        >
                                            {currencyOptions.map((currency) => (
                                                <option
                                                    key={currency}
                                                    value={currency}
                                                >
                                                    {currency}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            {editTx.type === "forex" && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                From Amount
                                            </label>
                                            <input
                                                type="number"
                                                value={editFromAmount}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditFromAmount)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                From Currency
                                            </label>
                                            <select
                                                value={editFromCurrency}
                                                onChange={(event) =>
                                                    setEditFromCurrency(
                                                        event.target
                                                            .value as Currency
                                                    )
                                                }
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            >
                                                {currencyOptions.map(
                                                    (currency) => (
                                                        <option
                                                            key={currency}
                                                            value={currency}
                                                        >
                                                            {currency}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                To Amount
                                            </label>
                                            <input
                                                type="number"
                                                value={editToAmount}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditToAmount)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                To Currency
                                            </label>
                                            <select
                                                value={editToCurrency}
                                                onChange={(event) =>
                                                    setEditToCurrency(
                                                        event.target
                                                            .value as Currency
                                                    )
                                                }
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            >
                                                {currencyOptions.map(
                                                    (currency) => (
                                                        <option
                                                            key={currency}
                                                            value={currency}
                                                        >
                                                            {currency}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                FX Rate (optional)
                                            </label>
                                            <input
                                                type="number"
                                                value={editFxRate}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditFxRate)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-app-muted mb-1">
                                                Fees (optional)
                                            </label>
                                            <input
                                                type="number"
                                                value={editFees}
                                                onChange={(event) =>
                                                    handleDecimalInputChange(setEditFees)(
                                                        event
                                                    )
                                                }
                                                min="0"
                                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-app-muted mb-1">
                                            Fees Currency
                                        </label>
                                        <select
                                            value={editFeesCurrency}
                                            onChange={(event) =>
                                                setEditFeesCurrency(
                                                    event.target
                                                        .value as Currency
                                                )
                                            }
                                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                        >
                                            {currencyOptions.map((currency) => (
                                                <option
                                                    key={currency}
                                                    value={currency}
                                                >
                                                    {currency}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <Button
                                className="w-full"
                                onClick={handleEditSave}
                                disabled={isEditDisabled}
                            >
                                Update Transaction
                            </Button>
                        </div>
                    )}
                </Modal>
            </div>
        );
    }
);
