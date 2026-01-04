import React, { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "../../ui/Card";
import { useBalanceData } from "../../hooks/useBalanceData";
import { formatCurrency } from "../../utils/formatters";
import type { BalanceTransaction } from "../../core/schema-types";

interface Props {
    monthKey: string;
}

const formatTransactionDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
    });

const getTransactionIcon = (type: BalanceTransaction["type"]) => {
    if (type === "income") return ArrowUpRight;
    return ArrowDownRight;
};

export const MonthlyBalanceTransactionsList: React.FC<Props> = ({
    monthKey,
}) => {
    const { categories, monthData } = useBalanceData(monthKey);
    const transactions = useMemo(
        () =>
            (monthData?.txs ?? []).slice().sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }),
        [monthData]
    );

    return (
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
                        transactions.map((t, i) => {
                            const isLast = i === transactions.length - 1;
                            const category = t.categoryId
                                ? categories[t.categoryId]
                                : undefined;
                            const categoryLabel =
                                category?.name ??
                                (t.categoryId ? "Category" : "Uncategorized");
                            const Icon = getTransactionIcon(t.type);
                            const amountValue =
                                t.type === "income"
                                    ? t.amount.value
                                    : -t.amount.value;
                            return (
                                <div
                                    key={`${t.createdAt}-${i}`}
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
                                                    : "bg-app-surface text-app-muted"
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
                                                {formatTransactionDate(t.date)}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`font-semibold ${
                                            amountValue > 0
                                                ? "text-app-success"
                                                : "text-app-foreground"
                                        }`}
                                    >
                                        {amountValue > 0 ? "+" : ""}
                                        {formatCurrency(
                                            Math.abs(amountValue),
                                            t.amount.currency
                                        )}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Card>
    );
};
