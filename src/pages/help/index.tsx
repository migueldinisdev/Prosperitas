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
             <h3 className="text-lg font-semibold text-app-foreground mb-2">Documentation</h3>
             <p className="text-app-muted text-sm">Learn how to calculate PnL, connect integrations, and manage your pies.</p>
          </Card>
       </main>
    </div>
  );
};
