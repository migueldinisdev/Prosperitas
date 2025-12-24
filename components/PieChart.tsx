import React from 'react';
import { Legend, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { chartTooltipStyle, formatCurrency } from './chartUtils';

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  return (
    <div className="p-3 rounded-xl border shadow-lg bg-app-card border-app-border">
      <p className="text-sm font-semibold text-app-foreground">{item.name}</p>
      <p className="text-sm text-app-muted mt-1">{formatCurrency(item.value)}</p>
    </div>
  );
};

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="rgb(var(--color-app-foreground))"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

export const PieChart: React.FC<PieChartProps> = ({ data, height = 300 }) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RePieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={4}
            labelLine={false}
            label={renderLabel}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="rgb(var(--color-app-bg))" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} wrapperStyle={chartTooltipStyle} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-sm text-app-muted">{value}</span>}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
};
