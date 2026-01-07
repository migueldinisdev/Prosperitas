import React, { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { BalanceMonthSwitcher } from "./BalanceMonthSwitcher";
import { MonthlyBalanceTransactionsList } from "./MonthlyBalanceTransactionsList";
import { BalanceCategorySpendingSection } from "./BalanceCategorySpendingSection";
import { BalanceSankeySection } from "./BalanceSankeySection";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Plus, SlidersHorizontal } from "lucide-react";
import { AddBalanceTransactionModal } from "../../components/AddBalanceTransactionModal";
import { ManageCategoriesModal } from "../../components/ManageCategoriesModal";
import { getMonthKey } from "../../utils/dates";
import { useBalanceData } from "../../hooks/useBalanceData";
import { formatCurrency } from "../../utils/formatters";
import { useAppSelector } from "../../store/hooks";
import { selectSettings } from "../../store/selectors";

interface Props {
    onMenuClick: () => void;
}

export const BalancePage: React.FC<Props> = ({ onMenuClick }) => {
    const [isAddTxOpen, setAddTxOpen] = useState(false);
    const [isCategoriesOpen, setCategoriesOpen] = useState(false);
    const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));
    const { monthData } = useBalanceData(monthKey);
    const { balanceCurrency } = useAppSelector(selectSettings);

    const cashFlow = useMemo(() => {
        let income = 0;
        let expenses = 0;

        (monthData?.txs ?? []).forEach((tx) => {
            if (tx.type === "income") {
                income += tx.amount.value;
            } else if (tx.type === "expense") {
                expenses += tx.amount.value;
            }
        });

        return {
            income,
            expenses,
            netSavings: income - expenses,
        };
    }, [monthData]);

    return (
        <div className="pb-20">
            <PageHeader
                title="Balance"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <Card title="Quick Actions">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                            variant="primary"
                            className="w-full"
                            icon={<Plus size={16} />}
                            onClick={() => setAddTxOpen(true)}
                        >
                            Add Transaction
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full"
                            icon={<SlidersHorizontal size={16} />}
                            onClick={() => setCategoriesOpen(true)}
                        >
                            Manage Categories
                        </Button>
                    </div>
                </Card>

                <BalanceMonthSwitcher
                    monthKey={monthKey}
                    onChange={setMonthKey}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Savings Rate">
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-app-foreground">
                                42%
                            </span>
                            <span className="text-app-muted mb-1">
                                this month
                            </span>
                        </div>
                        <div className="w-full bg-app-surface h-2 rounded-full overflow-hidden">
                            <div className="bg-app-success h-full w-[42%]"></div>
                        </div>
                        <p className="text-xs text-app-muted mt-2">
                            +$450 vs monthly average
                        </p>
                    </Card>

                    <Card title="Cash Flow">
                        <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-app-muted">Income</span>
                                <span className="text-app-foreground font-medium">
                                    {formatCurrency(
                                        cashFlow.income,
                                        balanceCurrency
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-app-muted">Expenses</span>
                                <span className="text-app-foreground font-medium">
                                    -
                                    {formatCurrency(
                                        cashFlow.expenses,
                                        balanceCurrency
                                    )}
                                </span>
                            </div>
                            <div className="h-px bg-app-border my-2"></div>
                            <div className="flex justify-between text-base font-semibold">
                                <span className="text-app-foreground">
                                    Net Savings
                                </span>
                                <span
                                    className={
                                        cashFlow.netSavings >= 0
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }
                                >
                                    {cashFlow.netSavings >= 0 ? "+" : "-"}
                                    {formatCurrency(
                                        Math.abs(cashFlow.netSavings),
                                        balanceCurrency
                                    )}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Transactions List - Full Width with Scrollable Container */}
                <div className="w-full">
                    <MonthlyBalanceTransactionsList monthKey={monthKey} />
                </div>

                {/* Spending by Category + Sankey Flow Chart */}
                <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
                    <BalanceCategorySpendingSection monthKey={monthKey} />
                    <BalanceSankeySection monthKey={monthKey} />
                </div>
            </main>

            <AddBalanceTransactionModal
                isOpen={isAddTxOpen}
                onClose={() => setAddTxOpen(false)}
                monthKey={monthKey}
            />
            <ManageCategoriesModal
                isOpen={isCategoriesOpen}
                onClose={() => setCategoriesOpen(false)}
            />
        </div>
    );
};
