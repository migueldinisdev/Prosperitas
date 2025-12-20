import React, { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { WalletCard } from './WalletCard';
import { Button } from '../../ui/Button';
import { Plus } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface Props {
  onMenuClick: () => void;
}

export const WalletsPage: React.FC<Props> = ({ onMenuClick }) => {
  const [isAddOpen, setAddOpen] = useState(false);

  return (
    <div className="pb-20">
      <PageHeader 
        title="Wallets" 
        subtitle="Your connected exchanges and accounts"
        onMenuClick={onMenuClick}
        action={
          <Button onClick={() => setAddOpen(true)} size="sm" icon={<Plus size={16} />}>
            Add Wallet
          </Button>
        }
      />
      
      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <WalletCard name="Coinbase" balance={45230.50} pnl={3200.10} type="Crypto" />
           <WalletCard name="Trading212" balance={28400.00} pnl={-150.00} type="Stocks" />
           <WalletCard name="Binance" balance={12500.25} pnl={850.40} type="Crypto" />
           <WalletCard name="Chase Bank" balance={8500.00} pnl={0} type="Cash" />
        </div>
      </main>

      <Modal isOpen={isAddOpen} onClose={() => setAddOpen(false)} title="Add New Wallet">
        <div className="space-y-4">
           <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Platform Name</label>
              <input type="text" className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white" />
           </div>
           <Button className="w-full">Create Wallet</Button>
        </div>
      </Modal>
    </div>
  );
};