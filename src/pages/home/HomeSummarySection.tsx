import React from 'react';
import { Card } from '../../ui/Card';
import { DollarSign } from 'lucide-react';
import { AreaChart } from '../../components/AreaChart';
import { NetWorthSummaryCard } from '../../components/NetWorthSummaryCard';

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
        <NetWorthSummaryCard
          totalNetWorth="$124,500.00"
          changeValue="+5.2%"
          changeLabel="this month"
          unrealizedPnl="+$12,450.32"
          realizedPnl="-$420.50"
        />
      </div>

      <Card title="Net Worth Growth">
        <AreaChart data={mockChartData} dataKey="value" height={200} color="#10b981" />
      </Card>
    </div>
  );
};
