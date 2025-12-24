import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ data, height = 300 }) => {
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, payload: cellPayload } = payload[0];
      return (
        <div className="bg-app-card border border-app-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-app-muted text-xs">{name}</p>
          <p className="text-app-foreground font-semibold text-sm">
            {currencyFormatter.format(value)} ({cellPayload.percent.toFixed(0)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RePieChart>
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="rgba(0,0,0,0.15)" />
            </filter>
          </defs>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="rgb(var(--color-app-card))"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
            isAnimationActive
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} filter="url(#shadow)" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            verticalAlign="middle"
            align="right"
            layout="vertical"
            wrapperStyle={{ paddingLeft: 12 }}
            formatter={(value: string) => <span className="text-app-muted text-sm">{value}</span>}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
};
