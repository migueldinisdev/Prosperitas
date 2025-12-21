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
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                type === t ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Amount</label>
          <input 
            type="number" 
            placeholder="0.00" 
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-app-border rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Category</label>
          <select className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-app-border rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white">
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