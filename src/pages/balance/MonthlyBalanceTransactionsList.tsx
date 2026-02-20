import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from "lucide-react";
import { Card } from "../../ui/Card";
import { useBalanceData } from "../../hooks/useBalanceData";
import { formatCurrency } from "../../utils/formatters";
import type {
    BalanceTransaction,
    CategoryType,
    Currency,
} from "../../core/schema-types";
import { useAppDispatch } from "../../store/hooks";
import {
    addBalanceTransactionThunk,
    removeBalanceTransactionThunk,
    updateBalanceTransactionThunk,
} from "../../store/thunks/balanceThunks";
import { ConfirmModal } from "../../ui/ConfirmModal";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { getMonthKey } from "../../utils/dates";

interface Props {
    monthKey: string;
}

const formatTransactionDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
    });

const getTransactionIcon = (type: BalanceTransaction["type"]) => {
    if (type === "income") return ArrowDownRight;
    return ArrowUpRight;
};

export const MonthlyBalanceTransactionsList: React.FC<Props> = ({
    monthKey,
}) => {
    const dispatch = useAppDispatch();
    const { categories, monthData } = useBalanceData(monthKey);
    const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editType, setEditType] = useState<CategoryType>("expense");
    const [editAmount, setEditAmount] = useState("");
    const [editCategoryId, setEditCategoryId] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editCurrency, setEditCurrency] = useState<Currency>("EUR");
    const [editCreatedAt, setEditCreatedAt] = useState<string | null>(null);
    const transactions = useMemo(
        () =>
            (monthData?.txs ?? [])
                .map((transaction, index) => ({ transaction, index }))
                .sort((a, b) => {
                    const dateDiff =
                        new Date(b.transaction.date).getTime() -
                        new Date(a.transaction.date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    return (
                        new Date(b.transaction.createdAt).getTime() -
                        new Date(a.transaction.createdAt).getTime()
                    );
                }),
        [monthData],
    );
    const editCategoryOptions = useMemo(
        () =>
            Object.values(categories).filter(
                (category) => category.type === editType,
            ),
        [categories, editType],
    );

    useEffect(() => {
        if (
            editCategoryId &&
            !editCategoryOptions.some(
                (category) => category.id === editCategoryId,
            )
        ) {
            setEditCategoryId("");
        }
    }, [editCategoryId, editCategoryOptions]);

    const handleEditOpen = (transaction: BalanceTransaction, index: number) => {
        setEditIndex(index);
        setEditType(transaction.type);
        setEditAmount(transaction.amount.value.toString());
        setEditCategoryId(transaction.categoryId ?? "");
        setEditDate(transaction.date);
        setEditDescription(transaction.description ?? "");
        setEditCurrency(transaction.amount.currency);
        setEditCreatedAt(transaction.createdAt);
    };

    const handleEditSave = () => {
        if (editIndex === null) return;
        const parsedAmount = Number(editAmount);
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return;
        }

        const monthFromDate = (() => {
            if (!editDate) {
                return monthKey;
            }
            const [year, month, day] = editDate.split("-").map(Number);
            if (!year || !month || !day) {
                return monthKey;
            }
            return getMonthKey(new Date(year, month - 1, day));
        })();

        const transaction: BalanceTransaction = {
            date: editDate,
            type: editType,
            categoryId: editCategoryId ? editCategoryId : null,
            amount: {
                value: parsedAmount,
                currency: editCurrency,
            },
            description: editDescription.trim()
                ? editDescription.trim()
                : undefined,
            createdAt: editCreatedAt ?? new Date().toISOString(),
        };

        if (monthFromDate !== monthKey) {
            dispatch(
                removeBalanceTransactionThunk({
                    month: monthKey,
                    index: editIndex,
                }),
            );
            dispatch(
                addBalanceTransactionThunk({
                    month: monthFromDate,
                    transaction,
                }),
            );
        } else {
            dispatch(
                updateBalanceTransactionThunk({
                    month: monthKey,
                    index: editIndex,
                    transaction,
                }),
            );
        }
        setEditIndex(null);
    };

    return (
        <>
            <Card
                title="Transactions"
                action={
                    <button className="text-sm text-app-muted hover:text-app-foreground transition-colors">
                        View all
                    </button>
                }
            >
                <div className="-mx-5 -mb-5 overflow-hidden rounded-b-2xl">
                    <div className="max-h-[500px] overflow-y-auto">
                        {transactions.length === 0 ? (
                            <div className="px-5 py-8 text-sm text-app-muted">
                                No transactions for this month yet.
                            </div>
                        ) : (
                            transactions.map(({ transaction: t, index }, i) => {
                                const isLast = i === transactions.length - 1;
                                const category = t.categoryId
                                    ? categories[t.categoryId]
                                    : undefined;
                                const categoryLabel =
                                    category?.name ??
                                    (t.categoryId
                                        ? "Category"
                                        : "Uncategorized");
                                const Icon = getTransactionIcon(t.type);
                                const isIncome = t.type === "income";
                                const amountValue = isIncome
                                    ? t.amount.value
                                    : -t.amount.value;
                                return (
                                    <div
                                        key={`${t.createdAt}-${index}`}
                                        className={`flex items-center justify-between pl-5 pr-7 transition-colors ${
                                            isLast
                                                ? "py-4 pb-5"
                                                : "py-4 border-b border-app-border"
                                        } hover:bg-app-surface`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    t.type === "income"
                                                        ? "bg-emerald-500/10 text-emerald-500"
                                                        : "bg-app-danger/10 text-app-danger"
                                                }`}
                                            >
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-app-foreground">
                                                    {t.description ||
                                                        categoryLabel ||
                                                        "Transaction"}
                                                </p>
                                                <p className="text-xs text-app-muted">
                                                    {categoryLabel} •{" "}
                                                    {formatTransactionDate(
                                                        t.date,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`font-semibold ${
                                                    amountValue > 0
                                                        ? "text-app-success"
                                                        : "text-app-danger"
                                                }`}
                                            >
                                                {isIncome ? "+" : "-"}
                                                {formatCurrency(
                                                    Math.abs(amountValue),
                                                    t.amount.currency,
                                                )}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEditOpen(t, index)
                                                }
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-app-muted hover:text-app-foreground hover:bg-app-surface transition-colors"
                                                aria-label="Edit transaction"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setConfirmIndex(index);
                                                }}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-app-danger hover:text-app-danger/90 hover:bg-app-danger/10 transition-colors"
                                                aria-label="Delete transaction"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </Card>
            <ConfirmModal
                isOpen={confirmIndex !== null}
                onClose={() => setConfirmIndex(null)}
                onConfirm={() => {
                    if (confirmIndex === null) return;
                    dispatch(
                        removeBalanceTransactionThunk({
                            month: monthKey,
                            index: confirmIndex,
                        }),
                    );
                    setConfirmIndex(null);
                }}
                title="Delete transaction"
                description="This will remove the transaction from this month."
                confirmLabel="Delete Transaction"
            />
            <Modal
                isOpen={editIndex !== null}
                onClose={() => setEditIndex(null)}
                title="Edit Transaction"
            >
                <div className="space-y-4">
                    <div className="flex bg-app-surface p-1 rounded-lg">
                        {(["expense", "income"] as CategoryType[]).map(
                            (entry) => (
                                <button
                                    key={entry}
                                    onClick={() => setEditType(entry)}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                                        editType === entry
                                            ? "bg-app-primary text-white shadow-sm"
                                            : "text-app-muted hover:text-app-foreground"
                                    }`}
                                >
                                    {entry}
                                </button>
                            ),
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Amount
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={editAmount}
                            onChange={(event) => {
                                const value = event.target.value.replace(
                                    /,/g,
                                    ".",
                                );
                                setEditAmount(value);
                            }}
                            placeholder="0.00"
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Category
                        </label>
                        <select
                            value={editCategoryId}
                            onChange={(event) =>
                                setEditCategoryId(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        >
                            <option value="">No category</option>
                            {editCategoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
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
                            placeholder="Optional note"
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div className="pt-2">
                        <Button
                            className="w-full"
                            onClick={handleEditSave}
                            disabled={
                                Number.isNaN(Number(editAmount)) ||
                                Number(editAmount) <= 0
                            }
                        >
                            Update Transaction
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
