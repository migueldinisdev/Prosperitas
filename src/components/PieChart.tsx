import React from "react";
import {
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    Tooltip,
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
                <div className="flex h-full min-h-0 flex-col gap-3">
                    <div className="min-h-[180px] min-w-0 flex-1">
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
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor:
                                            "rgb(var(--color-app-card))",
                                        borderColor:
                                            "rgb(var(--color-app-border))",
                                        borderRadius: "8px",
                                        color: "rgb(var(--color-app-foreground))",
                                    }}
                                    itemStyle={{
                                        color: "rgb(var(--color-app-foreground))",
                                    }}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="max-h-28 min-w-0 overflow-y-auto rounded-md border border-app-border/70 bg-app-bg/40 p-2">
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                            {data.map((entry, index) => (
                                <li
                                    key={`${entry.name}-${index}`}
                                    className="flex items-center gap-2 text-xs text-app-muted"
                                >
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                        aria-hidden="true"
                                    />
                                    <span
                                        className="min-w-0 flex-1 truncate text-app-foreground"
                                        title={entry.name}
                                    >
                                        {entry.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </ChartContainer>
        );
    }
);
