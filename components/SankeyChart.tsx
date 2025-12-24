import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { chartTooltipStyle, formatCurrency } from './chartUtils';

interface SankeyData {
  income: number;
  expenses: Array<{ category: string; value: number }>;
  savings: number;
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ data, height = 480 }) => {
  const expensePalette = ['#a855f7', '#22c55e', '#0ea5e9', '#f97316', '#f43f5e', '#06b6d4', '#f59e0b'];

  const nodes = useMemo(
    () => [
      { name: 'Income', color: '#6366f1' },
      ...data.expenses.map((expense, index) => ({
        name: expense.category,
        color: expensePalette[index % expensePalette.length],
      })),
      { name: 'Savings', color: '#22c55e' },
    ],
    [data.expenses]
  );

  const links = useMemo(
    () => [
      ...data.expenses.map((expense, index) => ({
        source: 0,
        target: index + 1,
        value: expense.value,
      })),
      {
        source: 0,
        target: nodes.length - 1,
        value: data.savings,
      },
    ],
    [data.expenses, data.savings, nodes.length]
  );

  const totalFlow = useMemo(
    () => links.reduce((sum, link) => sum + (typeof link.value === 'number' ? link.value : 0), 0),
    [links]
  );

  const renderNode = (nodeProps: any) => {
    const { x, y, width, height, index, payload } = nodeProps;
    const fill = payload.color || nodes[index]?.color || 'rgb(var(--color-app-primary))';

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={10}
          fill={fill}
          fillOpacity={0.9}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1.5}
        />
        <text
          x={x + width + 12}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={600}
          fill="rgb(var(--color-app-foreground))"
        >
          {payload.name}
        </text>
      </g>
    );
  };

  const renderLink = (linkProps: any) => {
    const {
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourceControlX,
      targetControlX,
      linkWidth,
      index,
      payload,
    } = linkProps;

    const targetNode = nodes[payload.target];
    const linkColor = targetNode?.color || 'rgb(var(--color-app-primary))';
    const gradientId = `sankey-link-${index}`;

    return (
      <g opacity={0.55}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={linkColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={linkColor} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <path
          d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={Math.max(linkWidth, 2)}
          strokeLinecap="round"
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const datum = payload[0].payload;
    const isLink = datum.source !== undefined && datum.target !== undefined;

    if (isLink) {
      const value = datum.value || 0;
      const percent = totalFlow ? ((value / totalFlow) * 100).toFixed(1) : '0.0';
      return (
        <div className="p-3 rounded-xl border shadow-lg bg-app-card border-app-border">
          <p className="text-sm font-semibold text-app-foreground">
            {nodes[datum.source].name} → {nodes[datum.target].name}
          </p>
          <p className="text-sm text-app-muted mt-1">
            {formatCurrency(value)} ({percent}%)
          </p>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-xl border shadow-lg bg-app-card border-app-border">
        <p className="text-sm font-semibold text-app-foreground">{datum.name}</p>
        {datum.value !== undefined && (
          <p className="text-sm text-app-muted mt-1">{formatCurrency(datum.value)}</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          node={renderNode}
          link={renderLink}
          nodePadding={40}
          nodeWidth={14}
          iterations={64}
          margin={{ top: 30, right: 150, bottom: 30, left: 40 }}
        >
          <Tooltip content={<CustomTooltip />} wrapperStyle={chartTooltipStyle} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};
