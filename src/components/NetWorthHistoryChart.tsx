import React, { useMemo, useState } from "react";
import { AreaChart } from "./AreaChart";
import { formatCurrency } from "../utils/formatters";
import { useNetWorthHistory } from "../hooks/useNetWorthHistory";
import { Asset, WalletTx } from "../core/schema-types";

type RangeKey = "YTD" | "1Y" | "2Y" | "5Y" | "ALL";
type TickRateKey = "1W" | "2W" | "1M";

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
    { key: "YTD", label: "YTD" },
    { key: "1Y", label: "1Y" },
    { key: "2Y", label: "2Y" },
    { key: "5Y", label: "5Y" },
    { key: "ALL", label: "All time" },
];

const TICK_RATE_OPTIONS: Array<{ key: TickRateKey; label: string }> = [
    { key: "1W", label: "1W" },
    { key: "2W", label: "2W" },
    { key: "1M", label: "1M" },
];

const TICK_DAYS_BY_RATE: Record<TickRateKey, number[]> = {
    "1W": [1, 7, 14, 21],
    "2W": [8, 23],
    "1M": [15],
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

const formatDateLabel = (date: string, locale?: string) => {
    const parsed = parseDate(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return parsed.toLocaleDateString(locale ?? undefined, {
        month: "short",
        day: "numeric",
    });
};

const addMonths = (date: Date, delta: number) => {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + delta);
    return next;
};

const addYears = (date: Date, delta: number) => {
    const next = new Date(date);
    next.setUTCFullYear(next.getUTCFullYear() + delta);
    return next;
};

const addDays = (date: Date, delta: number) => {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + delta);
    return next;
};

const getRangeStart = (range: RangeKey, endDate: Date, earliest: Date) => {
    switch (range) {
        case "YTD":
            return new Date(Date.UTC(endDate.getUTCFullYear(), 0, 1));
        case "1Y":
            return addYears(endDate, -1);
        case "2Y":
            return addYears(endDate, -2);
        case "5Y":
            return addYears(endDate, -5);
        case "ALL":
        default:
            return earliest;
    }
};

const buildTickDates = (
    startDate: Date,
    endDate: Date,
    dayNumbers: number[]
) => {
    const ticks: string[] = [];
    const cursor = new Date(
        Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1)
    );
    while (cursor <= endDate) {
        dayNumbers.forEach((day) => {
            const candidate = new Date(
                Date.UTC(
                    cursor.getUTCFullYear(),
                    cursor.getUTCMonth(),
                    day
                )
            );
            if (candidate.getUTCMonth() !== cursor.getUTCMonth()) {
                return;
            }
            if (candidate >= startDate && candidate <= endDate) {
                ticks.push(toDateKey(candidate));
            }
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return ticks.sort((a, b) => a.localeCompare(b));
};

const getTodayUtc = () => {
    const now = new Date();
    return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
};

interface NetWorthHistoryChartProps {
    transactions: WalletTx[];
    assets: Record<string, Asset>;
    baseCurrency: string;
    currency: string;
    locale?: string;
    height?: number;
    color?: string;
    assetFilter?: Set<string>;
    includeCash?: boolean;
    includeDeposits?: boolean;
    includeWithdrawals?: boolean;
    includeDividends?: boolean;
    includeForex?: boolean;
}

export const NetWorthHistoryChart: React.FC<NetWorthHistoryChartProps> = ({
    transactions,
    assets,
    baseCurrency,
    currency,
    locale,
    height,
    color,
    assetFilter,
    includeCash,
    includeDeposits,
    includeWithdrawals,
    includeDividends,
    includeForex,
}) => {
    const [range, setRange] = useState<RangeKey>("ALL");
    const [tickRate, setTickRate] = useState<TickRateKey>("1M");

    const { chartDates, ticks } = useMemo(() => {
        if (!transactions.length) {
            return { chartDates: [], ticks: [] };
        }
        const sortedTransactions = [...transactions].sort((a, b) =>
            a.date.localeCompare(b.date)
        );
        const earliestDate = parseDate(sortedTransactions[0].date);
        const latestDate = parseDate(
            sortedTransactions[sortedTransactions.length - 1].date
        );
        const today = getTodayUtc();
        const chartEndDate = latestDate > today ? latestDate : today;
        const rangeStart = getRangeStart(range, chartEndDate, earliestDate);

        const tickDays = TICK_DAYS_BY_RATE[tickRate];
        const tickDates = buildTickDates(rangeStart, chartEndDate, tickDays);
        const endDateKey = toDateKey(chartEndDate);
        tickDates.push(endDateKey);
        const transactionDates = sortedTransactions
            .map((tx) => tx.date)
            .filter((date) => {
                const parsed = parseDate(date);
                return parsed >= rangeStart && parsed <= chartEndDate;
            });
        const chartDateSet = new Set<string>([
            ...tickDates,
            ...transactionDates,
        ]);
        return {
            chartDates: Array.from(chartDateSet).sort((a, b) =>
                a.localeCompare(b)
            ),
            ticks: Array.from(new Set(tickDates)).sort((a, b) =>
                a.localeCompare(b)
            ),
        };
    }, [range, tickRate, transactions]);

    const { data: chartData } = useNetWorthHistory({
        transactions,
        assets,
        baseCurrency,
        locale,
        assetFilter,
        includeCash,
        includeDeposits,
        includeWithdrawals,
        includeDividends,
        includeForex,
        snapshotDates: chartDates,
    });

    if (!transactions.length) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setRange(option.key)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                range === option.key
                                    ? "bg-app-primary text-white"
                                    : "bg-app-border text-app-muted hover:text-app-foreground"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="h-4 w-px bg-app-border" aria-hidden="true" />
                <div className="flex flex-wrap gap-2">
                    {TICK_RATE_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setTickRate(option.key)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                tickRate === option.key
                                    ? "bg-app-primary text-white"
                                    : "bg-app-border text-app-muted hover:text-app-foreground"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            {chartData.length > 0 ? (
                <AreaChart
                    data={chartData}
                    dataKey="value"
                    xDataKey="date"
                    height={height}
                    color={color}
                    ticks={ticks}
                    tickFormatter={(value) =>
                        formatDateLabel(String(value), locale)
                    }
                    labelFormatter={(label) =>
                        formatDateLabel(String(label), locale)
                    }
                    yTickFormatter={(value) =>
                        formatCurrency(value, currency)
                    }
                />
            ) : null}
        </div>
    );
};
