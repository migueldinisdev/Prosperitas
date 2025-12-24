import React, { useMemo } from "react";

interface BarChartProps {
    data: Array<Record<string, number | string>>;
    dataKey: string;
    color?: string;
    height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
    data,
    dataKey,
    color = "rgb(var(--color-app-primary))",
    height = 300,
}) => {
    const maxValue = useMemo(
        () =>
            Math.max(
                ...data.map((item) => Number(item[dataKey] ?? 0)),
                0
            ) || 1,
        [data, dataKey]
    );

    return (
        <div
            className="w-full bg-gradient-to-br from-app-surface/60 to-app-surface rounded-xl border border-app-border/60 p-4"
            style={{ height }}
        >
            <div className="flex items-end gap-3 h-full">
                {data.map((item) => {
                    const value = Number(item[dataKey] ?? 0);
                    const heightPercent = Math.max((value / maxValue) * 100, 6);

                    const gradient = `linear-gradient(180deg, ${color}, ${color})`;

                    return (
                        <div
                            key={String(item.name)}
                            className="flex-1 flex flex-col items-center gap-2"
                        >
                            <div className="relative w-full h-full flex items-end">
                                <div
                                    className="w-full rounded-xl shadow-inner border border-app-primary/20 transition-all duration-300 hover:-translate-y-1"
                                    style={{
                                        height: `${heightPercent}%`,
                                        backgroundImage: gradient,
                                        boxShadow:
                                            "0 10px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-lg bg-app-bg border border-app-border text-[11px] font-semibold text-app-foreground shadow-md">
                                        ${value.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-app-muted">
                                {String(item.name)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
