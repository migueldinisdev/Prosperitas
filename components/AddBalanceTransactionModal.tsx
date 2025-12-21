import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBalanceTransactionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [type, setType] = useState('expense');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
      <div className="space-y-4">
        <div className="flex bg-app-bg p-1 rounded-lg">
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                type === t ? 'bg-app-card text-app-text-primary shadow-sm' : 'text-app-text-secondary hover:text-app-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-app-text-secondary mb-1">Amount</label>
          <input 
            type="number" 
            placeholder="0.00" 
            className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text-primary focus:outline-none focus:ring-1 focus:ring-app-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-app-text-secondary mb-1">Category</label>
          <select className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text-primary focus:outline-none focus:ring-1 focus:ring-app-primary">
            <option>Groceries</option>
            <option>Rent</option>
            <option>Entertainment</option>
            <option>Salary</option>
          </select>
        </div>

        <div className="pt-2">
           <Button className="w-full">Save Transaction</Button>
        </div>
      </div>
    </Modal>
  );
};