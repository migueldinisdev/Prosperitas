import React, { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { HomeSummarySection } from './HomeSummarySection';
import { Button } from '../../ui/Button';
import { Plus } from 'lucide-react';
import { AddBalanceTransactionModal } from '../../components/AddBalanceTransactionModal';

interface Props {
  onMenuClick: () => void;
}

export const HomePage: React.FC<Props> = ({ onMenuClick }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="pb-20">
      <PageHeader 
        title="Home" 
        subtitle="Your financial overview" 
        onMenuClick={onMenuClick}
        action={
          <Button onClick={() => setIsModalOpen(true)} size="sm" icon={<Plus size={16} />}>
            Add Transaction
          </Button>
        }
      />
      
      <main className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        <HomeSummarySection />
      </main>

      <AddBalanceTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};