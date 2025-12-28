import React from "react";
import {
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";

interface PieChartProps {
    data: { name: string; value: number; color: string }[];
    height?: number;
}

export const PieChart = React.memo(({ data, height = 300 }: PieChartProps) => {
    console.log("PieChart re-rendered");
    return (
        <div style={{ width: "100%", height }}>
            <ResponsiveContainer>
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
        </div>
    );
});
