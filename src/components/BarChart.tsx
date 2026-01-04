import React from "react";
import {
    ResponsiveContainer,
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

interface BarChartProps {
    data: any[];
    dataKey: string;
    color?: string;
    height?: number;
    tickFormatter?: (value: number) => string;
}

export const BarChart = React.memo(
    ({
        data,
        dataKey,
        color = "rgb(var(--color-app-primary))",
        height = 300,
        tickFormatter,
    }: BarChartProps) => {
        console.log("BarChart re-rendered");

        return (
            <div style={{ width: "100%", height }}>
                <ResponsiveContainer>
                    <ReBarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 16, left: 16, bottom: 24 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgb(var(--color-app-border))"
                            horizontal={false}
                        />
                        <XAxis
                            type="number"
                            stroke="rgb(var(--color-app-muted))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={tickFormatter}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="rgb(var(--color-app-muted))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={120}
                        />
                        <Tooltip
                            cursor={{
                                fill: "rgb(var(--color-app-border))",
                                opacity: 0.4,
                            }}
                            contentStyle={{
                                backgroundColor: "rgb(var(--color-app-card))",
                                borderColor: "rgb(var(--color-app-border))",
                                borderRadius: "8px",
                                color: "rgb(var(--color-app-foreground))",
                            }}
                        />
                        <Bar
                            dataKey={dataKey}
                            fill={color}
                            radius={[0, 4, 4, 0]}
                        />
                    </ReBarChart>
                </ResponsiveContainer>
            </div>
        );
    }
);
