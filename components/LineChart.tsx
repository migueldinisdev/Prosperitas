import React, { useMemo } from "react";

interface LineChartProps {
    data: Array<Record<string, number | string>>;
    dataKey: string;
    color?: string;
    height?: number;
}

const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, {
        maximumFractionDigits: 0,
    })}`;

export const LineChart: React.FC<LineChartProps> = ({
    data,
    dataKey,
    color = "rgb(var(--color-app-primary))",
    height = 300,
}) => {
    const width = 640;
    const paddingX = 32;
    const paddingY = 24;

    const points = useMemo(() => {
        if (data.length === 0) return [];

        const values = data.map((item) => Number(item[dataKey] ?? 0));
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const verticalRange = maxValue === minValue ? 1 : maxValue - minValue;
        const xStep = (width - paddingX * 2) / Math.max(data.length - 1, 1);

        return data.map((item, idx) => {
            const x = paddingX + idx * xStep;
            const value = Number(item[dataKey] ?? 0);
            const y =
                height -
                paddingY -
                ((value - minValue) / verticalRange) * (height - paddingY * 2);

            return {
                x,
                y,
                label: String(item.name ?? idx + 1),
                value,
            };
        });
    }, [data, dataKey, height, paddingX, paddingY, width]);

    const linePath = points
        .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");

    const areaPath =
        points.length > 0
            ? `M ${points[0].x} ${height - paddingY} ${points
                  .map((point) => `L ${point.x} ${point.y}`)
                  .join(" ")} L ${
                  points[points.length - 1].x
              } ${height - paddingY} Z`
            : "";

    return (
        <div
            className="w-full bg-gradient-to-br from-app-surface/60 to-app-surface rounded-xl border border-app-border/60 p-4"
            style={{ height }}
        >
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full"
                role="img"
                aria-label="Performance trend"
            >
                <defs>
                    <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                        <stop
                            offset="100%"
                            stopColor="rgb(var(--color-app-primary))"
                            stopOpacity="0"
                        />
                    </linearGradient>
                </defs>

                <rect
                    x={paddingX}
                    y={paddingY / 2}
                    width={width - paddingX * 2}
                    height={height - paddingY}
                    fill="url(#lineGradient)"
                    opacity={0.04}
                />

                {areaPath && (
                    <path
                        d={areaPath}
                        fill="url(#lineGradient)"
                        stroke="none"
                        opacity={0.6}
                    />
                )}

                <path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                />

                {points.map((point) => (
                    <g key={`${point.x}-${point.label}`}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={6}
                            fill="rgb(var(--color-app-bg))"
                            stroke={color}
                            strokeWidth={3}
                        />
                        <text
                            x={point.x}
                            y={point.y - 12}
                            textAnchor="middle"
                            className="text-[11px] font-semibold"
                            fill="rgb(var(--color-app-foreground))"
                        >
                            {formatCurrency(point.value)}
                        </text>
                    </g>
                ))}
            </svg>
            <div className="mt-3 grid grid-cols-6 gap-2">
                {points.map((point) => (
                    <span
                        key={point.label}
                        className="text-xs text-app-muted text-center"
                    >
                        {point.label}
                    </span>
                ))}
            </div>
        </div>
    );
};
