import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Sun, Moon } from 'lucide-react';

interface Props {
  onMenuClick: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onMenuClick }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Read current theme on mount
    const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark';
    setTheme(currentTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };
  
  return (
    <div>
       <PageHeader title="Settings" onMenuClick={onMenuClick} />
       <main className="p-6 max-w-4xl mx-auto space-y-6">
          <Card title="Appearance">
             <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-app-text-primary block font-medium">Theme</span>
                  <span className="text-sm text-app-text-secondary">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border rounded-lg hover:opacity-90 transition-all"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <><Sun size={18} className="text-app-text-secondary" /><span className="text-sm text-app-text-primary">Light</span></>
                  ) : (
                    <><Moon size={18} className="text-app-text-secondary" /><span className="text-sm text-app-text-primary">Dark</span></>
                  )}
                </button>
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