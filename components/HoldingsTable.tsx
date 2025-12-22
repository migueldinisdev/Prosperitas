import React from "react";
import { formatCurrency } from "../utils/formatters";

export interface HoldingRow {
    asset: string;
    ticker: string;
    units?: number;
    price: number;
    value: number;
    pnl: number;
    pnlPercent?: number;
    allocation?: number;
}

interface HoldingsTableProps {
    holdings: HoldingRow[];
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-app-muted uppercase border-b border-app-border">
                    <tr>
                        <th className="px-4 py-3 font-medium">Asset</th>
                        <th className="px-4 py-3 font-medium text-right">Units</th>
                        <th className="px-4 py-3 font-medium text-right">Price</th>
                        <th className="px-4 py-3 font-medium text-right">Value</th>
                        <th className="px-4 py-3 font-medium text-right">PnL</th>
                        <th className="px-4 py-3 font-medium text-right">Allocation</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                    {holdings.map((holding) => {
                        const pnlColor =
                            holding.pnl > 0
                                ? "text-app-success"
                                : holding.pnl < 0
                                ? "text-app-danger"
                                : "text-app-muted";

                        return (
                            <tr
                                key={holding.ticker}
                                className="group hover:bg-app-surface transition-colors"
                            >
                                <td className="px-4 py-3 font-medium text-app-foreground">
                                    {holding.asset}{" "}
                                    <span className="text-app-muted ml-1">
                                        {holding.ticker}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right text-app-muted">
                                    {holding.units?.toLocaleString() ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right text-app-muted">
                                    {formatCurrency(holding.price)}
                                </td>
                                <td className="px-4 py-3 text-right text-app-foreground font-medium">
                                    {formatCurrency(holding.value)}
                                </td>
                                <td className={`px-4 py-3 text-right ${pnlColor}`}>
                                    {holding.pnl > 0 ? "+" : ""}
                                    {formatCurrency(holding.pnl)}
                                    {holding.pnlPercent !== undefined && (
                                        <span className="ml-1 text-xs text-app-muted">
                                            ({holding.pnlPercent}%)
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right text-app-muted">
                                    {holding.allocation !== undefined
                                        ? `${holding.allocation}%`
                                        : "-"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
