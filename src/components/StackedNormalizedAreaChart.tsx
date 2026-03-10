import React from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from "recharts";

interface SeriesConfig {
    key: string;
    label: string;
    color: string;
}

interface StackedNormalizedAreaChartProps {
    data: Array<Record<string, number | string>>;
    series: SeriesConfig[];
    height?: number;
}

export const StackedNormalizedAreaChart: React.FC<
    StackedNormalizedAreaChartProps
> = ({ data, series, height = 320 }) => {
    return (
        <div style={{ width: "100%", height }}>
            <ResponsiveContainer>
                <AreaChart
                    data={data}
                    margin={{ top: 8, right: 16, left: 0, bottom: 16 }}
                    stackOffset="expand"
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgb(var(--color-app-border))"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="name"
                        stroke="rgb(var(--color-app-muted))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                        minTickGap={24}
                    />
                    <YAxis
                        stroke="rgb(var(--color-app-muted))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${Math.round(value * 100)}%`}
                    />
                    <Tooltip
                        formatter={(value: number, name: string) => [
                            `${(value * 100).toFixed(1)}%`,
                            name,
                        ]}
                        contentStyle={{
                            backgroundColor: "rgb(var(--color-app-card))",
                            borderColor: "rgb(var(--color-app-border))",
                            borderRadius: "8px",
                            color: "rgb(var(--color-app-foreground))",
                        }}
                        itemStyle={{
                            color: "rgb(var(--color-app-foreground))",
                        }}
                        cursor={{
                            stroke: "rgb(var(--color-app-border))",
                            strokeWidth: 1,
                        }}
                    />
                    <Legend />
                    {series.map((entry) => (
                        <Area
                            key={entry.key}
                            type="monotone"
                            dataKey={entry.key}
                            name={entry.label}
                            stackId="1"
                            stroke={entry.color}
                            fill={entry.color}
                            fillOpacity={0.8}
                            isAnimationActive={false}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

