import React, { useMemo } from "react";

interface PieChartProps {
    data: { name: string; value: number; color: string }[];
    height?: number;
}

const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
};

const buildArcPath = (
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    outerRadius: number,
    center: number
) => {
    const startOuter = polarToCartesian(center, center, outerRadius, endAngle);
    const endOuter = polarToCartesian(center, center, outerRadius, startAngle);
    const startInner = polarToCartesian(center, center, innerRadius, endAngle);
    const endInner = polarToCartesian(center, center, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
        `L ${endInner.x} ${endInner.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
        "Z",
    ].join(" ");
};

export const PieChart: React.FC<PieChartProps> = ({ data, height = 300 }) => {
    const total = useMemo(
        () => data.reduce((sum, slice) => sum + slice.value, 0),
        [data]
    );

    const segments = useMemo(() => {
        let cumulative = 0;
        const denominator = total || 1;

        return data.map((slice) => {
            const start = (cumulative / denominator) * 360;
            const angle = total === 0 ? 0 : (slice.value / total) * 360;
            const end = start + angle;
            cumulative += slice.value;

            return {
                ...slice,
                start,
                end,
            };
        });
    }, [data, total]);

    const center = 120;
    const innerRadius = 60;
    const outerRadius = 90;

    return (
        <div
            className="relative bg-gradient-to-br from-app-surface/40 to-app-surface rounded-xl border border-app-border/60 shadow-inner overflow-hidden"
            style={{ height }}
        >
            <svg
                viewBox={`0 0 ${center * 2} ${center * 2}`}
                className="h-full w-full"
                role="img"
                aria-label="Portfolio allocation chart"
            >
                <defs>
                    <filter id="pieShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow
                            dx="0"
                            dy="6"
                            stdDeviation="8"
                            floodColor="rgba(0,0,0,0.18)"
                        />
                    </filter>
                </defs>

                {segments.map((slice, idx) => (
                    <path
                        key={slice.name}
                        d={buildArcPath(
                            slice.start,
                            slice.end,
                            innerRadius,
                            outerRadius,
                            center
                        )}
                        fill={slice.color}
                        opacity={0.95}
                        filter="url(#pieShadow)"
                    >
                        <title>
                            {slice.name}: {((slice.value / total) * 100).toFixed(1)}%
                        </title>
                    </path>
                ))}

                <circle
                    cx={center}
                    cy={center}
                    r={innerRadius - 6}
                    fill="rgb(var(--color-app-bg))"
                    stroke="rgb(var(--color-app-border))"
                    strokeWidth={1}
                />
                <text
                    x={center}
                    y={center - 6}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill="rgb(var(--color-app-muted))"
                >
                    Total
                </text>
                <text
                    x={center}
                    y={center + 12}
                    textAnchor="middle"
                    className="font-semibold text-lg"
                    fill="rgb(var(--color-app-foreground))"
                >
                    {total.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                    })}
                </text>
            </svg>
        </div>
    );
};
