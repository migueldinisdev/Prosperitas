import React from 'react';
import { Menu } from 'lucide-react';
import { DisplayCurrencySelector } from './DisplayCurrencySelector';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onMenuClick: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, onMenuClick }) => {
  return (
    <header className="sticky top-0 z-30 bg-zinc-50/80 dark:bg-app-bg/80 backdrop-blur-md border-b border-zinc-200 dark:border-app-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <DisplayCurrencySelector />
          </div>
          {action}
        </div>
      </div>
    </header>
  );
};