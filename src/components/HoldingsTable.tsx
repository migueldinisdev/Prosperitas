import React, { useEffect, useState } from "react";
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
    assetPnlBase?: number | null;
    fxPnlBase?: number | null;
    entryFx?: number | null;
    currentFx?: number | null;
    baseCurrency?: string;
    quoteCurrency?: string;
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
        const [openTooltipKey, setOpenTooltipKey] = useState<string | null>(
            null
        );

        useEffect(() => {
            const handleClick = (event: MouseEvent) => {
                if (
                    event.target instanceof Element &&
                    event.target.closest("[data-pnl-tooltip]")
                ) {
                    return;
                }
                setOpenTooltipKey(null);
            };
            document.addEventListener("click", handleClick);
            return () => document.removeEventListener("click", handleClick);
        }, []);

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
                            const baseCurrency =
                                holding.baseCurrency ?? pnlCurrency;
                            const quoteCurrency =
                                holding.quoteCurrency ??
                                currentPriceCurrency ??
                                holding.currency;
                            const tooltipKey = `${holding.ticker}-${holding.asset}`;
                            const hasTooltipDetails =
                                holding.entryFx !== undefined ||
                                holding.assetPnlBase !== undefined ||
                                holding.fxPnlBase !== undefined;
                            const showTooltip =
                                hasTooltipDetails && openTooltipKey === tooltipKey;
                            const entryFx =
                                holding.entryFx !== undefined
                                    ? holding.entryFx
                                    : null;
                            const currentFx =
                                holding.currentFx !== undefined
                                    ? holding.currentFx
                                    : null;
                            const assetPnlBase =
                                holding.assetPnlBase !== undefined
                                    ? holding.assetPnlBase
                                    : null;
                            const fxPnlBase =
                                holding.fxPnlBase !== undefined
                                    ? holding.fxPnlBase
                                    : null;
                            const missingFx =
                                entryFx === null || currentFx === null;
                            const sameCurrency =
                                baseCurrency && quoteCurrency
                                    ? baseCurrency === quoteCurrency
                                    : false;
                            const hasBreakdown =
                                !missingFx &&
                                assetPnlBase !== null &&
                                fxPnlBase !== null;
                            const formatFx = (value: number | null) =>
                                value === null ? "-" : value.toFixed(4);

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
                                        <span
                                            className={
                                                hasTooltipDetails
                                                    ? "relative inline-flex items-center gap-1 cursor-pointer"
                                                    : "inline-flex items-center gap-1"
                                            }
                                            data-pnl-tooltip={tooltipKey}
                                            onMouseEnter={() => {
                                                if (hasTooltipDetails) {
                                                    setOpenTooltipKey(
                                                        tooltipKey
                                                    );
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                if (hasTooltipDetails) {
                                                    setOpenTooltipKey(null);
                                                }
                                            }}
                                            onClick={() => {
                                                if (!hasTooltipDetails) return;
                                                setOpenTooltipKey((prev) =>
                                                    prev === tooltipKey
                                                        ? null
                                                        : tooltipKey
                                                );
                                            }}
                                        >
                                            <span>
                                                {holding.pnl > 0 ? "+" : ""}
                                                {formatCurrency(
                                                    holding.pnl,
                                                    pnlCurrency
                                                )}
                                                {holding.pnlPercent !==
                                                    undefined && (
                                                    <span className="ml-1 text-xs text-app-muted">
                                                        (
                                                        {holding.pnlPercent}%)
                                                    </span>
                                                )}
                                            </span>
                                            {showTooltip && (
                                                <div className="absolute z-20 top-full right-0 mt-2 w-64 rounded-lg border border-app-border bg-app-surface text-app-foreground shadow-lg p-3 text-xs text-left">
                                                    <p className="font-semibold text-app-foreground">
                                                        PnL Breakdown
                                                    </p>
                                                    <div className="mt-2 space-y-2 text-app-muted">
                                                        <div>
                                                            <span className="text-app-foreground">
                                                                Total PnL:
                                                            </span>{" "}
                                                            {formatCurrency(
                                                                holding.pnl,
                                                                pnlCurrency
                                                            )}
                                                            {holding.pnlPercent !==
                                                                undefined && (
                                                                <span className="ml-1">
                                                                    (
                                                                    {
                                                                        holding.pnlPercent
                                                                    }
                                                                    %)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!hasBreakdown && (
                                                            <div className="text-app-warning">
                                                                Missing price/FX
                                                                data.
                                                            </div>
                                                        )}
                                                        {hasBreakdown && (
                                                            <>
                                                                <div>
                                                                    <span className="text-app-foreground">
                                                                        Asset
                                                                        appreciation:
                                                                    </span>{" "}
                                                                    {formatCurrency(
                                                                        assetPnlBase,
                                                                        pnlCurrency
                                                                    )}
                                                                </div>
                                                                {!sameCurrency && (
                                                                    <div>
                                                                        <span className="text-app-foreground">
                                                                            FX
                                                                            impact:
                                                                        </span>{" "}
                                                                        {formatCurrency(
                                                                            fxPnlBase,
                                                                            pnlCurrency
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="border-t border-app-border pt-2 space-y-1">
                                                                    <div>
                                                                        Entry avg
                                                                        price:{" "}
                                                                        {formatCurrency(
                                                                            holding.costAverage,
                                                                            costCurrency
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        Current
                                                                        price:{" "}
                                                                        {formatCurrency(
                                                                            holding.currentPrice,
                                                                            currentPriceCurrency
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        Entry avg
                                                                        FX:{" "}
                                                                        {formatFx(
                                                                            entryFx
                                                                        )}{" "}
                                                                        {baseCurrency
                                                                            ? `${baseCurrency}/${quoteCurrency}`
                                                                            : ""}
                                                                    </div>
                                                                    <div>
                                                                        Current
                                                                        FX:{" "}
                                                                        {formatFx(
                                                                            currentFx
                                                                        )}{" "}
                                                                        {baseCurrency
                                                                            ? `${baseCurrency}/${quoteCurrency}`
                                                                            : ""}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </span>
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
