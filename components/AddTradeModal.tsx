import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Currency } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTradeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [assetType, setAssetType] = useState<'stock' | 'ETF' | 'crypto'>('stock');
  const [operation, setOperation] = useState<'BUY' | 'SELL'>('BUY');
  const [ticker, setTicker] = useState('');
  const [selectedPie, setSelectedPie] = useState('');
  const [price, setPrice] = useState('');
  const [stockCurrency, setStockCurrency] = useState<Currency>(Currency.USD);
  const [fxPair, setFxPair] = useState('USDEUR');
  const [fxRate, setFxRate] = useState('');
  const [units, setUnits] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [fees, setFees] = useState('');
  const [tax, setTax] = useState('');

  // Calculate stock value (units × price)
  const stockValue = units && price ? (parseFloat(units) * parseFloat(price)).toFixed(2) : '0.00';
  
  // Calculate FX converted value (stock value × fx rate)
  const fxConvertedValue = stockValue && fxRate 
    ? (parseFloat(stockValue) * parseFloat(fxRate)).toFixed(2) 
    : '0.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!ticker || !price || !fxRate || !units) {
      return;
    }

    // TODO: Submit trade data to state management when implemented
    // For now, just close the modal
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Trade">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset Type */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Asset Type</label>
          <div className="flex bg-zinc-900 p-1 rounded-lg">
            {(['stock', 'ETF', 'crypto'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAssetType(type)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                  assetType === type ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Operation Type */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Operation</label>
          <div className="flex bg-zinc-900 p-1 rounded-lg">
            {(['BUY', 'SELL'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setOperation(op)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  operation === op 
                    ? op === 'BUY' 
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' 
                      : 'bg-rose-500/20 text-rose-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Ticker</label>
          <input 
            type="text" 
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL, BTC, VOO" 
            className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white uppercase"
            required
          />
        </div>

        {/* Pie Selection (only for BUY) */}
        {operation === 'BUY' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Pie (optional)
            </label>
            <select 
              value={selectedPie}
              onChange={(e) => setSelectedPie(e.target.value)}
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              <option value="">-- Select Pie --</option>
              {/* TODO: Replace with dynamic pie list from application state */}
              <option value="tech">Tech Growth</option>
              <option value="dividend">Dividend Portfolio</option>
              <option value="crypto">Crypto Holdings</option>
            </select>
          </div>
        )}

        {/* Price and Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Price</label>
            <input 
              type="number" 
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00" 
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Currency</label>
            <select 
              value={stockCurrency}
              onChange={(e) => setStockCurrency(e.target.value as Currency)}
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              {Object.values(Currency).map((curr) => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* FX Pair and Rate */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">FX Pair</label>
            <input 
              type="text" 
              value={fxPair}
              onChange={(e) => setFxPair(e.target.value.toUpperCase())}
              placeholder="USDEUR" 
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">FX Rate</label>
            <input 
              type="number" 
              step="0.000001"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              placeholder="0.00" 
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
              required
            />
          </div>
        </div>

        {/* Units */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Units</label>
          <input 
            type="number" 
            step="0.00000001"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder="0.00" 
            className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
            required
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Time (optional)
            </label>
            <input 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        </div>

        {/* Fees and Tax */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Fees</label>
            <input 
              type="number" 
              step="0.01"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              placeholder="0.00" 
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Tax</label>
            <input 
              type="number" 
              step="0.01"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              placeholder="0.00" 
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        </div>

        {/* Value Summary */}
        <div className="bg-zinc-900 border border-app-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Stock Value ({stockCurrency}):</span>
            <span className="text-white font-medium">{stockValue}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Converted Value:</span>
            <span className="text-white font-medium">{fxConvertedValue}</span>
          </div>
          {fees && parseFloat(fees) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Fees:</span>
              <span className="text-rose-400">-{parseFloat(fees).toFixed(2)}</span>
            </div>
          )}
          {tax && parseFloat(tax) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Tax:</span>
              <span className="text-rose-400">-{parseFloat(tax).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Profit calculation for SELL */}
        {operation === 'SELL' && (
          <div className="bg-zinc-900 border border-amber-500/20 rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-2">Estimated Profit (requires cost average)</p>
            <p className="text-sm text-zinc-500">
              Profit = (Units × Sell Price × FX Rate) - (Units × Cost Average in display currency) - Fees - Tax
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <Button type="submit" className="w-full">
            {operation === 'BUY' ? 'Add Buy Order' : 'Add Sell Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
