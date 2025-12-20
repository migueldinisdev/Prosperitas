import React from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { PieChart } from '../../components/PieChart';

const assetTypeData = [
  { name: 'Stocks', value: 45, color: '#3b82f6' },
  { name: 'Crypto', value: 30, color: '#f59e0b' },
  { name: 'Cash', value: 15, color: '#10b981' },
  { name: 'Real Estate', value: 10, color: '#8b5cf6' },
];

const currencyData = [
  { name: 'USD', value: 70, color: '#22c55e' },
  { name: 'EUR', value: 20, color: '#0ea5e9' },
  { name: 'GBP', value: 10, color: '#6366f1' },
];

interface Props {
  onMenuClick: () => void;
}

export const StatisticsPage: React.FC<Props> = ({ onMenuClick }) => {
  return (
    <div className="pb-20">
      <PageHeader 
        title="Statistics" 
        subtitle="Global portfolio analysis"
        onMenuClick={onMenuClick}
      />
      
      <main className="p-6 max-w-7xl mx-auto space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Allocation by Asset Class">
               <PieChart data={assetTypeData} height={300} />
               <div className="mt-4 grid grid-cols-2 gap-2">
                  {assetTypeData.map(d => (
                     <div key={d.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-zinc-300">{d.name}</span>
                        <span className="text-zinc-500 ml-auto">{d.value}%</span>
                     </div>
                  ))}
               </div>
            </Card>

            <Card title="Currency Exposure">
               <PieChart data={currencyData} height={300} />
               <div className="mt-4 grid grid-cols-2 gap-2">
                  {currencyData.map(d => (
                     <div key={d.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-zinc-300">{d.name}</span>
                        <span className="text-zinc-500 ml-auto">{d.value}%</span>
                     </div>
                  ))}
               </div>
            </Card>
         </div>
      </main>
    </div>
  );
};