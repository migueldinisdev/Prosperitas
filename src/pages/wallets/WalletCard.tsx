import React from "react";
import { Card } from "../../ui/Card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/formatters";

interface WalletCardProps {
    walletId: string;
    name: string;
    value: number;
    pnl: number;
    pnlPercent: number;
    currency: string;
    type?: string;
}

export const WalletCard: React.FC<WalletCardProps> = ({
    walletId,
    name,
    value,
    pnl,
    pnlPercent,
    currency,
    type,
}) => {
    const isPositive = pnl >= 0;

    return (
        <Link to={`/wallets/${walletId}`}>
            <Card className="hover:bg-app-surface transition-colors cursor-pointer group h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-app-surface flex items-center justify-center text-xl font-bold text-app-foreground group-hover:scale-105 transition-transform">
                        {name[0]}
                    </div>
                    {type && (
                        <span className="text-xs font-medium text-app-muted bg-app-surface px-2 py-1 rounded-md border border-app-border">
                            {type}
                        </span>
                    )}
                </div>

                <h3 className="text-app-muted text-sm font-medium mb-1">
                    {name}
                </h3>
                <p className="text-2xl font-bold text-app-foreground tracking-tight mb-4">
                    {formatCurrency(value, currency)}
                </p>

                <div
                    className={`flex items-center text-sm font-medium ${
                        isPositive ? "text-app-success" : "text-app-danger"
                    }`}
                >
                    {isPositive ? (
                        <ArrowUpRight size={16} />
                    ) : (
                        <ArrowDownRight size={16} />
                    )}
                    <span className="ml-1">
                        {isPositive ? "+" : ""}
                        {formatCurrency(pnl, currency)} ({pnlPercent.toFixed(2)}
                        %)
                    </span>
                </div>
            </Card>
        </Link>
    );
};
