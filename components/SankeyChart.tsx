import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

interface SankeyData {
  income: number;
  expenses: Array<{ category: string; value: number }>;
  savings: number;
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ data, height = 500 }) => {
  const nodes = useMemo(
    () => [
      { name: 'Income', value: data.income },
      ...data.expenses.map((exp) => ({ name: exp.category, value: exp.value })),
      { name: 'Savings', value: data.savings },
    ],
    [data.expenses, data.income, data.savings],
  );

  const links = useMemo(
    () => [
      ...data.expenses.map((exp, i) => ({
        source: 0,
        target: i + 1,
        value: exp.value,
      })),
      {
        source: 0,
        target: data.expenses.length + 1,
        value: data.savings,
      },
    ],
    [data.expenses, data.savings],
  );

  const palette = ['#22c55e', '#0ea5e9', '#8b5cf6', '#f97316', '#e11d48', '#06b6d4', '#14b8a6'];
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const isIncome = index === 0;
    const isSavings = index === nodes.length - 1;
    const color = isIncome
      ? 'rgb(var(--color-app-primary))'
      : isSavings
        ? '#10b981'
        : palette[(index - 1) % palette.length];

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          rx={8}
          ry={8}
          opacity={0.9}
          style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.15))' }}
        />
        <text
          x={x + width + 8}
          y={y + height / 2}
          fill="rgb(var(--color-app-foreground))"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={600}
        >
          {payload.name}
        </text>
        <text
          x={x + width + 8}
          y={y + height / 2 + 16}
          fill="rgb(var(--color-app-muted))"
          dominantBaseline="middle"
          fontSize={11}
        >
          {currencyFormatter.format(payload.value ?? 0)}
        </text>
      </g>
    );
  };

  const renderLink = (props: any) => {
    const { sourceX, sourceY, targetX, targetY, sourceControlX, targetControlX, linkWidth, payload } =
      props;
    const targetName = payload?.target?.name ?? (typeof payload?.target === 'number'
      ? nodes[payload.target]?.name
      : '');
    const isSavingsLink = targetName === 'Savings';
    const linkColor = isSavingsLink ? '#10b981' : 'rgba(255,255,255,0.28)';

    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        stroke={linkColor}
        strokeWidth={Math.max(linkWidth, 2)}
        fill="none"
        strokeOpacity={0.7}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const datum = payload[0].payload;
      const sourceIndex =
        typeof datum.source === 'number'
          ? datum.source
          : typeof datum.source?.index === 'number'
            ? datum.source.index
            : undefined;
      const targetIndex =
        typeof datum.target === 'number'
          ? datum.target
          : typeof datum.target?.index === 'number'
            ? datum.target.index
            : undefined;
      const isLink = Number.isFinite(sourceIndex) && Number.isFinite(targetIndex);

      if (isLink) {
        const sourceName =
          typeof datum.source === 'object' && datum.source?.name
            ? datum.source.name
            : nodes[sourceIndex as number]?.name;
        const targetName =
          typeof datum.target === 'object' && datum.target?.name
            ? datum.target.name
            : nodes[targetIndex as number]?.name;

        return (
          <div className="bg-app-card border border-app-border rounded-lg p-3 shadow-lg">
            <p className="text-app-foreground font-semibold text-sm">
              {sourceName} → {targetName}
            </p>
            <p className="text-app-muted text-xs">{currencyFormatter.format(datum.value)}</p>
          </div>
        );
      }

      return (
        <div className="bg-app-card border border-app-border rounded-lg p-3 shadow-lg">
          <p className="text-app-foreground font-semibold text-sm">{datum.name}</p>
          <p className="text-app-muted text-xs">{currencyFormatter.format(datum.value ?? 0)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          node={renderNode}
          link={renderLink}
          nodePadding={36}
          nodeWidth={18}
          linkCurvature={0.55}
          iterations={80}
          margin={{ top: 20, right: 40, bottom: 20, left: 10 }}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};
