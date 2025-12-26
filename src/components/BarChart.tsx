import React from 'react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
  tickFormatter?: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  color = 'rgb(var(--color-app-primary))',
  height = 300,
  tickFormatter,
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ReBarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-app-border))" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="rgb(var(--color-app-muted))" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="rgb(var(--color-app-muted))" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={tickFormatter}
          />
          <Tooltip 
            cursor={{ fill: 'rgb(var(--color-app-border))', opacity: 0.4 }}
            contentStyle={{ backgroundColor: 'rgb(var(--color-app-card))', borderColor: 'rgb(var(--color-app-border))', borderRadius: '8px', color: 'rgb(var(--color-app-foreground))' }}
          />
          <Bar 
            dataKey={dataKey} 
            fill={color} 
            radius={[4, 4, 0, 0]} 
          />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};
