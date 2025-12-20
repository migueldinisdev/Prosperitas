import React from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface Props {
  onMenuClick: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onMenuClick }) => {
  return (
    <div>
       <PageHeader title="Settings" onMenuClick={onMenuClick} />
       <main className="p-6 max-w-4xl mx-auto space-y-6">
          <Card title="Appearance">
             <div className="flex items-center justify-between py-2">
                <span className="text-zinc-300">Dark Mode</span>
                <div className="w-10 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                   <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
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