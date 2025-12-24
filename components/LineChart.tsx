import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  color = 'rgb(var(--color-app-primary))',
  height = 300,
}) => {
  const gradientId = useMemo(() => `line-gradient-${dataKey}`, [dataKey]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-app-card border border-app-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-app-muted text-xs">{label}</p>
          <p className="text-app-foreground font-semibold text-sm">
            {currencyFormatter.format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ReLineChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 5"
            stroke="rgb(var(--color-app-border))"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            padding={{ left: 10, right: 10 }}
            tick={{ fill: 'rgb(var(--color-app-muted))', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: 'rgb(var(--color-app-muted))', fontSize: 12 }}
            tickFormatter={(value) => currencyFormatter.format(value)}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="transparent"
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={{ strokeWidth: 2, r: 5, stroke: 'rgb(var(--color-app-bg))', fill: color }}
            activeDot={{ r: 7 }}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease"
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
};
