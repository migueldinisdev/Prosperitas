import React from 'react';
import {
  Area,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartGridColor, chartTickStyle, chartTooltipStyle, formatCurrency } from './chartUtils';

interface LineChartProps {
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

export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  color = 'rgb(var(--color-app-primary))',
  height = 300,
}) => {
  const gradientId = React.useMemo(() => `lineGradient-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ReLineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0.04} />
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
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgb(var(--color-app-border))', strokeWidth: 2 }}
            wrapperStyle={chartTooltipStyle}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="none"
            fillOpacity={1}
            fill={`url(#${gradientId})`}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, stroke: 'rgb(var(--color-app-bg))', strokeWidth: 2, fill: color }}
            activeDot={{ r: 6, stroke: 'rgb(var(--color-app-bg))', strokeWidth: 2, fill: color }}
            fill={`url(#${gradientId})`}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
};
