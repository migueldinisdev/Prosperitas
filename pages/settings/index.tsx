import React from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  onMenuClick: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onMenuClick }) => {
  const { theme } = useTheme();
  
  return (
    <div>
       <PageHeader title="Settings" onMenuClick={onMenuClick} />
       <main className="p-6 max-w-4xl mx-auto space-y-6">
          <Card title="Appearance">
             <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-zinc-900 dark:text-zinc-300 block">Theme</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-500">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                <ThemeToggle />
             </div>
          </Card>
          
          <Card title="Data Management">
             <div className="space-y-4">
                <Button variant="secondary" className="w-full justify-start">Export Data (CSV)</Button>
                <Button variant="danger" className="w-full justify-start">Delete Account</Button>
             </div>
          </Card>
       </main>
    </div>
  );
};