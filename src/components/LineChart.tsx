import React from "react";
import {
    ResponsiveContainer,
    LineChart as ReLineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

interface LineChartProps {
    data: any[];
    dataKey: string;
    color?: string;
    height?: number;
}

export const LineChart = React.memo(
    ({
        data,
        dataKey,
        color = "rgb(var(--color-app-primary))",
        height = 300,
    }: LineChartProps) => {
        console.log("LineChart re-rendered");

        return (
            <div style={{ width: "100%", height, minHeight: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart
                        data={data}
                        margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
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
                            dy={10}
                        />
                        <YAxis
                            stroke="rgb(var(--color-app-muted))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
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
                            cursor={{
                                stroke: "rgb(var(--color-app-border))",
                                strokeWidth: 1,
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{
                                r: 6,
                                fill: color,
                                stroke: "rgb(var(--color-app-bg))",
                                strokeWidth: 2,
                            }}
                        />
                    </ReLineChart>
                </ResponsiveContainer>
            </div>
        );
    }
);
