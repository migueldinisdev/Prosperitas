import React, { useState } from 'react';
import { Currency } from '../types';

export const DisplayCurrencySelector: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(Currency.USD);

  return (
    <div className="flex items-center bg-app-card border border-app-border rounded-lg p-1">
      {[Currency.EUR, Currency.USD, Currency.GBP].map((curr) => (
        <button
          key={curr}
          onClick={() => setSelectedCurrency(curr)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
            curr === selectedCurrency 
              ? 'bg-zinc-700 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {curr}
        </button>
      ))}
    </div>
  );
};