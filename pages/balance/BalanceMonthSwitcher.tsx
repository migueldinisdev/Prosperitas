import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export const BalanceMonthSwitcher: React.FC = () => {
  return (
    <div className="flex items-center justify-between bg-app-card bg-app-card border border-app-border border-app-border rounded-xl p-2 mb-6">
      <button className="p-2 hover:bg-app-card rounded-lg text-app-text-secondary hover:text-app-text-primary transition-colors">
        <ChevronLeft size={20} />
      </button>
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-zinc-500" />
        <span className="font-semibold text-app-text-primary">October 2023</span>
      </div>
      <button className="p-2 hover:bg-app-card rounded-lg text-app-text-secondary hover:text-app-text-primary transition-colors">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};