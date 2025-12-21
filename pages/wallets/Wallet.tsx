import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { LineChart } from '../../components/LineChart';
import { Button } from '../../ui/Button';
import { PieChart } from '../../components/PieChart';
import { Modal } from '../../ui/Modal';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Banknote,
  Calendar,
  ChevronDown,
  Filter,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Currency } from '../../types';

// Mock data strictly for UI demo
const chartData = [
  { name: 'Jan', value: 40000 },
  { name: 'Feb', value: 42000 },
  { name: 'Mar', value: 41500 },
  { name: 'Apr', value: 43000 },
  { name: 'May', value: 45230 },
];

const pieData = [
  { name: 'BTC', value: 60, color: '#f59e0b' },
  { name: 'ETH', value: 30, color: '#6366f1' },
  { name: 'SOL', value: 10, color: '#10b981' },
];

const walletList = [
  { id: 'coinbase', name: 'Coinbase', balance: 45230.5, currency: Currency.EUR },
  { id: 'trading212', name: 'Trading212', balance: 28400, currency: Currency.EUR },
  { id: 'binance', name: 'Binance', balance: 12500.25, currency: Currency.USD },
  { id: 'chase', name: 'Chase Bank', balance: 8500, currency: Currency.USD },
];

const fxRates: Record<Currency, number> = {
  [Currency.EUR]: 1,
  [Currency.USD]: 0.92,
  [Currency.GBP]: 1.16,
  [Currency.CHF]: 1.02,
};

const holdingsData = [
  { ticker: 'CASH-EUR', name: 'Cash (EUR)', type: 'Cash', currency: Currency.EUR, units: 4200, dca: 1, price: 1, value: 4200, allocation: 18 },
  { ticker: 'CASH-USD', name: 'Cash (USD)', type: 'Cash', currency: Currency.USD, units: 2800, dca: 1, price: 1, value: 2800, allocation: 12 },
  { ticker: 'BTC', name: 'Bitcoin', type: 'Crypto', currency: Currency.USD, units: 0.65, dca: 52000, price: 68000, value: 44200, allocation: 40 },
  { ticker: 'ETH', name: 'Ethereum', type: 'Crypto', currency: Currency.USD, units: 6.5, dca: 2100, price: 3300, value: 21450, allocation: 20 },
  { ticker: 'NVDA', name: 'Nvidia', type: 'Equity', currency: Currency.USD, units: 12, dca: 520, price: 610, value: 7320, allocation: 10 },
];

const transactionsData = [
  { id: 't1', date: '2024-06-02', type: 'BUY', description: 'BTC buy', amount: 15000, currency: Currency.USD },
  { id: 't2', date: '2024-05-20', type: 'SELL', description: 'ETH partial sell', amount: 2500, currency: Currency.USD },
  { id: 't3', date: '2024-05-02', type: 'DIVIDEND', description: 'NVDA dividend', amount: 120, currency: Currency.USD },
  { id: 't4', date: '2024-04-14', type: 'FX', description: 'USD to EUR', amount: 5000, currency: Currency.EUR },
  { id: 't5', date: '2024-04-01', type: 'CASH', description: 'Deposit EUR', amount: 1500, currency: Currency.EUR },
  { id: 't6', date: '2024-03-16', type: 'BUY', description: 'NVDA buy', amount: 3000, currency: Currency.USD },
];

interface Props {
  onMenuClick: () => void;
}

export const WalletDetail: React.FC<Props> = ({ onMenuClick }) => {
  const { id } = useParams();
  const walletName = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Wallet';
  const displayCurrency = Currency.EUR;

  const [isTradeOpen, setTradeOpen] = useState(false);
  const [isDividendOpen, setDividendOpen] = useState(false);
  const [isFxOpen, setFxOpen] = useState(false);
  const [isCashOpen, setCashOpen] = useState(false);
  const [holdingFilter, setHoldingFilter] = useState('all');
  const [holdingSort, setHoldingSort] = useState<'allocation' | 'value' | 'ticker'>('value');
  const [txFilter, setTxFilter] = useState('all');
  const [txSort, setTxSort] = useState<'asc' | 'desc'>('desc');

  const formatCurrency = (amount: number, currency: Currency = displayCurrency) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const toDisplayCurrency = (amount: number, currency: Currency) => {
    const eurValue = currency === Currency.EUR ? amount : amount * fxRates[currency];
    return displayCurrency === Currency.EUR ? eurValue : eurValue / fxRates[displayCurrency];
  };

  const filteredHoldings = useMemo(() => {
    let rows = holdingsData;
    if (holdingFilter !== 'all') {
      rows = rows.filter((h) => h.type.toLowerCase() === holdingFilter);
    }

    return [...rows].sort((a, b) => {
      if (holdingSort === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (holdingSort === 'allocation') return b.allocation - a.allocation;
      const aDisplay = toDisplayCurrency(a.value, a.currency);
      const bDisplay = toDisplayCurrency(b.value, b.currency);
      return bDisplay - aDisplay;
    });
  }, [holdingFilter, holdingSort, displayCurrency]);

  const filteredTransactions = useMemo(() => {
    let rows = transactionsData;
    if (txFilter !== 'all') {
      rows = rows.filter((t) => t.type === txFilter);
    }

    return [...rows].sort((a, b) => {
      if (txSort === 'desc') return b.date.localeCompare(a.date);
      return a.date.localeCompare(b.date);
    });
  }, [txFilter, txSort]);

  const cashHoldings = holdingsData.filter((h) => h.type === 'Cash');
  const cashAvailable = cashHoldings.reduce(
    (acc, h) => acc + toDisplayCurrency(h.value, h.currency),
    0
  );
  const totalValueDisplay = holdingsData.reduce(
    (acc, h) => acc + toDisplayCurrency(h.value, h.currency),
    0
  );

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4 flex items-center gap-4">
         <Link to="/wallets" className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} />
         </Link>
         <h1 className="text-xl font-bold text-white">{walletName}</h1>
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid lg:grid-cols-[280px,1fr] gap-6">
          <div className="space-y-4 lg:sticky lg:top-24 h-fit">
            <Card title="Wallets">
              <div className="space-y-3">
                {walletList.map((wallet) => {
                  const isActive = wallet.id.toLowerCase() === (id ?? '').toLowerCase();
                  return (
                    <Link
                      key={wallet.id}
                      to={`/wallets/${wallet.id}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                        isActive
                          ? 'border-white/30 bg-white/5 text-white'
                          : 'border-app-border text-zinc-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-sm font-semibold">
                          {wallet.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{wallet.name}</p>
                          <p className="text-xs text-zinc-500">
                            {formatCurrency(wallet.balance, wallet.currency)}
                          </p>
                        </div>
                      </div>
                      <ChevronDown size={16} className="text-zinc-600" />
                    </Link>
                  );
                })}
              </div>
            </Card>

            <Card title="Quick Actions" className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                icon={<ArrowUpRight size={16} />}
                onClick={() => setTradeOpen(true)}
              >
                Add Trade
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                icon={<WalletIcon size={16} />}
                onClick={() => setDividendOpen(true)}
              >
                Add Dividend / Interest
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                icon={<ArrowRightLeft size={16} />}
                onClick={() => setFxOpen(true)}
              >
                Add FX Operation
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                icon={<Banknote size={16} />}
                onClick={() => setCashOpen(true)}
              >
                Deposit / Withdraw Cash
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Statistics Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Current Value</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalValueDisplay)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Invested</p>
                <p className="text-2xl font-bold text-zinc-300 mt-1">{formatCurrency(42030)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total PnL</p>
                <div className="flex items-center gap-1 mt-1 text-app-success">
                  <ArrowUpRight size={18} />
                  <span className="text-2xl font-bold">+{formatCurrency(3200.5)}</span>
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Cash Available</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(cashAvailable)}</p>
                <p className="text-xs text-zinc-500 mt-1">Converted to {displayCurrency}</p>
              </Card>
            </div>

            {/* Chart Section */}
            <Card title="Performance History" action={<Button variant="ghost" size="sm" icon={<Calendar size={14} />}>Last 6 months</Button>}>
              <LineChart data={chartData} dataKey="value" height={300} />
            </Card>

            {/* Holdings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="Allocation" className="lg:col-span-1">
                <PieChart data={pieData} height={250} />
              </Card>
              
              <Card
                title="Current Holdings"
                className="lg:col-span-2"
                action={
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={holdingFilter}
                      onChange={(e) => setHoldingFilter(e.target.value)}
                      className="bg-zinc-900 border border-app-border text-sm text-white rounded-lg px-3 py-2"
                    >
                      <option value="all">All types</option>
                      <option value="cash">Cash</option>
                      <option value="equity">Equity</option>
                      <option value="crypto">Crypto</option>
                    </select>
                    <select
                      value={holdingSort}
                      onChange={(e) => setHoldingSort(e.target.value as 'allocation' | 'value' | 'ticker')}
                      className="bg-zinc-900 border border-app-border text-sm text-white rounded-lg px-3 py-2"
                    >
                      <option value="value">Sort by Value</option>
                      <option value="allocation">Sort by Allocation</option>
                      <option value="ticker">Sort by Ticker</option>
                    </select>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase border-b border-app-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Asset</th>
                        <th className="px-4 py-3 font-medium text-right">Units</th>
                        <th className="px-4 py-3 font-medium text-right">DCA</th>
                        <th className="px-4 py-3 font-medium text-right">Price</th>
                        <th className="px-4 py-3 font-medium text-right">Value ({displayCurrency})</th>
                        <th className="px-4 py-3 font-medium text-right">Allocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {filteredHoldings.map((holding) => {
                        const displayValue = toDisplayCurrency(holding.value, holding.currency);
                        return (
                          <tr key={holding.ticker} className="group hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium text-white">
                              <div className="flex flex-col">
                                <span>{holding.name}</span>
                                <span className="text-xs text-zinc-500">{holding.type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-300">{holding.units.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(holding.dca, holding.currency)}</td>
                            <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(holding.price, holding.currency)}</td>
                            <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(displayValue, displayCurrency)}</td>
                            <td className="px-4 py-3 text-right text-zinc-300">{holding.allocation}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Transactions */}
            <Card
              title="Transaction History"
              action={
                <div className="flex flex-wrap gap-2">
                  <select
                    value={txFilter}
                    onChange={(e) => setTxFilter(e.target.value)}
                    className="bg-zinc-900 border border-app-border text-sm text-white rounded-lg px-3 py-2"
                  >
                    <option value="all">All types</option>
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                    <option value="DIVIDEND">Dividend</option>
                    <option value="FX">FX</option>
                    <option value="CASH">Cash</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Filter size={14} />}
                    onClick={() => setTxSort(txSort === 'desc' ? 'asc' : 'desc')}
                  >
                    Sort {txSort === 'desc' ? '↓' : '↑'}
                  </Button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 uppercase border-b border-app-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{tx.date}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-white/5 border border-app-border text-white">
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{tx.description}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {formatCurrency(toDisplayCurrency(tx.amount, tx.currency), displayCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <AddTradeModal isOpen={isTradeOpen} onClose={() => setTradeOpen(false)} />
      <AddDividendModal isOpen={isDividendOpen} onClose={() => setDividendOpen(false)} />
      <AddFxModal isOpen={isFxOpen} onClose={() => setFxOpen(false)} />
      <AddCashModal isOpen={isCashOpen} onClose={() => setCashOpen(false)} />
    </div>
  );
};

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTradeModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Trade" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Asset Type</label>
            <select className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white">
              <option>Stock</option>
              <option>ETF</option>
              <option>Crypto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Operation</label>
            <div className="flex bg-zinc-900 p-1 rounded-lg">
              {['BUY', 'SELL'].map((action) => (
                <button
                  key={action}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md text-white transition-colors ${
                    action === 'BUY' ? 'bg-zinc-800' : 'hover:bg-zinc-800'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Ticker</label>
            <input
              type="text"
              placeholder="e.g., NVDA"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Link to Pie (optional)</label>
            <select className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white">
              <option>None</option>
              <option>Tech Growth</option>
              <option>Core ETF</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Price</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
              <select className="w-28 bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white">
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>CHF</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">FX Pair &amp; Rate</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="USD/EUR"
                className="flex-1 bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
              <input
                type="number"
                placeholder="0.92"
                className="w-28 bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Units</label>
            <input
              type="number"
              placeholder="0.0000"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Time (optional)</label>
              <input
                type="time"
                className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Fees</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Tax</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-app-border rounded-xl p-3 space-y-2">
          <p className="text-xs text-zinc-400">Trade Summary</p>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <span>Stock Value: $0.00</span>
            <span>FX Adjusted: €0.00</span>
            <span>Est. PnL (SELL): €0.00</span>
          </div>
        </div>

        <Button className="w-full">Save Trade</Button>
      </div>
    </Modal>
  );
};

const AddDividendModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Dividend or Interest" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
            <div className="flex bg-zinc-900 p-1 rounded-lg">
              {['Dividend', 'Interest'].map((option) => (
                <button
                  key={option}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md text-white transition-colors ${
                    option === 'Dividend' ? 'bg-zinc-800' : 'hover:bg-zinc-800'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Ticker (for dividend)</label>
            <input
              type="text"
              placeholder="e.g., NVDA"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Amount</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Currency</label>
            <select className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>CHF</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Tax</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <Button className="w-full">Save Dividend</Button>
      </div>
    </Modal>
  );
};

const AddFxModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add FX Operation" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Origin Currency</label>
            <select className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>CHF</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Destination Currency</label>
            <select className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white">
              <option>EUR</option>
              <option>USD</option>
              <option>GBP</option>
              <option>CHF</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Amount</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Rate</label>
            <input
              type="number"
              placeholder="0.0000"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Fees</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <Button className="w-full">Save FX Operation</Button>
      </div>
    </Modal>
  );
};

const AddCashModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deposit or Withdraw Cash" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Action</label>
            <div className="flex bg-zinc-900 p-1 rounded-lg">
              {['Deposit', 'Withdraw'].map((action) => (
                <button
                  key={action}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md text-white transition-colors ${
                    action === 'Deposit' ? 'bg-zinc-800' : 'hover:bg-zinc-800'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Currency</label>
            <select className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white">
              <option>EUR</option>
              <option>USD</option>
              <option>GBP</option>
              <option>CHF</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Amount</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-zinc-400 mb-1">Note</label>
            <textarea
              placeholder="Optional description for the cash movement"
              className="w-full bg-zinc-900 border border-app-border rounded-lg px-3 py-2 text-white min-h-[80px]"
            />
          </div>
        </div>

        <Button className="w-full">Save Cash Movement</Button>
      </div>
    </Modal>
  );
};
