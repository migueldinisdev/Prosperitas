import React from 'react';
import { ArrowUpRight, ArrowDownRight, Coffee, ShoppingBag, Home, RefreshCw } from 'lucide-react';

const transactions = [
  { id: 1, title: 'Whole Foods Market', cat: 'Groceries', amount: -142.50, date: 'Oct 24', type: 'expense', icon: ShoppingBag },
  { id: 2, title: 'Monthly Salary', cat: 'Income', amount: 4200.00, date: 'Oct 23', type: 'income', icon: ArrowUpRight },
  { id: 3, title: 'Transfer to Trading212', cat: 'Investment', amount: -500.00, date: 'Oct 22', type: 'transfer', icon: RefreshCw },
  { id: 4, title: 'Starbucks', cat: 'Food & Drink', amount: -6.50, date: 'Oct 21', type: 'expense', icon: Coffee },
  { id: 5, title: 'Rent Payment', cat: 'Housing', amount: -1800.00, date: 'Oct 01', type: 'expense', icon: Home },
];

export const MonthlyBalanceTransactionsList: React.FC = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-app-text-primary px-1">Transactions</h3>
      <div className="bg-app-card bg-app-card border border-app-border border-app-border rounded-2xl overflow-hidden">
        {transactions.map((t, i) => (
          <div 
            key={t.id} 
            className={`flex items-center justify-between p-4 hover:bg-app-card/50 transition-colors cursor-pointer ${
              i !== transactions.length - 1 ? 'border-b border-app-border border-app-border' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' :
                t.type === 'transfer' ? 'bg-blue-500/10 text-blue-500' : 'bg-app-card text-app-text-secondary'
              }`}>
                <t.icon size={18} />
              </div>
              <div>
                <p className="font-medium text-app-text-primary">{t.title}</p>
                <p className="text-xs text-zinc-500">{t.cat} • {t.date}</p>
              </div>
            </div>
            <span className={`font-semibold ${
              t.amount > 0 ? 'text-app-success' : 'text-app-text-primary text-app-text-primary'
            }`}>
              {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <button className="w-full text-center text-sm text-app-text-secondary hover:text-app-text-primary hover:text-app-text-secondary py-2">
        View all transactions
      </button>
    </div>
  );
};