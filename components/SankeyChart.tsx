import React, { useMemo } from "react";

interface SankeyData {
    income: number;
    expenses: Array<{ category: string; value: number }>;
    savings: number;
}

interface SankeyChartProps {
    data: SankeyData;
    height?: number;
}

interface SankeyNode {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    value: number;
}

const palette = [
    "#ef4444",
    "#f97316",
    "#22c55e",
    "#06b6d4",
    "#8b5cf6",
    "#eab308",
    "#ec4899",
];

export const SankeyChart: React.FC<SankeyChartProps> = ({
    data,
    height = 500,
}) => {
    const width = 960;
    const margin = 32;
    const linkGap = 16;
    const nodeWidth = 120;

    const { incomeNode, expenseNodes, savingsNode, flows } = useMemo(() => {
        const totalOut =
            data.expenses.reduce((sum, exp) => sum + exp.value, 0) +
            data.savings;
        const availableHeight = height - margin * 2;
        const flowSegments = [
            ...data.expenses.map((exp) => ({
                name: exp.category,
                value: exp.value,
                isSavings: false,
            })),
            {
                name: "Savings",
                value: data.savings,
                isSavings: true,
            },
        ];

        const scale =
            (availableHeight -
                linkGap * Math.max(flowSegments.length - 1, 0)) /
            Math.max(totalOut, 1);

        let offsetY = margin;
        const flows = flowSegments.map((segment, idx) => {
            const flowHeight = Math.max(segment.value * scale, 8);
            const startY = offsetY + flowHeight / 2;
            offsetY += flowHeight + (idx < flowSegments.length - 1 ? linkGap : 0);
            return { ...segment, height: flowHeight, centerY: startY };
        });

        const incomeHeight = flows.reduce(
            (sum, flow, idx) => sum + flow.height + (idx < flows.length - 1 ? linkGap : 0),
            0
        );

        const incomeNode: SankeyNode = {
            name: "Income",
            x: margin,
            y: margin,
            width: nodeWidth,
            height: incomeHeight,
            color: "rgb(var(--color-app-primary))",
            value: data.income,
        };

        const expenseNodes: SankeyNode[] = flows
            .filter((flow) => !flow.isSavings)
            .map((flow, idx) => ({
                name: flow.name,
                x: width / 2 - nodeWidth / 2,
                y: flow.centerY - flow.height / 2,
                width: nodeWidth,
                height: flow.height,
                color: palette[idx % palette.length],
                value: flow.value,
            }));

        const savingsFlow = flows.find((flow) => flow.isSavings);
        const savingsHeight = savingsFlow?.height ?? 12;
        const savingsY =
            (savingsFlow?.centerY ?? availableHeight / 2) - savingsHeight / 2;

        const savingsNode: SankeyNode = {
            name: "Savings",
            x: width - margin - nodeWidth,
            y: savingsY,
            width: nodeWidth,
            height: savingsHeight,
            color: "#22c55e",
            value: data.savings,
        };

        return { incomeNode, expenseNodes, savingsNode, flows };
    }, [data.expenses, data.income, data.savings, height, linkGap, margin, nodeWidth, width]);

    const renderNode = (node: SankeyNode) => (
        <g key={node.name}>
            <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={14}
                fill={node.color}
                fillOpacity={0.9}
                className="shadow-lg"
            />
            <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-semibold"
                fill="rgb(var(--color-app-bg))"
            >
                {node.name}
            </text>
        </g>
    );

    const paths = useMemo(() => {
        const incomeRight = incomeNode.x + incomeNode.width;
        return flows.map((flow, idx) => {
            const isSavings = flow.isSavings;
            const targetNode = isSavings
                ? savingsNode
                : expenseNodes[idx] ?? savingsNode;
            const startY = flow.centerY;
            const endY = targetNode.y + targetNode.height / 2;
            const thickness = flow.height;

            const d = [
                `M ${incomeRight} ${startY}`,
                `C ${incomeRight + 120} ${startY} ${
                    targetNode.x - 120
                } ${endY} ${targetNode.x} ${endY}`,
            ].join(" ");

            const color = isSavings
                ? savingsNode.color
                : expenseNodes[idx]?.color ?? "rgb(var(--color-app-primary))";

            return {
                d,
                color,
                thickness,
                label: `${flow.name}: $${flow.value.toLocaleString()}`,
                key: `${flow.name}-${idx}`,
            };
        });
    }, [expenseNodes, flows, incomeNode.x, incomeNode.width, savingsNode]);

    return (
        <div
            className="relative bg-gradient-to-br from-app-surface/70 to-app-surface rounded-xl border border-app-border/60"
            style={{ height }}
        >
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full"
                role="img"
                aria-label="Cash flow sankey diagram"
            >
                <defs>
                    <linearGradient id="flowGrid" x1="0" x2="1" y1="0" y2="0">
                        <stop
                            offset="0%"
                            stopColor="rgba(var(--color-app-border), 0.1)"
                        />
                        <stop
                            offset="100%"
                            stopColor="rgba(var(--color-app-border), 0.05)"
                        />
                    </linearGradient>
                </defs>

                <rect
                    x={margin / 2}
                    y={margin / 2}
                    width={width - margin}
                    height={height - margin}
                    fill="url(#flowGrid)"
                    rx={20}
                />

                {paths.map((path) => (
                    <path
                        key={path.key}
                        d={path.d}
                        fill="none"
                        stroke={path.color}
                        strokeWidth={path.thickness}
                        strokeOpacity={0.25}
                        strokeLinecap="round"
                    >
                        <title>{path.label}</title>
                    </path>
                ))}

                {renderNode(incomeNode)}
                {expenseNodes.map(renderNode)}
                {renderNode(savingsNode)}
            </svg>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-3 bg-app-bg/80 backdrop-blur-sm px-4 py-2 rounded-full border border-app-border">
                {[incomeNode, ...expenseNodes, savingsNode].map((node) => (
                    <div key={node.name} className="flex items-center gap-2 text-sm">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: node.color }}
                        />
                        <span className="text-app-muted">{node.name}</span>
                        <span className="text-app-foreground font-semibold">
                            ${node.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
