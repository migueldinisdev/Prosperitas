import React from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { PieChart } from '../../components/PieChart';
import { NetWorthSummaryCard } from '../../components/NetWorthSummaryCard';

const summaryStats = [
  {
    label: "Total invested",
    value: "€128,400",
    change: "+6.2% YTD",
    helper: "Across 4 wallets",
  },
  {
    label: "Current value",
    value: "€139,250",
    change: "+8.4% vs cost",
    helper: "Realtime valuation",
  },
  {
    label: "Total PnL",
    value: "+€10,850",
    change: "€2,450 realized",
    helper: "€8,400 unrealized",
  },
  {
    label: "Cash buffer",
    value: "€12,600",
    change: "9.0% of total",
    helper: "Liquid reserves",
  },
];

const assetTypeData = [
  { name: "Stocks", value: 34, color: "#d61544" },
  { name: "ETFs", value: 28, color: "#f97316" },
  { name: "BTC", value: 18, color: "#f59e0b" },
  { name: "Alts", value: 11, color: "#8b5cf6" },
  { name: "Cash-like", value: 9, color: "#10b981" },
];

const currencyData = [
  { name: "EUR", value: 46, color: "#0ea5e9" },
  { name: "USD", value: 38, color: "#22c55e" },
  { name: "GBP", value: 9, color: "#6366f1" },
  { name: "CHF", value: 7, color: "#f43f5e" },
];

const riskData = [
  { name: "Low (1-2)", value: 32, color: "#10b981" },
  { name: "Medium (3)", value: 41, color: "#f59e0b" },
  { name: "High (4-5)", value: 27, color: "#ef4444" },
];

const topHoldings = [
  { name: "Vanguard S&P 500 (VUAA)", value: 26.4 },
  { name: "Apple (AAPL)", value: 14.2 },
  { name: "Bitcoin (BTC)", value: 12.9 },
  { name: "NVIDIA (NVDA)", value: 10.6 },
  { name: "iShares Global Clean Energy", value: 8.1 },
];

const momentumStats = [
  { label: "Best month", value: "April +4.1%" },
  { label: "Worst month", value: "September -2.3%" },
  { label: "Avg monthly flow", value: "+€1,120" },
  { label: "Fees paid YTD", value: "€320" },
];

interface Props {
  onMenuClick: () => void;
}

export const StatisticsPage: React.FC<Props> = ({ onMenuClick }) => {
  return (
    <div className="pb-20">
      <PageHeader 
        title="Statistics" 
        onMenuClick={onMenuClick}
      />
      
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <section className="grid grid-cols-1 gap-4">
          <NetWorthSummaryCard
            totalNetWorth="€139,250.00"
            changeValue="+8.4%"
            changeLabel="vs cost"
            unrealizedPnl="+€8,400"
            realizedPnl="+€2,450"
          />
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((stat) => (
            <Card key={stat.label}>
              <p className="text-xs uppercase tracking-wider text-app-muted font-semibold">
                {stat.label}
              </p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-2xl font-semibold text-app-foreground">
                  {stat.value}
                </span>
                <span className="text-xs text-app-success font-semibold">
                  {stat.change}
                </span>
              </div>
              <p className="text-xs text-app-muted mt-2">{stat.helper}</p>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Allocation by Asset Class">
            <PieChart data={assetTypeData} height={300} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {assetTypeData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  ></div>
                  <span className="text-app-foreground">{d.name}</span>
                  <span className="text-app-muted ml-auto">{d.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Currency Exposure">
            <PieChart data={currencyData} height={300} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {currencyData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  ></div>
                  <span className="text-app-foreground">{d.name}</span>
                  <span className="text-app-muted ml-auto">{d.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Risk Distribution">
            <PieChart data={riskData} height={260} />
            <div className="mt-4 grid gap-2">
              {riskData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  ></div>
                  <span className="text-app-foreground">{d.name}</span>
                  <span className="text-app-muted ml-auto">{d.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Top Holdings">
            <div className="space-y-4">
              {topHoldings.map((holding) => (
                <div key={holding.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-app-foreground">{holding.name}</span>
                    <span className="text-app-muted">{holding.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-app-border/60">
                    <div
                      className="h-2 rounded-full bg-app-accent"
                      style={{ width: `${holding.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Momentum & Costs">
            <div className="space-y-3">
              {momentumStats.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-app-muted">{item.label}</span>
                  <span className="text-app-foreground font-semibold">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-app-border bg-app-bg/50 p-3 text-xs text-app-muted">
              Insight: Concentration risk is limited—top 5 holdings represent 72% of the
              portfolio while cash-like assets cover 6 months of expenses.
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};
