import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../ui/Card";
import { PieChart } from "../../components/PieChart";
import { StackedNormalizedAreaChart } from "../../components/StackedNormalizedAreaChart";
import {
    selectAssets,
    selectPies,
    selectSettings,
    selectWalletPositionsState,
    selectWalletTxState,
    selectWallets,
} from "../../store/selectors";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { Asset } from "../../core/schema-types";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import { useForexHistoricalRates } from "../../hooks/useForexHistoricalRates";
import { useNetWorthHistory } from "../../hooks/useNetWorthHistory";
import {
    calculatePeriodReturns,
    calculatePositionCostBasis,
    PerformancePeriod,
    calculateRealizedPnl,
    getAllocationPercent,
    getNetWorth,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
    toVisualValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";
import {
    buildNetWorthHistory,
    formatHistoryDate,
    getWalletTxCurrencies,
} from "../../utils/netWorthHistory";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Info, Settings2 } from "lucide-react";
import { updateSettings } from "../../store/slices/settingsSlice";
import { NetWorthHistoryChart } from "../../components/NetWorthHistoryChart";
import { Tooltip } from "../../ui/Tooltip";

const assetTypeColors: Record<string, string> = {
    stock: "#d61544",
    etf: "#f97316",
    crypto: "#f59e0b",
    bond: "#8b5cf6",
    cash: "#10b981",
    other: "#6366f1",
};

const currencyPalette = ["#0ea5e9", "#22c55e", "#6366f1", "#f43f5e", "#14b8a6"];
const piePalette = [
    "#3b82f6",
    "#f97316",
    "#22c55e",
    "#a855f7",
    "#f43f5e",
    "#14b8a6",
];
const walletPalette = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f97316", "#ef4444"];

type ShareView = "assetType" | "pie" | "wallet";
type ReturnPoint = { label: string; hasValue: boolean; value: number };

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
const shiftMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
};
const shiftYears = (date: Date, years: number) => {
    const next = new Date(date);
    next.setUTCFullYear(next.getUTCFullYear() + years);
    return next;
};

interface Props {
    onMenuClick: () => void;
}

export const StatisticsPage: React.FC<Props> = ({ onMenuClick }) => {
    const wallets = useAppSelector(selectWallets);
    const walletPositions = useAppSelector(selectWalletPositionsState);
    const assets = useAppSelector(selectAssets);
    const pies = useAppSelector(selectPies);
    const settings = useAppSelector(selectSettings);
    const walletTx = useAppSelector(selectWalletTxState);
    const dispatch = useAppDispatch();
    const [isHypotheticalModalOpen, setIsHypotheticalModalOpen] =
        useState(false);
    const [draftHypotheticalPrices, setDraftHypotheticalPrices] = useState<
        Record<string, string>
    >({});
    const [shareView, setShareView] = useState<ShareView>("assetType");
    const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
    const [apyStartYear, setApyStartYear] = useState<number | null>(null);

    const walletList = useMemo(() => Object.values(wallets), [wallets]);

    useEffect(() => {
        const walletIds = walletList.map((wallet) => wallet.id);
        setSelectedWalletIds((previous) => {
            if (!walletIds.length) return [];
            const keptSelection = previous.filter((id) => walletIds.includes(id));
            return keptSelection.length > 0 ? keptSelection : walletIds;
        });
    }, [walletList]);

    const selectedWalletIdSet = useMemo(
        () => new Set(selectedWalletIds),
        [selectedWalletIds],
    );

    const positions = useMemo(
        () =>
            Object.entries(walletPositions).flatMap(([, positionsByAsset]) =>
                Object.entries(positionsByAsset).map(([assetId, position]) => ({
                    assetId,
                    position,
                })),
            ),
        [walletPositions],
    );

    const positionAssets = useMemo(
        () =>
            positions
                .map(({ assetId }) => assets[assetId])
                .filter((asset): asset is Asset => Boolean(asset)),
        [assets, positions],
    );

    const livePricesByAsset = useAssetLivePrices(positionAssets);

    const cashBuckets = useMemo(
        () =>
            Object.values(wallets).flatMap((wallet) => {
                if (Array.isArray(wallet.cash)) {
                    return wallet.cash;
                }
                return Object.entries(wallet.cash ?? {}).map(
                    ([currency, value]) => ({
                        currency,
                        value: Number(value),
                    }),
                );
            }),
        [wallets],
    );

    const forexCurrencies = useMemo(() => {
        const currencies = new Set<string>(getWalletTxCurrencies(walletTx));
        positionAssets.forEach((asset) =>
            currencies.add(asset.tradingCurrency),
        );
        cashBuckets.forEach((bucket) => currencies.add(bucket.currency));
        return Array.from(currencies);
    }, [cashBuckets, positionAssets, walletTx]);

    const forexRates = useForexLivePrices(
        forexCurrencies,
        settings.visualCurrency,
    );

    const walletTransactions = useMemo(
        () => Object.values(walletTx),
        [walletTx],
    );

    const selectedWalletTransactions = useMemo(
        () =>
            walletTransactions.filter((tx) => selectedWalletIdSet.has(tx.walletId)),
        [selectedWalletIdSet, walletTransactions],
    );

    const transactionDates = useMemo(
        () => walletTransactions.map((tx) => tx.date),
        [walletTransactions],
    );

    const { getForexRate } = useForexHistoricalRates(
        forexCurrencies,
        transactionDates,
        settings.visualCurrency,
    );

    const toBaseValue = useCallback(
        (amount: number, currency: string, date: string) => {
            if (currency === settings.visualCurrency) return amount;
            const rate = getForexRate(currency, date) ?? forexRates[currency];
            return rate ? amount * rate : amount;
        },
        [forexRates, getForexRate, settings.visualCurrency],
    );

    const sortedSelectedTransactions = useMemo(
        () =>
            [...selectedWalletTransactions].sort((a, b) => {
                const dateDiff =
                    new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateDiff !== 0) return dateDiff;
                return (
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                );
            }),
        [selectedWalletTransactions],
    );

    const apyYearOptions = useMemo(() => {
        const currentYear = new Date().getUTCFullYear();
        const txYears = sortedSelectedTransactions
            .map((tx) => new Date(tx.date).getUTCFullYear())
            .filter((year) => Number.isFinite(year));
        const earliestTxYear = txYears.length > 0 ? Math.min(...txYears) : currentYear;
        const startYear = Math.max(earliestTxYear - 1, 2000);
        const years: number[] = [];
        for (let year = startYear; year <= currentYear; year += 1) {
            years.push(year);
        }
        return years;
    }, [sortedSelectedTransactions]);

    useEffect(() => {
        if (!apyYearOptions.length) {
            setApyStartYear(null);
            return;
        }
        setApyStartYear((previous) =>
            previous && apyYearOptions.includes(previous)
                ? previous
                : apyYearOptions[0],
        );
    }, [apyYearOptions]);

    const performancePeriods = useMemo<PerformancePeriod[]>(() => {
        const today = new Date();
        const apyStartDate = apyStartYear
            ? `${apyStartYear.toString().padStart(4, "0")}-01-01`
            : null;
        return [
            { key: "6M", label: "6M", startDate: toDateKey(shiftMonths(today, -6)) },
            { key: "1Y", label: "1Y", startDate: toDateKey(shiftYears(today, -1)) },
            { key: "2Y", label: "2Y", startDate: toDateKey(shiftYears(today, -2)) },
            { key: "3Y", label: "3Y", startDate: toDateKey(shiftYears(today, -3)) },
            { key: "4Y", label: "4Y", startDate: toDateKey(shiftYears(today, -4)) },
            { key: "5Y", label: "5Y", startDate: toDateKey(shiftYears(today, -5)) },
            { key: "ALL", label: "All Time (APY)", startDate: apyStartDate },
        ];
    }, [apyStartYear]);

    const performanceSnapshotDates = useMemo(() => {
        if (!selectedWalletTransactions.length) return [];
        const uniqueDates = new Set<string>(
            selectedWalletTransactions.map((tx) => tx.date),
        );
        const endDate = toDateKey(new Date());
        uniqueDates.add(endDate);
        performancePeriods.forEach((period) => {
            if (period.startDate) uniqueDates.add(period.startDate);
        });
        return Array.from(uniqueDates).sort((a, b) => a.localeCompare(b));
    }, [performancePeriods, selectedWalletTransactions]);

    const { data: performanceSnapshots } = useNetWorthHistory({
        transactions: selectedWalletTransactions,
        assets,
        baseCurrency: settings.visualCurrency,
        locale: settings.locale,
        snapshotDates: performanceSnapshotDates,
    });

    const performanceMetrics = useMemo(() => {
        if (!performanceSnapshots.length) return { twrReturns: [] as ReturnPoint[] };

        const snapshotValues = new Map(
            performanceSnapshots.map((point) => [point.date, point.value]),
        );
        const externalCashFlows = selectedWalletTransactions
            .filter((tx) => tx.type === "deposit" || tx.type === "withdraw")
            .map((tx) => ({
                date: tx.date,
                amount:
                    tx.type === "deposit"
                        ? toBaseValue(tx.amount.value, tx.amount.currency, tx.date)
                        : -toBaseValue(tx.amount.value, tx.amount.currency, tx.date),
            }));
        const endDate = toDateKey(new Date());

        const twrReturns: ReturnPoint[] = calculatePeriodReturns(
            performancePeriods,
            performanceSnapshotDates,
            snapshotValues,
            externalCashFlows,
            endDate,
        ).map(({ label, hasValue, value }) => ({ label, hasValue, value }));

        return { twrReturns };
    }, [
        performancePeriods,
        performanceSnapshotDates,
        performanceSnapshots,
        selectedWalletTransactions,
        toBaseValue,
    ]);

    const selectedTotals = useMemo(() => {
        const walletRows = walletList
            .filter((wallet) => selectedWalletIdSet.has(wallet.id))
            .map((wallet) => {
                const cash = Array.isArray(wallet.cash)
                    ? wallet.cash
                    : Object.entries(wallet.cash ?? {}).map(([currency, value]) => ({
                          currency,
                          value: Number(value),
                      }));
                const cashVisual = getTotalValue(
                    cash.map((bucket) =>
                        toVisualValue(
                            bucket.value,
                            bucket.currency,
                            settings.visualCurrency,
                            forexRates,
                        ),
                    ),
                );
                const positionsByAsset = walletPositions[wallet.id] ?? {};
                const positionsVisual = getTotalValue(
                    Object.entries(positionsByAsset)
                        .filter(([assetId]) => Boolean(assets[assetId]))
                        .map(([assetId, position]) => {
                            const asset = assets[assetId] as Asset;
                            const price =
                                livePricesByAsset[assetId] ?? position.avgCost.value;
                            const currentValue = getPositionCurrentValue(
                                position.amount,
                                price,
                            );
                            return toVisualValue(
                                currentValue,
                                asset.tradingCurrency,
                                settings.visualCurrency,
                                forexRates,
                            );
                        }),
                );
                return positionsVisual + cashVisual;
            });
        return getTotalValue(walletRows);
    }, [
        assets,
        forexRates,
        livePricesByAsset,
        selectedWalletIdSet,
        settings.visualCurrency,
        walletList,
        walletPositions,
    ]);

    const holdingSummaries = useMemo(() => {
        const costBasisByAsset = calculatePositionCostBasis(
            walletTransactions,
            settings.visualCurrency,
            forexRates,
        );
        return positions
            .filter(({ assetId }) => Boolean(assets[assetId]))
            .map(({ assetId, position }) => {
                const asset = assets[assetId] as Asset;
                const costAverage = position.avgCost.value;
                const currentPrice = livePricesByAsset[assetId] ?? costAverage;
                const currentValue = getPositionCurrentValue(
                    position.amount,
                    currentPrice,
                );
                const tradingCurrency = asset.tradingCurrency;
                const investedValue =
                    costBasisByAsset.get(assetId)?.costBasisVisual ??
                    toVisualValue(
                        getPositionInvestedValue(position.amount, costAverage),
                        tradingCurrency,
                        settings.visualCurrency,
                        forexRates,
                    );
                return {
                    assetId,
                    name: asset?.name ?? assetId,
                    ticker: asset?.ticker ?? assetId,
                    assetType: asset?.assetType ?? "other",
                    amount: position.amount,
                    tradingCurrency,
                    currentPrice,
                    currentValue,
                    investedValue,
                    currentValueVisual: toVisualValue(
                        currentValue,
                        tradingCurrency,
                        settings.visualCurrency,
                        forexRates,
                    ),
                    investedValueVisual: investedValue,
                };
            });
    }, [
        assets,
        settings.visualCurrency,
        forexRates,
        livePricesByAsset,
        positions,
        walletTransactions,
    ]);

    const hypotheticalHoldingSummaries = useMemo(() => {
        const savedHypotheticalPrices = settings.hypotheticalAssetPrices ?? {};
        return holdingSummaries.map((summary) => {
            const hypotheticalPrice =
                savedHypotheticalPrices[summary.assetId] ??
                livePricesByAsset[summary.assetId] ??
                summary.currentPrice;
            const hypotheticalCurrentValue = getPositionCurrentValue(
                summary.amount,
                hypotheticalPrice,
            );
            return {
                ...summary,
                hypotheticalPrice,
                hypotheticalCurrentValueVisual: toVisualValue(
                    hypotheticalCurrentValue,
                    summary.tradingCurrency,
                    settings.visualCurrency,
                    forexRates,
                ),
            };
        });
    }, [
        forexRates,
        holdingSummaries,
        livePricesByAsset,
        settings.hypotheticalAssetPrices,
        settings.visualCurrency,
    ]);

    useEffect(() => {
        if (!isHypotheticalModalOpen) {
            return;
        }

        setDraftHypotheticalPrices((previousDraft) => {
            const nextDraft: Record<string, string> = {};
            hypotheticalHoldingSummaries.forEach((summary) => {
                const savedPrice =
                    settings.hypotheticalAssetPrices?.[summary.assetId];
                nextDraft[summary.assetId] =
                    savedPrice !== undefined
                        ? String(savedPrice)
                        : String(summary.hypotheticalPrice);
            });

            const previousKeys = Object.keys(previousDraft);
            const nextKeys = Object.keys(nextDraft);
            if (
                previousKeys.length === nextKeys.length &&
                nextKeys.every(
                    (assetId) => previousDraft[assetId] === nextDraft[assetId],
                )
            ) {
                return previousDraft;
            }

            return nextDraft;
        });
    }, [
        hypotheticalHoldingSummaries,
        isHypotheticalModalOpen,
        settings.hypotheticalAssetPrices,
    ]);

    const totals = useMemo(() => {
        const walletUnrealizedRows = Object.values(wallets).map((wallet) => {
            const walletPositionsByAsset = walletPositions[wallet.id] ?? {};
            const walletTransactionsForWallet = walletTransactions.filter(
                (tx) => tx.walletId === wallet.id,
            );
            const costBasisByAsset = calculatePositionCostBasis(
                walletTransactionsForWallet,
                settings.visualCurrency,
                forexRates,
            );

            const positionRows = Object.entries(walletPositionsByAsset)
                .filter(([assetId]) => Boolean(assets[assetId]))
                .map(([assetId, position]) => {
                    const asset = assets[assetId] as Asset;
                    const costAverage = position.avgCost.value;
                    const currentPrice =
                        livePricesByAsset[assetId] ?? costAverage;
                    const currentValue = getPositionCurrentValue(
                        position.amount,
                        currentPrice,
                    );
                    const currentValueVisual = toVisualValue(
                        currentValue,
                        asset.tradingCurrency,
                        settings.visualCurrency,
                        forexRates,
                    );
                    const investedValueVisual =
                        costBasisByAsset.get(assetId)?.costBasisVisual ??
                        toVisualValue(
                            getPositionInvestedValue(
                                position.amount,
                                costAverage,
                            ),
                            asset.tradingCurrency,
                            settings.visualCurrency,
                            forexRates,
                        );

                    return {
                        currentValue: currentValueVisual,
                        investedValue: investedValueVisual,
                    };
                });

            const invested = getTotalValue(
                positionRows.map((row) => row.investedValue),
            );
            const current = getTotalValue(
                positionRows.map((row) => row.currentValue),
            );

            return {
                invested,
                current,
                pnl: getPnL(current, invested),
            };
        });

        const totalInvested = getTotalValue(
            walletUnrealizedRows.map((row) => row.invested),
        );
        const totalCurrent = getTotalValue(
            walletUnrealizedRows.map((row) => row.current),
        );
        const totalPnL = getTotalValue(
            walletUnrealizedRows.map((row) => row.pnl),
        );
        const totalPnLPercent = getPnLPercent(totalCurrent, totalInvested);
        const cashTotal = getTotalValue(
            cashBuckets.map((bucket) =>
                toVisualValue(
                    bucket.value,
                    bucket.currency,
                    settings.visualCurrency,
                    forexRates,
                ),
            ),
        );

        return {
            invested: totalInvested,
            current: totalCurrent,
            pnl: totalPnL,
            pnlPercent: totalPnLPercent,
            cash: cashTotal,
            netWorth: getNetWorth(totalCurrent, cashTotal),
        };
    }, [
        assets,
        cashBuckets,
        forexRates,
        livePricesByAsset,
        settings.visualCurrency,
        walletPositions,
        walletTransactions,
        wallets,
    ]);
    const realizedPnl = useMemo(
        () =>
            calculateRealizedPnl(
                walletTransactions,
                settings.visualCurrency,
                forexRates,
                getForexRate,
            ),
        [forexRates, getForexRate, settings.visualCurrency, walletTransactions],
    );

    const hypotheticalTotals = useMemo(() => {
        const hypotheticalCurrent = getTotalValue(
            hypotheticalHoldingSummaries.map(
                (summary) => summary.hypotheticalCurrentValueVisual,
            ),
        );
        const hypotheticalInvested = totals.invested;
        const hypotheticalUnrealized = getPnL(
            hypotheticalCurrent,
            hypotheticalInvested,
        );

        return {
            current: hypotheticalCurrent,
            invested: hypotheticalInvested,
            unrealized: hypotheticalUnrealized,
            netWorth: getNetWorth(hypotheticalCurrent, totals.cash),
        };
    }, [hypotheticalHoldingSummaries, totals.cash, totals.invested]);

    const totalPnl = totals.pnl + realizedPnl;
    const unrealizedIsPositive = totals.pnl >= 0;
    const realizedIsPositive = realizedPnl >= 0;
    const totalIsPositive = totalPnl >= 0;
    const hypotheticalUnrealizedIsPositive = hypotheticalTotals.unrealized >= 0;

    const handleSaveHypotheticalPrices = () => {
        const nextPrices: Record<string, number> = {};
        hypotheticalHoldingSummaries.forEach((summary) => {
            const draftValue = draftHypotheticalPrices[summary.assetId]?.trim();
            if (!draftValue) {
                return;
            }
            const parsedPrice = Number(draftValue);
            if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                return;
            }
            nextPrices[summary.assetId] = parsedPrice;
        });
        dispatch(
            updateSettings({
                hypotheticalAssetPrices: nextPrices,
            }),
        );
        setIsHypotheticalModalOpen(false);
    };

    const handleResetHypotheticalPrices = () => {
        dispatch(
            updateSettings({
                hypotheticalAssetPrices: {},
            }),
        );
        setIsHypotheticalModalOpen(false);
    };

    const assetTypeData = useMemo(() => {
        const totalsByType = holdingSummaries.reduce<Record<string, number>>(
            (acc, summary) => {
                acc[summary.assetType] =
                    (acc[summary.assetType] ?? 0) + summary.currentValueVisual;
                return acc;
            },
            {},
        );

        const cashTotal = cashBuckets.reduce((sum, bucket) => {
            return (
                sum +
                toVisualValue(
                    bucket.value,
                    bucket.currency,
                    settings.visualCurrency,
                    forexRates,
                )
            );
        }, 0);

        if (cashTotal > 0) {
            totalsByType.cash = (totalsByType.cash ?? 0) + cashTotal;
        }

        const totalValue = getTotalValue(Object.values(totalsByType));

        return Object.entries(totalsByType)
            .map(([type, value]) => ({
                name: type.toUpperCase(),
                value: Number(
                    getAllocationPercent(value, totalValue).toFixed(2),
                ),
                color: assetTypeColors[type] ?? "#94a3b8",
            }))
            .filter((entry) => entry.value > 0);
    }, [cashBuckets, forexRates, holdingSummaries, settings.visualCurrency]);

    const currencyData = useMemo(() => {
        const totalsByCurrency = new Map<string, number>();
        holdingSummaries.forEach((summary) => {
            const current = totalsByCurrency.get(summary.tradingCurrency) ?? 0;
            totalsByCurrency.set(
                summary.tradingCurrency,
                current + summary.currentValueVisual,
            );
        });
        cashBuckets.forEach((bucket) => {
            const current = totalsByCurrency.get(bucket.currency) ?? 0;
            totalsByCurrency.set(
                bucket.currency,
                current +
                    toVisualValue(
                        bucket.value,
                        bucket.currency,
                        settings.visualCurrency,
                        forexRates,
                    ),
            );
        });
        const totalValue = getTotalValue(Array.from(totalsByCurrency.values()));

        return Array.from(totalsByCurrency.entries())
            .map(([currency, value], index) => ({
                name: currency,
                value: Number(
                    getAllocationPercent(value, totalValue).toFixed(2),
                ),
                color: currencyPalette[index % currencyPalette.length],
            }))
            .filter((entry) => entry.value > 0);
    }, [cashBuckets, holdingSummaries, forexRates, settings.visualCurrency]);

    const riskData = useMemo(() => {
        const buckets = {
            low: 0,
            medium: 0,
            high: 0,
        };

        Object.values(pies).forEach((pie) => {
            const risk = pie.risk ?? 0;
            const pieValue = pie.assetIds.reduce((sum, assetId) => {
                const holding = holdingSummaries.find(
                    (summary) => summary.assetId === assetId,
                );
                return sum + (holding?.currentValueVisual ?? 0);
            }, 0);

            if (risk <= 2) buckets.low += pieValue;
            else if (risk === 3) buckets.medium += pieValue;
            else buckets.high += pieValue;
        });

        const totalValue = buckets.low + buckets.medium + buckets.high;

        return [
            {
                name: "Low (1-2)",
                value: Number(
                    getAllocationPercent(buckets.low, totalValue).toFixed(2),
                ),
                color: "#10b981",
            },
            {
                name: "Medium (3)",
                value: Number(
                    getAllocationPercent(buckets.medium, totalValue).toFixed(2),
                ),
                color: "#f59e0b",
            },
            {
                name: "High (4-5)",
                value: Number(
                    getAllocationPercent(buckets.high, totalValue).toFixed(2),
                ),
                color: "#ef4444",
            },
        ].filter((entry) => entry.value > 0);
    }, [holdingSummaries, pies]);

    const pieAllocationData = useMemo(() => {
        const valueByAssetId = holdingSummaries.reduce<Map<string, number>>(
            (map, summary) => {
                map.set(
                    summary.assetId,
                    (map.get(summary.assetId) ?? 0) +
                        summary.currentValueVisual,
                );
                return map;
            },
            new Map(),
        );
        const pieTotals = Object.values(pies).map((pie) => {
            const pieValue = pie.assetIds.reduce((sum, assetId) => {
                return sum + (valueByAssetId.get(assetId) ?? 0);
            }, 0);
            return { id: pie.id, name: pie.name, value: pieValue };
        });

        const totalValue = getTotalValue(pieTotals.map((pie) => pie.value));

        return pieTotals
            .map((pie, index) => ({
                name: pie.name,
                value: Number(
                    getAllocationPercent(pie.value, totalValue).toFixed(2),
                ),
                color: piePalette[index % piePalette.length],
            }))
            .filter((entry) => entry.value > 0);
    }, [holdingSummaries, pies]);

    const netWorthShareData = useMemo(() => {
        const snapshotDates = Array.from(
            new Set(walletTransactions.map((tx) => tx.date)),
        ).sort((a, b) => a.localeCompare(b));

        if (snapshotDates.length === 0) {
            return { data: [], series: [] as Array<{ key: string; label: string; color: string }> };
        }

        const buildSeriesMap = (
            groups: Array<{
                key: string;
                label: string;
                color: string;
                assetIds?: string[];
                walletId?: string;
                includeCash?: boolean;
                includeHoldings?: boolean;
            }>,
        ) => {
            const mapByDate = new Map<string, Record<string, number>>();

            groups.forEach((group) => {
                const filteredTransactions = group.walletId
                    ? walletTransactions.filter((tx) => tx.walletId === group.walletId)
                    : walletTransactions;

                const history = buildNetWorthHistory({
                    transactions: filteredTransactions,
                    forexRates,
                    baseCurrency: settings.visualCurrency,
                    locale: settings.locale,
                    assetFilter: group.assetIds ? new Set(group.assetIds) : undefined,
                    includeCash: group.includeCash ?? false,
                    includeHoldings: group.includeHoldings ?? true,
                    includeDeposits: true,
                    includeWithdrawals: true,
                    includeDividends: true,
                    includeForex: true,
                    getForexRate,
                    snapshotDates,
                });

                history.forEach((point) => {
                    const row = mapByDate.get(point.date) ?? {
                        date: point.date,
                        name: formatHistoryDate(point.date, settings.locale),
                    };
                    row[group.key] = Math.max(0, point.value);
                    mapByDate.set(point.date, row);
                });
            });

            return snapshotDates.map((date) => {
                const row = mapByDate.get(date) ?? {
                    date,
                    name: formatHistoryDate(date, settings.locale),
                };
                groups.forEach((group) => {
                    if (typeof row[group.key] !== "number") {
                        row[group.key] = 0;
                    }
                });
                return row;
            });
        };

        if (shareView === "assetType") {
            const assetIdsByType = Object.values(assets).reduce<Record<string, string[]>>(
                (acc, asset) => {
                    const key = asset.assetType ?? "other";
                    acc[key] = acc[key] ?? [];
                    acc[key].push(asset.id);
                    return acc;
                },
                {},
            );

            const series = Object.entries(assetIdsByType)
                .map(([assetType, assetIds]) => ({
                    key: assetType,
                    label: assetType.toUpperCase(),
                    color: assetTypeColors[assetType] ?? "#94a3b8",
                    assetIds,
                    includeCash: false,
                }))
                .filter((entry) => entry.assetIds.length > 0);

            const cashSeries = {
                key: "cash",
                label: "CASH",
                color: assetTypeColors.cash,
                includeCash: true,
                includeHoldings: false,
            };

            const filteredSeries = series.filter((entry) => entry.key !== "cash");
            filteredSeries.push(cashSeries);

            return {
                data: buildSeriesMap(filteredSeries),
                series: filteredSeries.map(({ key, label, color }) => ({ key, label, color })),
            };
        }

        if (shareView === "pie") {
            const series = Object.values(pies)
                .map((pie, index) => ({
                    key: pie.id,
                    label: pie.name,
                    color: piePalette[index % piePalette.length],
                    assetIds: pie.assetIds,
                    includeCash: false,
                }))
                .filter((entry) => entry.assetIds.length > 0);

            return {
                data: buildSeriesMap(series),
                series: series.map(({ key, label, color }) => ({ key, label, color })),
            };
        }

        const walletSeries = Object.values(wallets).map((wallet, index) => ({
            key: wallet.id,
            label: wallet.name,
            color: walletPalette[index % walletPalette.length],
            walletId: wallet.id,
            includeCash: true,
        }));

        return {
            data: buildSeriesMap(walletSeries),
            series: walletSeries.map(({ key, label, color }) => ({ key, label, color })),
        };
    }, [
        assets,
        pies,
        settings.locale,
        settings.visualCurrency,
        forexRates,
        getForexRate,
        shareView,
        walletTransactions,
        wallets,
    ]);

    const topHoldings = useMemo(() => {
        const totalValue = getTotalValue(
            holdingSummaries.map((summary) => summary.currentValueVisual),
        );
        return [...holdingSummaries]
            .sort((a, b) => b.currentValueVisual - a.currentValueVisual)
            .slice(0, 5)
            .map((summary) => ({
                name: `${summary.name} (${summary.ticker})`,
                value: Number(
                    getAllocationPercent(
                        summary.currentValueVisual,
                        totalValue,
                    ).toFixed(2),
                ),
            }));
    }, [holdingSummaries]);

    const toggleWalletSelection = useCallback((walletId: string) => {
        setSelectedWalletIds((previous) => {
            const exists = previous.includes(walletId);
            if (exists) {
                if (previous.length <= 1) {
                    return previous;
                }
                return previous.filter((id) => id !== walletId);
            }
            return [...previous, walletId];
        });
    }, []);

    return (
        <div className="pb-20">
            <PageHeader title="Statistics" onMenuClick={onMenuClick} />

            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Total Net Worth
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(
                                totals.netWorth,
                                settings.visualCurrency,
                            )}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-app-muted">
                            <p>
                                Assets{" "}
                                {formatCurrency(
                                    totals.current,
                                    settings.visualCurrency,
                                )}
                            </p>
                            <p>
                                Cash{" "}
                                {formatCurrency(
                                    totals.cash,
                                    settings.visualCurrency,
                                )}
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                                Net Worth if Prices = X (Today)
                            </p>
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={<Settings2 size={14} />}
                                onClick={() => setIsHypotheticalModalOpen(true)}
                            >
                                Set X
                            </Button>
                        </div>
                        <div className="mt-2 space-y-2">
                            <p className="text-2xl font-bold text-app-foreground">
                                {formatCurrency(
                                    hypotheticalTotals.netWorth,
                                    settings.visualCurrency,
                                )}
                            </p>
                            <p className="text-sm text-app-muted">
                                Unrealized
                                <span
                                    className={`ml-2 font-semibold ${
                                        hypotheticalUnrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {hypotheticalUnrealizedIsPositive
                                        ? "+"
                                        : ""}
                                    {formatCurrency(
                                        hypotheticalTotals.unrealized,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Cost Basis
                                <span className="ml-2 text-app-foreground font-semibold">
                                    {formatCurrency(
                                        hypotheticalTotals.invested,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Open Positions
                        </p>
                        <div className="mt-2 space-y-2">
                            <p className="text-2xl font-bold text-app-foreground">
                                {formatCurrency(
                                    totals.current,
                                    settings.visualCurrency,
                                )}
                            </p>
                            <p className="text-sm text-app-muted">
                                Unrealized
                                <span
                                    className={`ml-2 font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        totals.pnl,
                                        settings.visualCurrency,
                                    )}
                                </span>
                                <span
                                    className={`ml-2 text-xs font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    ({unrealizedIsPositive ? "+" : ""}
                                    {totals.pnlPercent.toFixed(1)}%)
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Cost Basis
                                <span className="ml-2 text-app-foreground font-semibold">
                                    {formatCurrency(
                                        totals.invested,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Performance
                        </p>
                        <div className="mt-2 space-y-2">
                            <p className="text-sm text-app-muted">
                                Unrealized
                                <span
                                    className={`ml-2 font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        totals.pnl,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Realized
                                <span
                                    className={`ml-2 font-semibold ${
                                        realizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {realizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        realizedPnl,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Total
                                <span
                                    className={`ml-2 font-semibold ${
                                        totalIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {totalIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        totalPnl,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                        </div>
                    </Card>
                </section>

                <section>
                    <Card
                        title="Performance History"
                        action={
                            <div className="text-xs text-app-muted">
                                Consolidated Value:{" "}
                                <span className="font-semibold text-app-foreground">
                                    {formatCurrency(
                                        selectedTotals,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </div>
                        }
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-app-muted">
                                            TWR
                                            <Tooltip content="TWR measures how the portfolio itself performed, ignoring deposits and withdrawals. Think: 'If this portfolio had €1 invested from day 1, how would it grow?' It captures stock picking, allocation, and rebalancing. Example: bad stocks drop -40%, then you deposit a lot -> TWR stays about -40% because strategy was bad regardless of cash-flow timing. Use TWR to compare with S&P500 Acc Total Return (same period), evaluate investing skill, and compare strategies fairly.">
                                                <Info size={12} />
                                            </Tooltip>
                                        </span>
                                        {performanceMetrics.twrReturns.map((periodReturn) => (
                                            <span
                                                key={`stats-twr-${periodReturn.label}`}
                                                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                                                    periodReturn.hasValue
                                                        ? periodReturn.value >= 0
                                                            ? "text-app-success bg-emerald-500/10"
                                                            : "text-app-danger bg-rose-500/10"
                                                        : "text-app-muted bg-app-surface"
                                                }`}
                                            >
                                                <span>{periodReturn.label}</span>
                                                <span>
                                                    {periodReturn.hasValue
                                                        ? `${periodReturn.value >= 0 ? "+" : ""}${periodReturn.value.toFixed(2)}%`
                                                        : "n/a"}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                    {apyStartYear !== null && apyYearOptions.length > 0 ? (
                                        <label className="inline-flex items-center gap-2 text-xs text-app-muted">
                                            APY start
                                            <select
                                                value={apyStartYear}
                                                onChange={(event) =>
                                                    setApyStartYear(Number(event.target.value))
                                                }
                                                className="bg-app-surface border border-app-border rounded px-2 py-1 text-app-foreground"
                                            >
                                                {apyYearOptions.map((year) => (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    ) : null}
                                </div>
                                {selectedWalletTransactions.length > 0 ? (
                                    <NetWorthHistoryChart
                                        transactions={selectedWalletTransactions}
                                        assets={assets}
                                        baseCurrency={settings.visualCurrency}
                                        height={300}
                                        currency={settings.visualCurrency}
                                        locale={settings.locale}
                                        showNetInvestedLine
                                        forexRates={forexRates}
                                        getForexRate={getForexRate}
                                        showBenchmarkLine
                                        benchmarkSymbol={settings.sp500AccSymbol}
                                        benchmarkCurrency={settings.sp500AccCurrency}
                                    />
                                ) : (
                                    <p className="text-sm text-app-muted">
                                        Add transactions to see net worth history.
                                    </p>
                                )}
                            </div>
                            <div className="rounded-xl border border-app-border p-3 h-fit">
                                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-3">
                                    Included Wallets
                                </p>
                                <div className="space-y-2">
                                    {walletList.map((wallet) => {
                                        const checked = selectedWalletIdSet.has(wallet.id);
                                        return (
                                            <label
                                                key={`wallet-select-${wallet.id}`}
                                                className="flex items-center gap-2 text-sm text-app-foreground"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        toggleWalletSelection(wallet.id)
                                                    }
                                                    disabled={
                                                        checked &&
                                                        selectedWalletIds.length === 1
                                                    }
                                                    className="accent-app-primary"
                                                />
                                                <span>{wallet.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Allocation by Asset Class">
                        <PieChart data={assetTypeData} height={300} />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {assetTypeData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Currency Exposure">
                        <PieChart data={currencyData} height={300} />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {currencyData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Allocation by Pie">
                        <PieChart data={pieAllocationData} height={300} />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {pieAllocationData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card
                        title="Net Worth Share Over Time"
                        className="md:col-span-3"
                        action={
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={shareView === "assetType" ? "primary" : "secondary"}
                                    onClick={() => setShareView("assetType")}
                                >
                                    Asset Type
                                </Button>
                                <Button
                                    size="sm"
                                    variant={shareView === "pie" ? "primary" : "secondary"}
                                    onClick={() => setShareView("pie")}
                                >
                                    Pie
                                </Button>
                                <Button
                                    size="sm"
                                    variant={shareView === "wallet" ? "primary" : "secondary"}
                                    onClick={() => setShareView("wallet")}
                                >
                                    Wallet
                                </Button>
                            </div>
                        }
                    >
                        <StackedNormalizedAreaChart
                            data={netWorthShareData.data}
                            series={netWorthShareData.series}
                            height={320}
                        />
                    </Card>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Risk Distribution">
                        <PieChart data={riskData} height={260} />
                        <div className="mt-4 grid gap-2">
                            {riskData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    ></div>
                                    <span className="text-app-foreground">
                                        {d.name}
                                    </span>
                                    <span className="text-app-muted ml-auto">
                                        {d.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Top Holdings">
                        <div className="space-y-4">
                            {topHoldings.map((holding) => (
                                <div key={holding.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-app-foreground">
                                            {holding.name}
                                        </span>
                                        <span className="text-app-muted">
                                            {holding.value}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-app-border/60">
                                        <div
                                            className="h-2 rounded-full bg-app-accent"
                                            style={{
                                                width: `${holding.value}%`,
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Momentum & Costs">
                        <div className="mt-1 rounded-xl border border-app-border bg-app-bg/50 p-3 text-sm text-app-muted">
                            Keep this section for future trend/cost analytics.
                        </div>
                    </Card>
                </section>
                <Modal
                    isOpen={isHypotheticalModalOpen}
                    onClose={() => setIsHypotheticalModalOpen(false)}
                    title="Set hypothetical asset prices"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-app-muted">
                            Define your own prices (X) for each open position.
                            Leave any field empty to use the current live price.
                        </p>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {hypotheticalHoldingSummaries.map((summary) => (
                                <label
                                    key={summary.assetId}
                                    className="block border border-app-border rounded-xl p-3"
                                >
                                    <p className="text-sm font-semibold text-app-foreground">
                                        {summary.name} ({summary.ticker})
                                    </p>
                                    <p className="text-xs text-app-muted mt-1">
                                        Current:{" "}
                                        {formatCurrency(
                                            summary.currentPrice,
                                            summary.tradingCurrency,
                                        )}
                                    </p>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={
                                            draftHypotheticalPrices[
                                                summary.assetId
                                            ] ?? ""
                                        }
                                        onChange={(event) =>
                                            setDraftHypotheticalPrices(
                                                (prev) => ({
                                                    ...prev,
                                                    [summary.assetId]:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 w-full px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-foreground"
                                        placeholder={String(
                                            summary.currentPrice,
                                        )}
                                    />
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-between gap-2">
                            <Button
                                variant="ghost"
                                onClick={handleResetHypotheticalPrices}
                            >
                                Reset to current prices
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        setIsHypotheticalModalOpen(false)
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveHypotheticalPrices}>
                                    Save prices
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal>
            </main>
        </div>
    );
};
