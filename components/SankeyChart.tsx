import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface SankeyData {
  income: number;
  expenses: Array<{ category: string; value: number }>;
  savings: number;
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ data, height = 400 }) => {
  // Calculate total expenses
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.value, 0);
  
  // Prepare data for stacked bar visualization
  const chartData = [
    {
      name: 'Income',
      value: data.income,
      fill: '#3b82f6', // blue
    },
    ...data.expenses.map(exp => ({
      name: exp.category,
      value: exp.value,
      fill: '#ef4444', // red
    })),
    {
      name: 'Savings',
      value: data.savings,
      fill: '#10b981', // green
    }
  ];

  // Calculate percentages for the flow
  const expensePercent = (totalExpenses / data.income * 100).toFixed(1);
  const savingsPercent = (data.savings / data.income * 100).toFixed(1);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-app-card border border-app-border rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{payload[0].payload.name}</p>
          <p className="text-zinc-400 text-sm">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Flow Diagram using horizontal bars */}
      <div className="grid grid-cols-3 gap-4">
        {/* Income Column */}
        <div className="space-y-2">
          <div className="text-xs text-zinc-500 uppercase tracking-wider text-center">Income</div>
          <div className="bg-blue-500/20 border-2 border-blue-500 rounded-xl p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">${data.income.toFixed(0)}</div>
              <div className="text-xs text-zinc-400 mt-1">Total Income</div>
            </div>
          </div>
        </div>

        {/* Expenses Column */}
        <div className="space-y-2">
          <div className="text-xs text-zinc-500 uppercase tracking-wider text-center">Expenses</div>
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 space-y-2">
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-red-400">${totalExpenses.toFixed(0)}</div>
              <div className="text-xs text-zinc-400 mt-1">{expensePercent}% of income</div>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {data.expenses.map((exp, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-zinc-900/50 rounded p-2">
                  <span className="text-zinc-300">{exp.category}</span>
                  <span className="text-red-400 font-medium">${exp.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Savings Column */}
        <div className="space-y-2">
          <div className="text-xs text-zinc-500 uppercase tracking-wider text-center">Savings</div>
          <div className="bg-emerald-500/20 border-2 border-emerald-500 rounded-xl p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">${data.savings.toFixed(0)}</div>
              <div className="text-xs text-zinc-400 mt-1">{savingsPercent}% saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Flow Bars */}
      <div className="space-y-3">
        {/* Income to Expenses Flow */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Income → Expenses</span>
            <span>{expensePercent}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-red-500 h-full transition-all duration-500"
              style={{ width: `${expensePercent}%` }}
            ></div>
          </div>
        </div>

        {/* Income to Savings Flow */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Income → Savings</span>
            <span>{savingsPercent}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-500"
              style={{ width: `${savingsPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Chart */}
      <div style={{ width: '100%', height: height - 200 }}>
        <ResponsiveContainer>
          <BarChart 
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis type="number" stroke="#71717a" fontSize={12} tickFormatter={(value) => `$${value}`} />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#71717a" 
              fontSize={12}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
