import React from 'react';
import { ResponsiveContainer, LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, dataKey, color = '#3b82f6', height = 300 }) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ReLineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
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
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
            cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 6, fill: color, stroke: '#09090b', strokeWidth: 2 }} 
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
};