import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "../ui/Card";

interface NetWorthSummaryCardProps {
    totalNetWorth: string;
    changeLabel?: string;
    changeValue?: string;
    realizedPnl: string;
    unrealizedPnl: string;
}

const getTone = (value: string) =>
    value.trim().startsWith("-") ? "text-app-danger" : "text-app-success";

export const NetWorthSummaryCard: React.FC<NetWorthSummaryCardProps> = ({
    totalNetWorth,
    changeLabel,
    changeValue,
    realizedPnl,
    unrealizedPnl,
}) => {
    const realizedTone = getTone(realizedPnl);
    const unrealizedTone = getTone(unrealizedPnl);
    const changeTone = changeValue ? getTone(changeValue) : "text-app-success";

    return (
        <Card>
            <p className="text-app-muted text-sm font-medium mb-1">
                Total Net Worth
            </p>
            <h2 className="text-4xl font-bold text-app-foreground tracking-tight mb-2">
                {totalNetWorth}
            </h2>
            {changeLabel && changeValue ? (
                <div
                    className={`flex items-center gap-1 text-sm font-medium bg-emerald-500/10 w-fit px-2 py-1 rounded-full mb-4 ${
                        changeTone
                    }`}
                >
                    {changeTone === "text-app-danger" ? (
                        <ArrowDownRight size={14} />
                    ) : (
                        <ArrowUpRight size={14} />
                    )}
                    <span>
                        {changeValue} {changeLabel}
                    </span>
                </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div
                            className={`p-1.5 rounded-lg ${
                                unrealizedTone === "text-app-danger"
                                    ? "bg-rose-500/10 text-app-danger"
                                    : "bg-emerald-500/10 text-app-success"
                            }`}
                        >
                            {unrealizedTone === "text-app-danger" ? (
                                <ArrowDownRight size={16} />
                            ) : (
                                <ArrowUpRight size={16} />
                            )}
                        </div>
                        <p className="text-app-muted text-xs font-medium">
                            Unrealized PnL
                        </p>
                    </div>
                    <p className={`text-xl font-bold ${unrealizedTone}`}>
                        {unrealizedPnl}
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div
                            className={`p-1.5 rounded-lg ${
                                realizedTone === "text-app-danger"
                                    ? "bg-rose-500/10 text-app-danger"
                                    : "bg-emerald-500/10 text-app-success"
                            }`}
                        >
                            {realizedTone === "text-app-danger" ? (
                                <ArrowDownRight size={16} />
                            ) : (
                                <ArrowUpRight size={16} />
                            )}
                        </div>
                        <p className="text-app-muted text-xs font-medium">
                            Realized PnL (YTD)
                        </p>
                    </div>
                    <p className={`text-xl font-bold ${realizedTone}`}>
                        {realizedPnl}
                    </p>
                </div>
            </div>
        </Card>
    );
};
