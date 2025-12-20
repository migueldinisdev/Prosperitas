import React from 'react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ data, height = 300 }) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
             itemStyle={{ color: '#e4e4e7' }}
          />
          <Legend iconType="circle" />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
};