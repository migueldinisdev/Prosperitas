import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BarChart3, PieChart as PieIcon } from "lucide-react";
import { Card } from "../../ui/Card";
import { PieChart } from "../../components/PieChart";
import { LineChart } from "../../components/LineChart";
import { Button } from "../../ui/Button";
import { HoldingsTable, HoldingRow } from "../../components/HoldingsTable";

// Mock data strictly for UI demo
const performanceHistory = [
    { name: "Jan", value: 12000 },
    { name: "Feb", value: 12450 },
    { name: "Mar", value: 12800 },
    { name: "Apr", value: 13210 },
    { name: "May", value: 13820 },
];

const allocation = [
    { name: "Tech", value: 40, color: "#6366f1" },
    { name: "Dividends", value: 30, color: "#10b981" },
    { name: "Energy", value: 20, color: "#f59e0b" },
    { name: "Emerging", value: 10, color: "#ef4444" },
];

const holdings: HoldingRow[] = [
    {
        asset: "Apple",
        ticker: "AAPL",
        units: 25,
        price: 182.4,
        value: 4560,
        pnl: 620,
        pnlPercent: 15.7,
        allocation: 22,
    },
    {
        asset: "Microsoft",
        ticker: "MSFT",
        units: 12,
        price: 405.1,
        value: 4861,
        pnl: 410,
        pnlPercent: 9.2,
        allocation: 24,
    },
    {
        asset: "Vanguard High Dividend",
        ticker: "VYM",
        units: 40,
        price: 112.3,
        value: 4492,
        pnl: 190,
        pnlPercent: 4.4,
        allocation: 22,
    },
    {
        asset: "iShares Clean Energy",
        ticker: "ICLN",
        units: 80,
        price: 17.6,
        value: 1408,
        pnl: -96,
        pnlPercent: -6.4,
        allocation: 7,
    },
    {
        asset: "Emerging Markets",
        ticker: "EEM",
        units: 55,
        price: 38.4,
        value: 2112,
        pnl: 52,
        pnlPercent: 2.5,
        allocation: 11,
    },
];

interface Props {
    onMenuClick: () => void;
}

export const PieDetail: React.FC<Props> = ({ onMenuClick }) => {
    const { id } = useParams();
    const formattedName = id
        ? id
              .split("-")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" ")
        : "Pie";

    return (
        <div className="pb-20">
            <div className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4 flex items-center gap-4">
                <Link
                    to="/pies"
                    className="p-2 -ml-2 text-app-muted hover:text-app-foreground rounded-lg hover:bg-app-surface transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-xl font-bold text-app-foreground">{formattedName}</h1>
                <div className="flex-1" />
                <Button variant="ghost" onClick={onMenuClick} className="lg:hidden">
                    Menu
                </Button>
            </div>

            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <Card title="Quick Actions">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            icon={<BarChart3 size={16} />}
                        >
                            View Analytics
                        </Button>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold mb-1">
                                Current Value
                            </p>
                            <p className="text-2xl font-bold text-app-foreground">$13,820.00</p>
                        </div>
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold mb-1">
                                Invested
                            </p>
                            <p className="text-2xl font-bold text-app-foreground">$12,400.00</p>
                        </div>
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold mb-1">
                                Total PnL
                            </p>
                            <div className="flex items-center gap-1 text-app-success">
                                <ArrowUpRight size={18} />
                                <span className="text-2xl font-bold">+$1,420.00</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Allocation" className="lg:col-span-1">
                        <PieChart data={allocation} height={250} />
                    </Card>

                    <Card title="Performance History" className="lg:col-span-2">
                        <LineChart
                            data={performanceHistory}
                            dataKey="value"
                            height={260}
                        />
                    </Card>
                </div>

                <Card title="Holdings">
                    <HoldingsTable holdings={holdings} />
                </Card>
            </main>
        </div>
    );
};
