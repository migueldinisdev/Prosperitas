import React from "react";
import {
    ResponsiveContainer,
    AreaChart as ReAreaChart,
    Area,
    Line,
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
    extraLines?: Array<{
        dataKey: string;
        color: string;
        name?: string;
        strokeWidth?: number;
        dashed?: boolean;
    }>;
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
        extraLines,
    }: AreaChartProps) => {
        return (
            <div style={{ width: "100%", height }}>
                <ResponsiveContainer>
                    <ReAreaChart
                        data={data}
                        margin={{ top: 5, right: 16, left: 12, bottom: 24 }}
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
                            dy={8}
                            height={42}
                            minTickGap={0}
                            ticks={ticks}
                            interval={0}
                            tickFormatter={tickFormatter}
                        />
                        <YAxis
                            stroke="rgb(var(--color-app-muted))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={90}
                            tickFormatter={
                                yTickFormatter ?? ((value) => String(value))
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
                            formatter={(value: number, name: string) => [
                                yTickFormatter?.(value) ?? String(value),
                                name,
                            ]}
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
                        {extraLines?.map((line) => (
                            <Line
                                key={line.dataKey}
                                type="monotone"
                                dataKey={line.dataKey}
                                name={line.name}
                                stroke={line.color}
                                strokeWidth={line.strokeWidth ?? 2}
                                strokeDasharray={line.dashed ? "6 4" : undefined}
                                dot={false}
                                activeDot={{
                                    r: 4,
                                    fill: line.color,
                                    stroke: "rgb(var(--color-app-bg))",
                                    strokeWidth: 2,
                                }}
                            />
                        ))}
                    </ReAreaChart>
                </ResponsiveContainer>
            </div>
        );
    }
);
