import React, { useCallback, useMemo } from "react";
import type { TooltipProps } from "recharts";
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
    const tickFormatter = useCallback(
        (value: number) => formatCurrency(value, balanceCurrency),
        [balanceCurrency]
    );
    const data = useMemo(() => {
        const totals = new Map<string, number>();
        (monthData?.txs ?? []).forEach((tx) => {
            if (tx.type !== "expense") {
                return;
            }
            const categoryKey = tx.categoryId ?? "uncategorized";
            totals.set(
                categoryKey,
                (totals.get(categoryKey) ?? 0) + tx.amount.value
            );
        });
        return Array.from(totals.entries())
            .map(([categoryId, value]) => {
                const category =
                    categoryId === "uncategorized"
                        ? null
                        : categories[categoryId];
                return {
                    name:
                        categoryId === "uncategorized"
                            ? "Uncategorized"
                            : category?.name ?? "Category",
                    description:
                        categoryId === "uncategorized"
                            ? "No category assigned."
                            : category?.description || "No description",
                    value,
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [categories, monthData]);

    const tooltipContent = useCallback(
        ({
            active,
            payload,
        }: TooltipProps<number, string> & {
            payload?: Array<{
                payload: {
                    name: string;
                    description: string;
                    value: number;
                };
            }>;
        }) => {
            if (!active || !payload?.length) {
                return null;
            }
            const entry = payload[0]?.payload;
            if (!entry) {
                return null;
            }
            return (
                <div className="rounded-lg border border-app-border bg-app-card px-3 py-2 shadow-sm">
                    <p className="text-sm font-medium text-app-foreground">
                        {entry.name}
                    </p>
                    <p className="text-xs text-app-muted">
                        {entry.description}
                    </p>
                    <p className="text-xs font-medium text-app-foreground mt-1">
                        {formatCurrency(entry.value, balanceCurrency)}
                    </p>
                </div>
            );
        },
        [balanceCurrency]
    );

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
                    tickFormatter={tickFormatter}
                    tooltipContent={tooltipContent}
                />
            )}
        </Card>
    );
};
