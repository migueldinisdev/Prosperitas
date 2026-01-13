import React, { useMemo, useState } from "react";
import { AreaChart } from "./AreaChart";
import { NetWorthHistoryPoint } from "../utils/netWorthHistory";
import { formatCurrency } from "../utils/formatters";

type RangeKey = "1W" | "2W" | "1M" | "YTD" | "1Y" | "2Y" | "5Y" | "ALL";

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
    { key: "1W", label: "1W" },
    { key: "2W", label: "2W" },
    { key: "1M", label: "1M" },
    { key: "YTD", label: "YTD" },
    { key: "1Y", label: "1Y" },
    { key: "2Y", label: "2Y" },
    { key: "5Y", label: "5Y" },
    { key: "ALL", label: "All time" },
];

const TICK_DAYS_BY_RANGE: Record<RangeKey, number[]> = {
    "1W": [1, 7, 14, 21],
    "2W": [8, 23],
    "1M": [15],
    YTD: [15],
    "1Y": [15],
    "2Y": [15],
    "5Y": [15],
    ALL: [15],
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
    next.setMonth(next.getMonth() + delta);
    return next;
};

const addYears = (date: Date, delta: number) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + delta);
    return next;
};

const addDays = (date: Date, delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    return next;
};

const getRangeStart = (range: RangeKey, endDate: Date, earliest: Date) => {
    switch (range) {
        case "1W":
            return addDays(endDate, -7);
        case "2W":
            return addDays(endDate, -14);
        case "1M":
            return addMonths(endDate, -1);
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

const addTickPoints = (
    data: NetWorthHistoryPoint[],
    tickDates: string[],
    locale?: string
) => {
    if (!tickDates.length) return data;
    const dataByDate = new Map(
        data.map((point) => [point.date, point])
    );
    const combinedDates = Array.from(
        new Set([...data.map((point) => point.date), ...tickDates])
    ).sort((a, b) => a.localeCompare(b));
    let lastValue: number | null = null;
    return combinedDates
        .map((date) => {
            const existing = dataByDate.get(date);
            if (existing) {
                lastValue = existing.value;
                return existing;
            }
            if (lastValue == null) {
                return null;
            }
            return {
                date,
                name: formatDateLabel(date, locale),
                value: lastValue,
            };
        })
        .filter((point): point is NetWorthHistoryPoint => Boolean(point));
};

interface NetWorthHistoryChartProps {
    data: NetWorthHistoryPoint[];
    currency: string;
    locale?: string;
    height?: number;
    color?: string;
}

export const NetWorthHistoryChart: React.FC<NetWorthHistoryChartProps> = ({
    data,
    currency,
    locale,
    height,
    color,
}) => {
    const [range, setRange] = useState<RangeKey>("ALL");

    const { chartData, ticks } = useMemo(() => {
        if (!data.length) {
            return { chartData: [], ticks: [] };
        }
        const sorted = [...data].sort((a, b) =>
            a.date.localeCompare(b.date)
        );
        const earliestDate = parseDate(sorted[0].date);
        const latestDate = parseDate(sorted[sorted.length - 1].date);
        const rangeStart = getRangeStart(range, latestDate, earliestDate);

        const filtered = sorted.filter(
            (point) => parseDate(point.date) >= rangeStart
        );
        if (!filtered.length) {
            return { chartData: [], ticks: [] };
        }

        const tickDays = TICK_DAYS_BY_RANGE[range];
        const tickDates = buildTickDates(
            rangeStart,
            latestDate,
            tickDays
        );
        const chartData = addTickPoints(filtered, tickDates, locale);
        return {
            chartData,
            ticks: tickDates,
        };
    }, [data, locale, range]);

    if (!data.length) {
        return null;
    }

    return (
        <div className="space-y-3">
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
