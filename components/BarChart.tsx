import React from 'react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, dataKey, color = '#3b82f6', height = 300 }) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ReBarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#27272a', opacity: 0.4 }}
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
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