import React from 'react';
import { Card } from '../../ui/Card';
import { Plus } from 'lucide-react';

interface AddWalletCardProps {
  onClick: () => void;
}

export const AddWalletCard: React.FC<AddWalletCardProps> = ({ onClick }) => {
  return (
    <button onClick={onClick} className="w-full h-full text-left" aria-label="Add new wallet">
      <Card className="hover:bg-zinc-900/80 transition-colors group h-full flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform mb-4">
          <Plus size={24} className="text-zinc-400" />
        </div>
        
        <h3 className="text-zinc-400 text-sm font-medium">Add Wallet</h3>
      </Card>
    </button>
  );
};
