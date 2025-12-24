import React from 'react';
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
  // Build nodes array: 0 = Income, 1-N = expense categories, N+1 = Savings
  const nodes = [
    { name: 'Income' },
    ...data.expenses.map(exp => ({ name: exp.category })),
    { name: 'Savings' }
  ];

  // Build links array: Income -> each expense category, and Income -> Savings
  const links = [
    ...data.expenses.map((exp, i) => ({
      source: 0, // Income
      target: i + 1, // Expense category
      value: exp.value
    })),
    {
      source: 0, // Income
      target: nodes.length - 1, // Savings
      value: data.savings
    }
  ];

  const sankeyData = { nodes, links };

  // Custom node rendering for color coding
  const renderNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const isIncome = index === 0;
    const isSavings = index === nodes.length - 1;
    const isExpense = !isIncome && !isSavings;

    const fill = isIncome ? 'rgb(var(--color-app-primary))' : isSavings ? '#10b981' : '#ef4444';

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={0.8}
          rx={4}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fill="#ffffff"
          fontWeight="500"
        >
          {payload.name}
        </text>
      </g>
    );
  };

  // Custom link rendering for gradient colors
  const renderLink = (props: any) => {
    const { sourceX, sourceY, targetX, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    const isSavingsLink = props.target === nodes.length - 1;
    const linkColor = isSavingsLink ? '#10b981' : '#ef4444';

    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        stroke={linkColor}
        strokeWidth={linkWidth}
        fill="none"
        strokeOpacity={0.3}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-app-card border border-app-border rounded-lg p-3 shadow-lg">
          {data.source !== undefined ? (
            // Link tooltip
            <>
              <p className="text-app-foreground font-medium text-sm">
                {nodes[data.source].name} → {nodes[data.target].name}
              </p>
              <p className="text-app-muted text-sm">${data.value.toFixed(2)}</p>
            </>
          ) : (
            // Node tooltip
            <>
              <p className="text-app-foreground font-medium text-sm">{data.name}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={sankeyData}
          node={renderNode}
          link={renderLink}
          nodePadding={50}
          margin={{ top: 20, right: 150, bottom: 20, left: 150 }}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};
