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
import { Modal } from "../../ui/Modal";
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
    const [openRateDetails, setOpenRateDetails] = useState<
        "spending" | "savings" | null
    >(null);
    const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));
    const { monthData, balance } = useBalanceData(monthKey);
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

    const savingsRate = useMemo(() => {
        if (cashFlow.income <= 0) {
            return 0;
        }

        return (cashFlow.netSavings / cashFlow.income) * 100;
    }, [cashFlow.income, cashFlow.netSavings]);

    const spendingRate = useMemo(() => {
        if (cashFlow.income <= 0) {
            return 0;
        }

        return (cashFlow.expenses / cashFlow.income) * 100;
    }, [cashFlow.expenses, cashFlow.income]);

    const spendingRateProgress = useMemo(() => {
        if (cashFlow.income <= 0) {
            return 0;
        }

        return Math.min(Math.max((cashFlow.expenses / cashFlow.income) * 100, 0), 100);
    }, [cashFlow.expenses, cashFlow.income]);

    const formatRate = (value: number) =>
        `${Math.round(Math.min(Math.max(value, 0), 100))}%`;

    const historicalRates = useMemo(() => {
        const entries = Object.values(balance ?? {}).filter(
            (month) => (month.txs?.length ?? 0) > 0
        );

        const byMonth = entries
            .map((month) => {
                const totals = month.txs.reduce(
                    (acc, tx) => {
                        if (tx.type === "income") {
                            acc.income += tx.amount.value;
                        } else if (tx.type === "expense") {
                            acc.expenses += tx.amount.value;
                        }
                        return acc;
                    },
                    {
                        income: 0,
                        expenses: 0,
                    }
                );
                const netSavings = totals.income - totals.expenses;
                const spendingRateMonth =
                    totals.income > 0
                        ? (totals.expenses / totals.income) * 100
                        : 0;
                const savingsRateMonth =
                    totals.income > 0 ? (netSavings / totals.income) * 100 : 0;

                return {
                    month: month.month,
                    income: totals.income,
                    expenses: totals.expenses,
                    netSavings,
                    spendingRate: spendingRateMonth,
                    savingsRate: savingsRateMonth,
                };
            })
            .sort((a, b) => a.month.localeCompare(b.month));

        const last12 = byMonth.slice(-12);
        const average = (values: number[]) =>
            values.length > 0
                ? values.reduce((sum, value) => sum + value, 0) / values.length
                : 0;

        return {
            avgSpendingRateEver: average(byMonth.map((item) => item.spendingRate)),
            avgSavingsRateEver: average(byMonth.map((item) => item.savingsRate)),
            avgSpendingRateLast12: average(last12.map((item) => item.spendingRate)),
            avgSavingsRateLast12: average(last12.map((item) => item.savingsRate)),
            avgSpendingAbsoluteEver: average(byMonth.map((item) => item.expenses)),
            avgSavingsAbsoluteEver: average(byMonth.map((item) => item.netSavings)),
        };
    }, [balance]);

    const formatDeltaPercent = (delta: number) =>
        `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;

    const formatDeltaAbsolute = (delta: number) =>
        `${delta >= 0 ? "+" : ""}${formatCurrency(delta, balanceCurrency)}`;

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card
                        title="Savings Rate"
                        className="cursor-pointer hover:border-app-primary/50 transition-colors"
                        onClick={() => setOpenRateDetails("savings")}
                    >
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-app-foreground">
                                {formatRate(savingsRate)}
                            </span>
                            <span className="text-app-muted mb-1">
                                this month
                            </span>
                        </div>
                        <div className="relative w-full bg-app-surface h-2 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${savingsRate >= 0 ? "bg-app-success" : "bg-app-danger"}`}
                                style={{
                                    width: `${Math.min(Math.max(savingsRate, 0), 100)}%`,
                                }}
                            ></div>
                            <div
                                className="absolute top-0 bottom-0 w-[2px] bg-app-foreground/80"
                                style={{
                                    left: `${Math.min(
                                        Math.max(
                                            historicalRates.avgSavingsRateEver,
                                            0
                                        ),
                                        100
                                    )}%`,
                                }}
                            />
                        </div>
                        <p className="text-xs text-app-muted mt-2">
                            {formatCurrency(
                                cashFlow.netSavings,
                                balanceCurrency
                            )}{" "}
                            saved
                        </p>
                    </Card>

                    <Card
                        title="Spending Rate"
                        className="cursor-pointer hover:border-app-primary/50 transition-colors"
                        onClick={() => setOpenRateDetails("spending")}
                    >
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-app-foreground">
                                {formatRate(spendingRate)}
                            </span>
                            <span className="text-app-muted mb-1">
                                of income
                            </span>
                        </div>
                        <div className="relative w-full bg-app-surface h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-app-warning h-full"
                                style={{
                                    width: `${spendingRateProgress}%`,
                                    minWidth: spendingRateProgress > 0 ? "2px" : "0px",
                                }}
                            ></div>
                            <div
                                className="absolute top-0 bottom-0 w-[2px] bg-app-foreground/80"
                                style={{
                                    left: `${Math.min(
                                        Math.max(
                                            historicalRates.avgSpendingRateEver,
                                            0
                                        ),
                                        100
                                    )}%`,
                                }}
                            />
                        </div>
                        <p className="text-xs text-app-muted mt-2">
                            {formatCurrency(
                                cashFlow.expenses,
                                balanceCurrency
                            )}{" "}
                            spent
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

            <Modal
                isOpen={openRateDetails === "spending"}
                onClose={() => setOpenRateDetails(null)}
                title="Spending Rate Details"
            >
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="text-app-muted">Average spending rate (ever)</p>
                        <p className="font-semibold text-app-foreground">
                            {historicalRates.avgSpendingRateEver.toFixed(1)}% ({formatDeltaPercent(historicalRates.avgSpendingRateEver - spendingRate)} vs this month)
                        </p>
                    </div>
                    <div>
                        <p className="text-app-muted">
                            Average spending rate (last 12 months)
                        </p>
                        <p className="font-semibold text-app-foreground">
                            {historicalRates.avgSpendingRateLast12.toFixed(1)}% ({formatDeltaPercent(historicalRates.avgSpendingRateLast12 - spendingRate)} vs this month)
                        </p>
                    </div>
                    <div>
                        <p className="text-app-muted">
                            Average spending (absolute)
                        </p>
                        <p className="font-semibold text-app-foreground">
                            {formatCurrency(historicalRates.avgSpendingAbsoluteEver, balanceCurrency)} ({formatDeltaAbsolute(historicalRates.avgSpendingAbsoluteEver - cashFlow.expenses)} vs this month)
                        </p>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={openRateDetails === "savings"}
                onClose={() => setOpenRateDetails(null)}
                title="Savings Rate Details"
            >
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="text-app-muted">Average savings rate (ever)</p>
                        <p className="font-semibold text-app-foreground">
                            {historicalRates.avgSavingsRateEver.toFixed(1)}% ({formatDeltaPercent(historicalRates.avgSavingsRateEver - savingsRate)} vs this month)
                        </p>
                    </div>
                    <div>
                        <p className="text-app-muted">
                            Average savings rate (last 12 months)
                        </p>
                        <p className="font-semibold text-app-foreground">
                            {historicalRates.avgSavingsRateLast12.toFixed(1)}% ({formatDeltaPercent(historicalRates.avgSavingsRateLast12 - savingsRate)} vs this month)
                        </p>
                    </div>
                    <div>
                        <p className="text-app-muted">
                            Average savings (absolute)
                        </p>
                        <p className="font-semibold text-app-foreground">
                            {formatCurrency(historicalRates.avgSavingsAbsoluteEver, balanceCurrency)} ({formatDeltaAbsolute(historicalRates.avgSavingsAbsoluteEver - cashFlow.netSavings)} vs this month)
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
