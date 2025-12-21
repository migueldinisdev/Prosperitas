import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { LineChart } from '../../components/LineChart';
import { Button } from '../../ui/Button';
import { PieChart } from '../../components/PieChart';
import { ArrowLeft, ArrowUpRight, DollarSign, Wallet as WalletIcon } from 'lucide-react';
import { HoldingsTable, HoldingRow } from '../../components/HoldingsTable';

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

const holdings: HoldingRow[] = [
  {
    asset: 'Bitcoin',
    ticker: 'BTC',
    units: 0.8,
    price: 34200,
    value: 27360,
    pnl: 2400,
    pnlPercent: 9.6,
    allocation: 60,
  },
  {
    asset: 'Ethereum',
    ticker: 'ETH',
    units: 7.3,
    price: 1850,
    value: 13505,
    pnl: 850,
    pnlPercent: 6.7,
    allocation: 30,
  },
  {
    asset: 'Solana',
    ticker: 'SOL',
    units: 9.8,
    price: 65,
    value: 637,
    pnl: -120,
    pnlPercent: -15.8,
    allocation: 10,
  },
];

interface Props {
  onMenuClick: () => void;
}

export const WalletDetail: React.FC<Props> = ({ onMenuClick }) => {
  const { id } = useParams();
  const walletName = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Wallet';

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4 flex items-center gap-4">
         <Link to="/wallets" className="p-2 -ml-2 text-app-muted hover:text-app-foreground rounded-lg hover:bg-app-surface transition-colors">
            <ArrowLeft size={20} />
         </Link>
         <h1 className="text-xl font-bold text-app-foreground">{walletName}</h1>
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card title="Quick Actions">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="primary"
              className="w-full"
              icon={<ArrowUpRight size={16} />}
            >
              Add Trade
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              icon={<DollarSign size={16} />}
            >
              Transfer to Balance
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              icon={<WalletIcon size={16} />}
            >
              Add Dividend
            </Button>
          </div>
        </Card>

        {/* Statistics Header */}
        <Card className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-app-muted uppercase tracking-wider font-semibold mb-1">Current Value</p>
              <p className="text-2xl font-bold text-app-foreground">$45,230.50</p>
            </div>
            <div>
              <p className="text-xs text-app-muted uppercase tracking-wider font-semibold mb-1">Invested</p>
              <p className="text-2xl font-bold text-app-foreground">$42,030.00</p>
            </div>
            <div>
              <p className="text-xs text-app-muted uppercase tracking-wider font-semibold mb-1">Total PnL</p>
              <div className="flex items-center gap-1 text-app-success">
                <ArrowUpRight size={18} />
                <span className="text-2xl font-bold">+$3,200.50</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Chart Section */}
        <Card title="Performance History">
           <LineChart data={chartData} dataKey="value" height={300} />
        </Card>

        {/* Holdings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card title="Allocation" className="lg:col-span-1">
              <PieChart data={pieData} height={250} />
           </Card>
           
           <Card title="Holdings" className="lg:col-span-2">
              <HoldingsTable holdings={holdings} />
           </Card>
        </div>
      </main>
    </div>
  );
};
