import React, { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { WalletTx, AssetsState, Money } from "../core/schema-types";
import { formatCurrency } from "../utils/formatters";
import { useAppDispatch } from "../store/hooks";
import { removeWalletTransaction } from "../store/thunks/walletThunks";
import { ConfirmModal } from "../ui/ConfirmModal";
import { EditWalletTransactionModal } from "./EditWalletTransactionModal";

interface WalletTransactionsTableProps {
    transactions: WalletTx[];
    assets: AssetsState;
}

const formatMoney = (money?: Money) =>
    money ? formatCurrency(money.value, money.currency) : "-";

const formatType = (type: WalletTx["type"]) =>
    type.charAt(0).toUpperCase() + type.slice(1);

export const WalletTransactionsTable = React.memo(
    ({ transactions, assets }: WalletTransactionsTableProps) => {
        console.log("WalletTransactionsTable re-rendered");

        const [currentPage, setCurrentPage] = useState(1);
        const [transactionsPerPage, setTransactionsPerPage] = useState(10);
        const dispatch = useAppDispatch();
        const [confirmTx, setConfirmTx] = useState<WalletTx | null>(null);
        const [editingTx, setEditingTx] = useState<WalletTx | null>(null);

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

        const paginatedTransactions = useMemo(() => {
            const start = (currentPage - 1) * transactionsPerPage;
            const end = start + transactionsPerPage;
            return transactions.slice(start, end);
        }, [transactions, currentPage, transactionsPerPage]);

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
                                            onClick={() => setEditingTx(tx)}
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
                <EditWalletTransactionModal
                    isOpen={Boolean(editingTx)}
                    onClose={() => setEditingTx(null)}
                    transaction={editingTx}
                />
            </div>
        );
    }
);
