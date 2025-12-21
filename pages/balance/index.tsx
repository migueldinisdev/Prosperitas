import React, { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { BalanceMonthSwitcher } from './BalanceMonthSwitcher';
import { MonthlyBalanceTransactionsList } from './MonthlyBalanceTransactionsList';
import { BalanceCategorySpendingSection } from './BalanceCategorySpendingSection';
import { BalanceSankeySection } from './BalanceSankeySection';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { AddBalanceTransactionModal } from '../../components/AddBalanceTransactionModal';
import { ManageCategoriesModal } from '../../components/ManageCategoriesModal';

interface Props {
  onMenuClick: () => void;
}

export const BalancePage: React.FC<Props> = ({ onMenuClick }) => {
  const [isAddTxOpen, setAddTxOpen] = useState(false);
  const [isCategoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <div className="pb-20">
      <PageHeader 
        title="Balance" 
        subtitle="Manage income and expenses"
        onMenuClick={onMenuClick}
        action={
          <div className="flex gap-2">
             <Button 
               variant="secondary" 
               size="sm" 
               icon={<SlidersHorizontal size={14} />}
               onClick={() => setCategoriesOpen(true)}
             >
               Categories
             </Button>
             <Button onClick={() => setAddTxOpen(true)} size="sm" icon={<Plus size={16} />}>Add</Button>
          </div>
        }
      />
      
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <BalanceMonthSwitcher />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card title="Savings Rate">
              <div className="flex items-end gap-2 mb-2">
                 <span className="text-4xl font-bold text-white">42%</span>
                 <span className="text-zinc-500 mb-1">this month</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                 <div className="bg-emerald-500 h-full w-[42%]"></div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">+$450 vs monthly average</p>
           </Card>
           
           <Card title="Cash Flow">
              <div className="space-y-2 mt-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Income</span>
                    <span className="text-white font-medium">$4,200.00</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Expenses</span>
                    <span className="text-white font-medium">-$2,450.00</span>
                 </div>
                 <div className="h-px bg-app-border my-2"></div>
                 <div className="flex justify-between text-base font-semibold">
                    <span className="text-zinc-300">Net Savings</span>
                    <span className="text-app-success">+$1,750.00</span>
                 </div>
              </div>
           </Card>
        </div>

        {/* Transactions List - Full Width with Scrollable Container */}
        <div className="w-full">
           <MonthlyBalanceTransactionsList />
        </div>

        {/* Spending by Category - Full Width */}
        <div className="w-full">
           <BalanceCategorySpendingSection />
        </div>

        {/* Sankey Flow Chart - Full Width */}
        <div className="w-full">
           <BalanceSankeySection />
        </div>
      </main>

      <AddBalanceTransactionModal isOpen={isAddTxOpen} onClose={() => setAddTxOpen(false)} />
      <ManageCategoriesModal isOpen={isCategoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  );
};