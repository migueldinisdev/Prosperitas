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
      <div className="grid grid-cols-1 gap-6">
        <Card className="md:col-span-1">
          <p className="text-zinc-400 text-sm font-medium mb-1">Total Net Worth</p>
          <h2 className="text-4xl font-bold text-white tracking-tight mb-2">$124,500.00</h2>
          <div className="flex items-center gap-1 text-app-success text-sm font-medium bg-emerald-500/10 w-fit px-2 py-1 rounded-full mb-4">
            <ArrowUpRight size={14} />
            <span>+5.2% this month</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-app-success">
                  <ArrowUpRight size={16} />
                </div>
                <p className="text-zinc-400 text-xs font-medium">Unrealized PnL</p>
              </div>
              <p className="text-xl font-bold text-app-success">+$12,450.32</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-rose-500/10 rounded-lg text-app-danger">
                  <ArrowDownRight size={16} />
                </div>
                <p className="text-zinc-400 text-xs font-medium">Realized PnL (YTD)</p>
              </div>
              <p className="text-xl font-bold text-app-danger">-$420.50</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Net Worth Growth">
        <LineChart data={mockChartData} dataKey="value" height={200} color="#10b981" />
      </Card>
    </div>
  );
};