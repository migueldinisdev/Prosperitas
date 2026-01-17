import React from "react";
import { Pencil } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

export interface HoldingRow {
    assetId?: string;
    asset: string;
    ticker: string;
    units?: number;
    costAverage: number;
    costCurrency?: string;
    currentPrice: number;
    currentPriceCurrency?: string;
    value: number;
    valueCurrency?: string;
    pnl: number;
    pnlCurrency?: string;
    pnlPercent?: number;
    allocation?: number;
    currency?: string;
}

interface HoldingsTableProps {
    holdings: HoldingRow[];
    onEditAsset?: (assetId: string) => void;
}

export const HoldingsTable = React.memo(
    ({ holdings, onEditAsset }: HoldingsTableProps) => {
        console.log("HoldingsTable re-rendered");
        const showEdit = Boolean(onEditAsset);

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-app-muted uppercase border-b border-app-border">
                        <tr>
                            <th className="px-4 py-3 font-medium">Asset</th>
                            <th className="px-4 py-3 font-medium text-right">
                                Units
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Cost Avg
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Price
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Value
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                PnL
                            </th>
                            <th className="px-4 py-3 font-medium text-right">
                                Allocation
                            </th>
                            {showEdit && (
                                <th className="px-4 py-3 font-medium text-right">
                                    Edit
                                </th>
                            )}
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
                            const costCurrency =
                                holding.costCurrency ?? holding.currency;
                            const currentPriceCurrency =
                                holding.currentPriceCurrency ??
                                holding.currency;
                            const valueCurrency =
                                holding.valueCurrency ?? holding.currency;
                            const pnlCurrency =
                                holding.pnlCurrency ?? holding.currency;

                            return (
                                <tr
                                    key={`${holding.ticker}-${holding.asset}`}
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
                                        {formatCurrency(
                                            holding.costAverage,
                                            costCurrency
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-app-muted">
                                        {formatCurrency(
                                            holding.currentPrice,
                                            currentPriceCurrency
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-app-foreground font-medium">
                                        {formatCurrency(
                                            holding.value,
                                            valueCurrency
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right ${pnlColor}`}
                                    >
                                        {holding.pnl > 0 ? "+" : ""}
                                        {formatCurrency(
                                            holding.pnl,
                                            pnlCurrency
                                        )}
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
                                    {showEdit && (
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        onEditAsset &&
                                                        holding.assetId
                                                    ) {
                                                        onEditAsset(
                                                            holding.assetId
                                                        );
                                                    }
                                                }}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-app-muted hover:text-app-foreground hover:bg-app-surface transition-colors"
                                                aria-label="Edit asset"
                                                disabled={!holding.assetId}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }
);
