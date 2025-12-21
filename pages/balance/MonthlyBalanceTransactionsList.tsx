import React from 'react';
import { ArrowUpRight, ArrowDownRight, Coffee, ShoppingBag, Home, RefreshCw } from 'lucide-react';

const transactions = [
  { id: 1, title: 'Whole Foods Market', cat: 'Groceries', amount: -142.50, date: 'Oct 24', type: 'expense', icon: ShoppingBag },
  { id: 2, title: 'Monthly Salary', cat: 'Income', amount: 4200.00, date: 'Oct 23', type: 'income', icon: ArrowUpRight },
  { id: 3, title: 'Transfer to Trading212', cat: 'Investment', amount: -500.00, date: 'Oct 22', type: 'transfer', icon: RefreshCw },
  { id: 4, title: 'Starbucks', cat: 'Food & Drink', amount: -6.50, date: 'Oct 21', type: 'expense', icon: Coffee },
  { id: 5, title: 'Rent Payment', cat: 'Housing', amount: -1800.00, date: 'Oct 01', type: 'expense', icon: Home },
  { id: 6, title: 'Amazon Purchase', cat: 'Shopping', amount: -89.99, date: 'Oct 20', type: 'expense', icon: ShoppingBag },
  { id: 7, title: 'Freelance Work', cat: 'Income', amount: 850.00, date: 'Oct 18', type: 'income', icon: ArrowUpRight },
  { id: 8, title: 'Gym Membership', cat: 'Health', amount: -45.00, date: 'Oct 15', type: 'expense', icon: Coffee },
  { id: 9, title: 'Restaurant Dinner', cat: 'Food & Drink', amount: -67.50, date: 'Oct 14', type: 'expense', icon: Coffee },
  { id: 10, title: 'Gas Station', cat: 'Transport', amount: -52.00, date: 'Oct 12', type: 'expense', icon: ShoppingBag },
];

export const MonthlyBalanceTransactionsList: React.FC = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-app-foreground px-1">Transactions</h3>
      <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
        {/* Scrollable container with fixed height */}
        <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {transactions.map((t, i) => (
            <div 
              key={t.id} 
              className={`flex items-center justify-between p-4 hover:bg-app-surface transition-colors cursor-pointer ${
                i !== transactions.length - 1 ? 'border-b border-app-border' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' :
                  t.type === 'transfer' ? 'bg-blue-500/10 text-blue-500' : 'bg-app-surface text-app-muted'
                }`}>
                  <t.icon size={18} />
                </div>
                <div>
                  <p className="font-medium text-app-foreground">{t.title}</p>
                  <p className="text-xs text-app-muted">{t.cat} • {t.date}</p>
                </div>
              </div>
              <span className={`font-semibold ${
                t.amount > 0 ? 'text-app-success' : 'text-app-foreground'
              }`}>
                {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <button className="w-full text-center text-sm text-app-muted hover:text-app-foreground py-2 transition-colors">
        View all transactions
      </button>
    </div>
  );
};
