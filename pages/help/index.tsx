import React from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';

interface Props {
  onMenuClick: () => void;
}

export const HelpPage: React.FC<Props> = ({ onMenuClick }) => {
  return (
    <div>
       <PageHeader title="Help & Support" onMenuClick={onMenuClick} />
       <main className="p-6 max-w-4xl mx-auto">
          <Card>
             <h3 className="text-lg font-semibold text-white mb-2">Documentation</h3>
             <p className="text-zinc-400 text-sm">Learn how to calculate PnL, connect API keys, and manage your pies.</p>
          </Card>
       </main>
    </div>
  );
};