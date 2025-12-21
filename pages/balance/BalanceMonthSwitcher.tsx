import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export const BalanceMonthSwitcher: React.FC = () => {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-app-card border border-zinc-200 dark:border-app-border rounded-xl p-2 mb-6">
      <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
        <ChevronLeft size={20} />
      </button>
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-zinc-500" />
        <span className="font-semibold text-zinc-900 dark:text-white">October 2023</span>
      </div>
      <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};