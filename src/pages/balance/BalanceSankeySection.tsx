import React, { useMemo } from "react";
import { Card } from "../../ui/Card";
import { SankeyChart } from "../../components/SankeyChart";
import { useBalanceData } from "../../hooks/useBalanceData";
import { useAppSelector } from "../../store/hooks";
import { selectSettings } from "../../store/selectors";

interface Props {
    monthKey: string;
}

export const BalanceSankeySection: React.FC<Props> = ({ monthKey }) => {
    const { categories, monthData } = useBalanceData(monthKey);
    const settings = useAppSelector(selectSettings);
    const sankeyData = useMemo(() => {
        let income = 0;
        let expensesTotal = 0;
        const expenses = new Map<string, number>();

        (monthData?.txs ?? []).forEach((tx) => {
            if (tx.type === "income") {
                income += tx.amount.value;
            } else if (tx.type === "expense") {
                expensesTotal += tx.amount.value;
                const categoryKey = tx.categoryId ?? "uncategorized";
                expenses.set(
                    categoryKey,
                    (expenses.get(categoryKey) ?? 0) + tx.amount.value
                );
            }
        });

        return {
            income,
            expenses: Array.from(expenses.entries()).map(
                ([categoryId, value]) => ({
                    category:
                        categoryId === "uncategorized"
                            ? "Uncategorized"
                            : categories[categoryId]?.name ?? "Category",
                    value,
                })
            ),
            savings: Math.max(income - expensesTotal, 0),
        };
    }, [categories, monthData]);

    return (
        <Card title="Cash Flow Analysis">
            {sankeyData.income === 0 && sankeyData.expenses.length === 0 ? (
                <p className="text-sm text-app-muted">No cash flow data yet.</p>
            ) : (
                <SankeyChart
                    data={sankeyData}
                    height={400}
                    currency={settings.balanceCurrency}
                />
            )}
        </Card>
    );
};
