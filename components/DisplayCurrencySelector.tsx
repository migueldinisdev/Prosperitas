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
              ? 'bg-app-primary text-white shadow-sm' 
              : 'text-app-muted hover:text-app-foreground'
          }`}
        >
          {curr}
        </button>
      ))}
    </div>
  );
};
