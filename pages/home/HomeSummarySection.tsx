import React from 'react';
import { Card } from '../../ui/Card';
import { ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { LineChart } from '../../components/LineChart';

const mockChartData = [
  { name: 'Jan', value: 105000 },
  { name: 'Feb', value: 108000 },
  { name: 'Mar', value: 106000 },
  { name: 'Apr', value: 112000 },
  { name: 'May', value: 118000 },
  { name: 'Jun', value: 124500 },
];

export const HomeSummarySection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <p className="text-zinc-400 text-sm font-medium mb-1">Total Net Worth</p>
          <h2 className="text-4xl font-bold text-white tracking-tight mb-2">$124,500.00</h2>
          <div className="flex items-center gap-1 text-app-success text-sm font-medium bg-emerald-500/10 w-fit px-2 py-1 rounded-full">
            <ArrowUpRight size={14} />
            <span>+5.2% this month</span>
          </div>
        </Card>
        
        <Card className="md:col-span-2" title="Net Worth Growth">
          <LineChart data={mockChartData} dataKey="value" height={200} color="#10b981" />
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
           <div className="flex justify-between items-start">
             <div>
               <p className="text-zinc-400 text-sm font-medium">Unrealized PnL</p>
               <p className="text-2xl font-bold text-app-success mt-1">+$12,450.32</p>
             </div>
             <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
               <ArrowUpRight size={20} />
             </div>
           </div>
        </Card>
        <Card>
           <div className="flex justify-between items-start">
             <div>
               <p className="text-zinc-400 text-sm font-medium">Realized PnL (YTD)</p>
               <p className="text-2xl font-bold text-app-danger mt-1">-$420.50</p>
             </div>
             <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
               <ArrowDownRight size={20} />
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
};