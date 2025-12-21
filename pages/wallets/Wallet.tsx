import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { LineChart } from '../../components/LineChart';
import { Button } from '../../ui/Button';
import { PieChart } from '../../components/PieChart';
import { ArrowLeft, ArrowUpRight, DollarSign, Wallet as WalletIcon } from 'lucide-react';
import { AddTradeModal } from '../../components/AddTradeModal';

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

interface Props {
  onMenuClick: () => void;
}

export const WalletDetail: React.FC<Props> = ({ onMenuClick }) => {
  const { id } = useParams();
  const walletName = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Wallet';
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4 flex items-center gap-4">
         <Link to="/wallets" className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} />
         </Link>
         <h1 className="text-xl font-bold text-white">{walletName}</h1>
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Statistics Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Card className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Current Value</p>
              <p className="text-2xl font-bold text-white mt-1">$45,230.50</p>
           </Card>
           <Card className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Invested</p>
              <p className="text-2xl font-bold text-zinc-300 mt-1">$42,030.00</p>
           </Card>
           <Card className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total PnL</p>
              <div className="flex items-center gap-1 mt-1 text-app-success">
                 <ArrowUpRight size={18} />
                 <span className="text-2xl font-bold">+$3,200.50</span>
              </div>
           </Card>
           <Card className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Cash Available</p>
              <p className="text-2xl font-bold text-white mt-1">$1,200.00</p>
           </Card>
        </div>

        {/* Chart Section */}
        <Card title="Performance History">
           <LineChart data={chartData} dataKey="value" height={300} />
        </Card>

        {/* Operations */}
        <div className="flex flex-wrap gap-4">
           <Button variant="secondary" icon={<DollarSign size={16} />}>Transfer to Balance</Button>
           <Button variant="secondary" icon={<WalletIcon size={16} />}>Add Dividend</Button>
           <Button variant="primary" icon={<ArrowUpRight size={16} />} onClick={() => setTradeModalOpen(true)}>Add Trade</Button>
        </div>

        {/* Holdings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card title="Allocation" className="lg:col-span-1">
              <PieChart data={pieData} height={250} />
           </Card>
           
           <Card title="Holdings" className="lg:col-span-2">
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase border-b border-app-border">
                       <tr>
                          <th className="px-4 py-3 font-medium">Asset</th>
                          <th className="px-4 py-3 font-medium text-right">Price</th>
                          <th className="px-4 py-3 font-medium text-right">Value</th>
                          <th className="px-4 py-3 font-medium text-right">PnL</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                       <tr className="group hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">Bitcoin <span className="text-zinc-500 ml-1">BTC</span></td>
                          <td className="px-4 py-3 text-right text-zinc-300">$34,200.00</td>
                          <td className="px-4 py-3 text-right text-white font-medium">$27,000.00</td>
                          <td className="px-4 py-3 text-right text-app-success">+$2,400.00</td>
                       </tr>
                       <tr className="group hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">Ethereum <span className="text-zinc-500 ml-1">ETH</span></td>
                          <td className="px-4 py-3 text-right text-zinc-300">$1,850.00</td>
                          <td className="px-4 py-3 text-right text-white font-medium">$13,500.00</td>
                          <td className="px-4 py-3 text-right text-app-success">+$850.00</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>
      </main>

      <AddTradeModal isOpen={isTradeModalOpen} onClose={() => setTradeModalOpen(false)} />
    </div>
  );
};