import React, { useMemo } from "react";
import { Card } from "../../ui/Card";
import { BarChart } from "../../components/BarChart";
import { useBalanceData } from "../../hooks/useBalanceData";
import { useAppSelector } from "../../store/hooks";
import { selectSettings } from "../../store/selectors";
import { formatCurrency } from "../../utils/formatters";

interface Props {
    monthKey: string;
}

export const BalanceCategorySpendingSection: React.FC<Props> = ({
    monthKey,
}) => {
    const { categories, monthData } = useBalanceData(monthKey);
    const { balanceCurrency } = useAppSelector(selectSettings);
    const data = useMemo(() => {
        const totals = new Map<string, number>();
        (monthData?.txs ?? []).forEach((tx) => {
            if (tx.type !== "expense") {
                return;
            }
            totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount.value);
        });
        return Array.from(totals.entries())
            .map(([categoryId, value]) => ({
                name: categories[categoryId]?.name ?? "Category",
                value,
            }))
            .sort((a, b) => b.value - a.value);
    }, [categories, monthData]);

    return (
        <Card title="Spending by Category">
            {data.length === 0 ? (
                <p className="text-sm text-app-muted">No expenses yet.</p>
            ) : (
                <BarChart
                    data={data}
                    dataKey="value"
                    color="#8b5cf6"
                    height={300}
                    tickFormatter={(value) =>
                        formatCurrency(value, balanceCurrency)
                    }
                />
            )}
        </Card>
    );
};
