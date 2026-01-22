import React, { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { Modal } from "../ui/Modal";
import { Tooltip } from "../ui/Tooltip";

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
        const [activeHolding, setActiveHolding] = useState<HoldingRow | null>(
            null
        );
        const pnlModal = useMemo(() => {
            if (!activeHolding) return null;
            const baseCurrency =
                activeHolding.baseCurrency ?? activeHolding.pnlCurrency;
            const quoteCurrency =
                activeHolding.quoteCurrency ??
                activeHolding.currentPriceCurrency ??
                activeHolding.currency;
            const entryFx =
                activeHolding.entryFx !== undefined
                    ? activeHolding.entryFx
                    : null;
            const currentFx =
                activeHolding.currentFx !== undefined
                    ? activeHolding.currentFx
                    : null;
            const assetPnlBase =
                activeHolding.assetPnlBase !== undefined
                    ? activeHolding.assetPnlBase
                    : null;
            const fxPnlBase =
                activeHolding.fxPnlBase !== undefined
                    ? activeHolding.fxPnlBase
                    : null;
            const missingFx = entryFx === null || currentFx === null;
            const sameCurrency =
                baseCurrency && quoteCurrency
                    ? baseCurrency === quoteCurrency
                    : false;
            const hasBreakdown =
                !missingFx && assetPnlBase !== null && fxPnlBase !== null;
            const totalPnL = activeHolding.pnl;
            const pnlPercent = activeHolding.pnlPercent;
            const assetPercent =
                hasBreakdown && totalPnL !== 0 && pnlPercent !== undefined
                    ? (assetPnlBase / totalPnL) * pnlPercent
                    : null;
            const fxPercent =
                hasBreakdown && totalPnL !== 0 && pnlPercent !== undefined
                    ? (fxPnlBase / totalPnL) * pnlPercent
                    : null;

            return {
                baseCurrency,
                quoteCurrency,
                entryFx,
                currentFx,
                assetPnlBase,
                fxPnlBase,
                missingFx,
                sameCurrency,
                hasBreakdown,
                totalPnL,
                pnlPercent,
                assetPercent,
                fxPercent,
            };
        }, [activeHolding]);

        return (
            <>
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
                                const hasModalDetails =
                                    holding.entryFx !== undefined ||
                                    holding.assetPnlBase !== undefined ||
                                    holding.fxPnlBase !== undefined;
                                const quoteCurrency =
                                    holding.quoteCurrency ??
                                    holding.currentPriceCurrency ??
                                    holding.currency;
                                const baseCurrency =
                                    holding.baseCurrency ?? pnlCurrency;
                                const isSameCurrency =
                                    baseCurrency && quoteCurrency
                                        ? baseCurrency === quoteCurrency
                                        : false;
                                const canOpenModal =
                                    hasModalDetails && !isSameCurrency;
                                const hasUnits =
                                    typeof holding.units === "number";
                                const unitsDisplay = hasUnits
                                    ? holding.units?.toLocaleString()
                                    : "-";
                                const unitsFull = hasUnits
                                    ? String(holding.units)
                                    : "";

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
                                            {hasUnits ? (
                                                <Tooltip
                                                    content={unitsFull}
                                                    className="justify-end w-full"
                                                >
                                                    <span>{unitsDisplay}</span>
                                                </Tooltip>
                                            ) : (
                                                "-"
                                            )}
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
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!canOpenModal) {
                                                        return;
                                                    }
                                                    setActiveHolding(holding);
                                                }}
                                                className={
                                                    canOpenModal
                                                        ? "inline-flex items-center gap-1 hover:text-app-foreground transition-colors"
                                                        : "inline-flex items-center gap-1"
                                                }
                                                aria-label="View PnL breakdown"
                                            >
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
                                            </button>
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
                <Modal
                    isOpen={Boolean(activeHolding && pnlModal)}
                    onClose={() => setActiveHolding(null)}
                    title="Return"
                >
                    {activeHolding && pnlModal && (
                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-app-muted">
                                    Total
                                </p>
                                <p
                                    className={`text-2xl font-semibold ${
                                        pnlModal.totalPnL < 0
                                            ? "text-app-danger"
                                            : pnlModal.totalPnL > 0
                                            ? "text-app-success"
                                            : "text-app-muted"
                                    }`}
                                >
                                    {formatCurrency(
                                        pnlModal.totalPnL,
                                        activeHolding.pnlCurrency
                                    )}
                                    {pnlModal.pnlPercent !== undefined && (
                                        <span className="ml-2 text-base">
                                            ({pnlModal.pnlPercent}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                            {!pnlModal.hasBreakdown && (
                                <p className="text-sm text-app-warning">
                                    Missing price/FX data.
                                </p>
                            )}
                            {pnlModal.hasBreakdown && (
                                <div className="space-y-3 text-app-muted">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-app-foreground">
                                            Asset appreciation
                                        </span>
                                        <span
                                            className={`font-semibold ${
                                                pnlModal.assetPnlBase < 0
                                                    ? "text-app-danger"
                                                    : pnlModal.assetPnlBase > 0
                                                    ? "text-app-success"
                                                    : "text-app-muted"
                                            }`}
                                        >
                                            {formatCurrency(
                                                pnlModal.assetPnlBase,
                                                activeHolding.pnlCurrency
                                            )}
                                            {pnlModal.assetPercent !== null && (
                                                <span className="ml-2 text-sm">
                                                    (
                                                    {pnlModal.assetPercent.toFixed(
                                                        2
                                                    )}
                                                    %)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    {!pnlModal.sameCurrency && (
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-app-foreground">
                                                FX impact
                                            </span>
                                            <span
                                                className={`font-semibold ${
                                                    pnlModal.fxPnlBase < 0
                                                        ? "text-app-danger"
                                                        : pnlModal.fxPnlBase > 0
                                                        ? "text-app-success"
                                                        : "text-app-muted"
                                                }`}
                                            >
                                                {formatCurrency(
                                                    pnlModal.fxPnlBase,
                                                    activeHolding.pnlCurrency
                                                )}
                                                {pnlModal.fxPercent !== null && (
                                                    <span className="ml-2 text-sm">
                                                        (
                                                        {pnlModal.fxPercent.toFixed(
                                                            2
                                                        )}
                                                        %)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="border-t border-app-border pt-3 space-y-2 text-xs">
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Entry avg price</span>
                                            <span>
                                                {formatCurrency(
                                                    activeHolding.costAverage,
                                                    activeHolding.costCurrency ??
                                                        activeHolding.currency
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Current price</span>
                                            <span>
                                                {formatCurrency(
                                                    activeHolding.currentPrice,
                                                    activeHolding.currentPriceCurrency ??
                                                        activeHolding.currency
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Entry avg FX</span>
                                            <span>
                                                {pnlModal.entryFx === null
                                                    ? "-"
                                                    : pnlModal.entryFx.toFixed(
                                                          4
                                                      )}{" "}
                                                {pnlModal.baseCurrency
                                                    ? `${pnlModal.quoteCurrency}/${pnlModal.baseCurrency}`
                                                    : ""}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <span>Current FX</span>
                                            <span>
                                                {pnlModal.currentFx === null
                                                    ? "-"
                                                    : pnlModal.currentFx.toFixed(
                                                          4
                                                      )}{" "}
                                                {pnlModal.baseCurrency
                                                    ? `${pnlModal.quoteCurrency}/${pnlModal.baseCurrency}`
                                                    : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>
            </>
        );
    }
);
