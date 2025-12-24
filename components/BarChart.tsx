import React from 'react';
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartGridColor, chartTickStyle, chartTooltipStyle, formatCurrency } from './chartUtils';

interface BarChartProps {
  data: { name: string; [key: string]: number | string }[];
  dataKey: string;
  color?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="p-3 rounded-xl border shadow-lg bg-app-card border-app-border">
      <p className="text-sm font-semibold text-app-foreground">{label}</p>
      <p className="text-sm text-app-muted mt-1">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  color = 'rgb(var(--color-app-primary))',
  height = 300,
}) => {
  const gradientId = React.useMemo(() => `barGradient-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ReBarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke={chartGridColor} vertical={false} />
          <XAxis dataKey="name" tick={chartTickStyle} axisLine={false} tickLine={false} interval={0} />
          <YAxis
            tick={chartTickStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            cursor={{ fill: 'rgb(var(--color-app-border))', opacity: 0.15 }}
            content={<CustomTooltip />}
            wrapperStyle={chartTooltipStyle}
          />
          <Bar
            dataKey={dataKey}
            maxBarSize={42}
            radius={[12, 12, 12, 12]}
            fill={`url(#${gradientId})`}
            background={{ fill: 'rgb(var(--color-app-border))', radius: 12, opacity: 0.25 }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};
