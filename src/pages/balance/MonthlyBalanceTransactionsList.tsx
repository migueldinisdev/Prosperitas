import React, { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from "lucide-react";
import { Card } from "../../ui/Card";
import { useBalanceData } from "../../hooks/useBalanceData";
import { formatCurrency } from "../../utils/formatters";
import type { BalanceTransaction } from "../../core/schema-types";
import { useAppDispatch } from "../../store/hooks";
import { removeBalanceTransactionThunk } from "../../store/thunks/balanceThunks";
import { ConfirmModal } from "../../ui/ConfirmModal";
import { EditBalanceTransactionModal } from "../../components/EditBalanceTransactionModal";

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
    const [editingTx, setEditingTx] = useState<{
        transaction: BalanceTransaction;
        index: number;
    } | null>(null);
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
        [monthData]
    );

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
                                const canEdit = i === 0;
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
                                        className={`flex items-center justify-between pl-5 pr-7 transition-colors cursor-pointer ${
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
                                                        t.date
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
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
                                                    t.amount.currency
                                                )}
                                            </span>
                                            {canEdit ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setEditingTx({
                                                                transaction: t,
                                                                index,
                                                            });
                                                        }}
                                                        className="inline-flex items-center justify-center p-2 rounded-lg text-app-muted hover:text-app-foreground hover:bg-app-surface transition-colors"
                                                        aria-label="Edit transaction"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setConfirmIndex(
                                                                index
                                                            );
                                                        }}
                                                        className="inline-flex items-center justify-center p-2 rounded-lg text-app-danger hover:text-app-danger/90 hover:bg-app-danger/10 transition-colors"
                                                        aria-label="Delete transaction"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-app-muted">
                                                    -
                                                </span>
                                            )}
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
                        })
                    );
                    setConfirmIndex(null);
                }}
                title="Delete transaction"
                description="This will remove the transaction from this month."
                confirmLabel="Delete Transaction"
            />
            <EditBalanceTransactionModal
                isOpen={Boolean(editingTx)}
                onClose={() => setEditingTx(null)}
                monthKey={monthKey}
                transaction={editingTx?.transaction ?? null}
                index={editingTx?.index ?? null}
            />
        </>
    );
};
