import React from "react";
import {
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";
import { ChartContainer } from "./ChartContainer";

interface PieChartProps {
    data: { name: string; value: number; color: string }[];
    height?: number;
    isLoading?: boolean;
}

export const PieChart = React.memo(
    ({ data, height = 300, isLoading }: PieChartProps) => {
    console.log("PieChart re-rendered");
    const resolvedLoading = isLoading ?? (!data || data.length === 0);
    return (
        <ChartContainer height={height} isLoading={resolvedLoading}>
            <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
                initialDimension={{ width: 1, height: 1 }}
            >
                <RePieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgb(var(--color-app-card))",
                            borderColor: "rgb(var(--color-app-border))",
                            borderRadius: "8px",
                            color: "rgb(var(--color-app-foreground))",
                        }}
                        itemStyle={{
                            color: "rgb(var(--color-app-foreground))",
                        }}
                    />
                    <Legend iconType="circle" />
                </RePieChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
});
