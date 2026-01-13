import React from "react";
import {
    ResponsiveContainer,
    AreaChart as ReAreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

interface AreaChartProps {
    data: any[];
    dataKey: string;
    color?: string;
    height?: number;
    xDataKey?: string;
    ticks?: Array<string | number>;
    tickFormatter?: (value: string | number) => string;
    labelFormatter?: (label: string | number) => string;
    yTickFormatter?: (value: number) => string;
}

export const AreaChart = React.memo(
    ({
        data,
        dataKey,
        color = "rgb(var(--color-app-primary))",
        height = 300,
        xDataKey = "name",
        ticks,
        tickFormatter,
        labelFormatter,
        yTickFormatter,
    }: AreaChartProps) => {
        return (
            <div style={{ width: "100%", height }}>
                <ResponsiveContainer>
                    <ReAreaChart
                        data={data}
                        margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgb(var(--color-app-border))"
                            vertical={false}
                        />
                        <XAxis
                            dataKey={xDataKey}
                            stroke="rgb(var(--color-app-muted))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            ticks={ticks}
                            tickFormatter={tickFormatter}
                        />
                        <YAxis
                            stroke="rgb(var(--color-app-muted))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={
                                yTickFormatter ??
                                ((value) => `$${value}`)
                            }
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
                            labelFormatter={labelFormatter}
                        />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            fill={color}
                            fillOpacity={0.25}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{
                                r: 6,
                                fill: color,
                                stroke: "rgb(var(--color-app-bg))",
                                strokeWidth: 2,
                            }}
                        />
                    </ReAreaChart>
                </ResponsiveContainer>
            </div>
        );
    }
);
