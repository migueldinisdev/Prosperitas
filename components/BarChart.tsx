import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  color = 'rgb(var(--color-app-primary))',
  height = 300,
}) => {
  const gradientId = useMemo(() => `bar-gradient-${dataKey}`, [dataKey]);

  const formattedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        [dataKey]: Number(item[dataKey]) ?? 0,
      })),
    [data, dataKey],
  );

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
        <ReBarChart
          data={formattedData}
          margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
          barSize={36}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.3} />
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
            tickMargin={12}
            padding={{ left: 10, right: 10 }}
            tick={{ fill: 'rgb(var(--color-app-muted))', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: 'rgb(var(--color-app-muted))', fontSize: 12 }}
            tickFormatter={(value) => currencyFormatter.format(value)}
            width={68}
            stroke="transparent"
          />
          <Tooltip
            cursor={{ fill: 'rgb(var(--color-app-border))', opacity: 0.35 }}
            content={<CustomTooltip />}
          />
          <Bar
            dataKey={dataKey}
            fill={`url(#${gradientId})`}
            radius={[12, 12, 10, 10]}
            background={{ fill: 'rgba(255,255,255,0.04)' }}
          />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};
