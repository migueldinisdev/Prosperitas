import { Money, WalletLot, WalletTx } from "../schema-types";
import { lotQuoteCost, quantitySum, replayLedger } from "./walletLedger";

export const getPositionCurrentValue = (units: number, currentPrice: number) =>
    units * currentPrice;

export const getPositionInvestedValue = (
    units: number,
    costAverage: number
) => units * costAverage;

export const getConvertedValue = (amount: number, rate: number) =>
    amount * rate;

export const getPnL = (currentValue: number, investedValue: number) =>
    currentValue - investedValue;

export const getPnLPercent = (currentValue: number, investedValue: number) =>
    investedValue === 0 ? 0 : (getPnL(currentValue, investedValue) / investedValue) * 100;

export const getAllocationPercent = (
    currentValue: number,
    totalValue: number
) => (totalValue > 0 ? (currentValue / totalValue) * 100 : 0);

export const getTotalValue = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0);

export const getNetWorth = (currentValue: number, cashValue: number) =>
    currentValue + cashValue;

export type ForexRateGetter = (currency: string, date: string) => number | null;
export type PortfolioValuePoint = { date: string; value: number };
export type CashFlowPoint = { date: string; amount: number };
export type PerformancePeriod = {
    key: string;
    label: string;
    startDate: string | null;
};
export type PeriodReturnPoint = {
    key: string;
    label: string;
    hasValue: boolean;
    value: number;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const resolveForexRate = (
    currency: string,
    visualCurrency: string,
    forexRates: Record<string, number>,
    date?: string,
    getForexRate?: ForexRateGetter
) => {
    if (currency === visualCurrency) {
        return 1;
    }
    const historicalRate = date && getForexRate ? getForexRate(currency, date) : null;
    const rate = historicalRate ?? forexRates[currency];
    return Number.isFinite(rate) && rate > 0 ? rate : null;
};

export const calculateTimeWeightedReturn = (
    portfolioValues: PortfolioValuePoint[],
    cashFlows: CashFlowPoint[]
) => {
    if (portfolioValues.length < 2 || portfolioValues.some((point) => !Number.isFinite(point.value)) ||
        cashFlows.some((flow) => !Number.isFinite(flow.amount))) return null;
    const orderedValues = [...new Map(portfolioValues.map((point) => [point.date, point])).values()]
        .sort((a, b) => a.date.localeCompare(b.date));
    const orderedFlows = [...cashFlows].sort((a, b) => a.date.localeCompare(b.date));
    let flowIndex = 0;

    let twrFactor = 1;
    let hasValidPeriod = false;

    for (let index = 1; index < orderedValues.length; index += 1) {
        const previousValue = orderedValues[index - 1].value;
        const currentPoint = orderedValues[index];
        let periodCashFlow = 0;
        while (flowIndex < orderedFlows.length && orderedFlows[flowIndex].date <= currentPoint.date) {
            const flow = orderedFlows[flowIndex++];
            if (flow.date > orderedValues[index - 1].date) periodCashFlow = quantitySum(periodCashFlow, flow.amount);
        }
        if (previousValue === 0) continue;
        const periodReturn = (currentPoint.value - periodCashFlow) / previousValue - 1;
        twrFactor *= 1 + periodReturn;
        if (!Number.isFinite(twrFactor) || twrFactor < 0) return null;
        hasValidPeriod = true;
    }

    if (!hasValidPeriod) return null;
    return twrFactor - 1;
};

export const calculatePeriodReturns = (
    periods: PerformancePeriod[],
    snapshotDates: string[],
    snapshotValues: Map<string, number>,
    cashFlows: CashFlowPoint[],
    endDate: string,
    apyPeriodKey = "ALL"
): PeriodReturnPoint[] =>
    periods.map((period) => {
        const rawStartDate = period.startDate;
        if (!rawStartDate) {
            return {
                key: period.key,
                label: period.label,
                hasValue: false,
                value: 0,
            };
        }

        const startDate = rawStartDate > endDate ? endDate : rawStartDate;
        const datesInRange = [...new Set(snapshotDates)].filter(
            (date) => date >= startDate && date <= endDate
        ).sort();
        if (datesInRange.length < 2) {
            return {
                key: period.key,
                label: period.label,
                hasValue: false,
                value: 0,
            };
        }

        const periodPortfolioValues = datesInRange.map((date) => ({
            date,
            value: snapshotValues.get(date) ?? 0,
        }));
        const startValue = periodPortfolioValues[0].value;
        if (startValue <= 0) {
            return {
                key: period.key,
                label: period.label,
                hasValue: false,
                value: 0,
            };
        }

        const periodCashFlows = cashFlows.filter(
            (flow) => flow.date >= startDate && flow.date <= endDate
        );
        const twrDecimal = calculateTimeWeightedReturn(
            periodPortfolioValues,
            periodCashFlows
        );
        if (twrDecimal === null) {
            return {
                key: period.key,
                label: period.label,
                hasValue: false,
                value: 0,
            };
        }

        if (period.key === apyPeriodKey) {
            const startTime = new Date(startDate).getTime();
            const endTime = new Date(endDate).getTime();
            const days = Math.max(1, (endTime - startTime) / MS_PER_DAY);
            const apy = Math.pow(1 + twrDecimal, 365 / days) - 1;
            if (!Number.isFinite(apy)) return { key: period.key, label: period.label, hasValue: false, value: 0 };
            return {
                key: period.key,
                label: period.label,
                hasValue: true,
                value: apy * 100,
            };
        }

        return {
            key: period.key,
            label: period.label,
            hasValue: true,
            value: twrDecimal * 100,
        };
    });

export const toVisualValue = (
    amount: number,
    currency: string,
    visualCurrency: string,
    forexRates: Record<string, number>,
    date?: string,
    getForexRate?: ForexRateGetter
) => {
    if (currency === visualCurrency) {
        return amount;
    }
    const rate = resolveForexRate(
        currency,
        visualCurrency,
        forexRates,
        date,
        getForexRate
    );
    if (!rate) return amount;
    return getConvertedValue(amount, rate);
};

const parseFxPair = (fxPair?: string) => {
    if (!fxPair) return null;
    const [base, quote] = fxPair
        .split("/")
        .map((part) => part.trim().toUpperCase());
    if (!base || !quote) return null;
    return { base, quote };
};

const transactionForexRate = (
    currency: string, visualCurrency: string, forexRates: Record<string, number>,
    fxPair?: string, fxRate?: number, date?: string, getForexRate?: ForexRateGetter,
) => {
    const from = currency.trim().toUpperCase(), to = visualCurrency.trim().toUpperCase();
    if (from === to) return 1;
    const pair = parseFxPair(fxPair);
    if (pair && Number.isFinite(fxRate) && fxRate > 0) {
        if (from === pair.base && to === pair.quote) return fxRate;
        if (from === pair.quote && to === pair.base) return 1 / fxRate;
    }
    return resolveForexRate(from, to, forexRates, date, getForexRate);
};

const toVisualValueUsingTxFx = (
    amount: number, currency: string, visualCurrency: string, forexRates: Record<string, number>,
    fxPair?: string, fxRate?: number, date?: string, getForexRate?: ForexRateGetter,
) => amount * (transactionForexRate(currency, visualCurrency, forexRates, fxPair, fxRate, date, getForexRate) ?? 1);

export const toVisualMoney = (
    money: Money,
    visualCurrency: string,
    forexRates: Record<string, number>,
    date?: string,
    getForexRate?: ForexRateGetter
) =>
    toVisualValue(
        money.value,
        money.currency,
        visualCurrency,
        forexRates,
        date,
        getForexRate
    );

/** Original acquisition values travel with the lot, including its entry FX. */
export const getLotCostValue = (lot: WalletLot, visualCurrency: string, forexRates: Record<string, number>, getForexRate?: ForexRateGetter) => {
    const convert = (money: Money) => toVisualValueUsingTxFx(money.value, money.currency, visualCurrency,
        forexRates, lot.fxPair, lot.fxRate, lot.acquiredAt.slice(0, 10), getForexRate);
    return lot.quantity * (convert(lot.price) + (lot.feePerUnit ? convert(lot.feePerUnit) : 0));
};

export const calculatePositionCostBasis = (
    transactions: WalletTx[], visualCurrency: string, forexRates: Record<string, number>, getForexRate?: ForexRateGetter,
) => {
    const book = replayLedger(transactions);
    const positions = new Map<string, { amount: number; costBasisVisual: number }>();
    Object.values(book.lots).forEach((assets) => Object.entries(assets).forEach(([assetId, lots]) => {
        const value = positions.get(assetId) ?? { amount: 0, costBasisVisual: 0 };
        lots.forEach((lot) => {
            value.amount = quantitySum(value.amount, lot.quantity);
            value.costBasisVisual += getLotCostValue(lot, visualCurrency, forexRates, getForexRate);
        });
        positions.set(assetId, value);
    }));
    return positions;
};

export const calculatePositionCostBasisFx = (
    transactions: WalletTx[], visualCurrency: string, forexRates: Record<string, number>, getForexRate?: ForexRateGetter,
) => {
    const positions = new Map<string, { amount: number; costBasisQuote: number; costBasisBase: number; hasMissingFx: boolean }>();
    const book = replayLedger(transactions);
    Object.values(book.lots).forEach((assets) => Object.entries(assets).forEach(([assetId, lots]) => {
        const value = positions.get(assetId) ?? { amount: 0, costBasisQuote: 0, costBasisBase: 0, hasMissingFx: false };
        lots.forEach((lot) => {
            const rate = transactionForexRate(lot.price.currency, visualCurrency, forexRates,
                lot.fxPair, lot.fxRate, lot.acquiredAt.slice(0, 10), getForexRate);
            value.amount = quantitySum(value.amount, lot.quantity);
            // Convert acquisition fees into the lot's quote currency at entry,
            // using the same original rates as the base-currency cost.
            const feeRate = lot.feePerUnit ? transactionForexRate(lot.feePerUnit.currency,
                visualCurrency, forexRates, lot.fxPair, lot.fxRate, lot.acquiredAt, getForexRate) : 1;
            value.costBasisQuote += rate && feeRate ? lot.quantity * (lot.price.value +
                (lot.feePerUnit ? lot.feePerUnit.value * feeRate / rate : 0)) : lotQuoteCost(lot);
            value.costBasisBase += getLotCostValue(lot, visualCurrency, forexRates, getForexRate);
            value.hasMissingFx ||= rate === null || !!lot.feePerUnit && transactionForexRate(
                lot.feePerUnit.currency, visualCurrency, forexRates, lot.fxPair, lot.fxRate,
                lot.acquiredAt.slice(0, 10), getForexRate) === null;
        });
        positions.set(assetId, value);
    }));
    return positions;
};

export const calculateRealizedPnlBreakdown = (
    transactions: WalletTx[], visualCurrency: string, forexRates: Record<string, number>, getForexRate?: ForexRateGetter,
) => {
    const book = replayLedger(transactions);
    return transactions.reduce((result, tx) => {
        let realized = 0;
        if (tx.type === "sell") {
            const proceeds = toVisualValueUsingTxFx(tx.price.value * tx.quantity, tx.price.currency,
                visualCurrency, forexRates, tx.fxPair, tx.fxRate, tx.date, getForexRate);
            const cost = (book.consumed[tx.id] ?? []).reduce((sum, lot) => sum + getLotCostValue(lot, visualCurrency, forexRates, getForexRate), 0);
            const fees = tx.fees ? toVisualValueUsingTxFx(tx.fees.value, tx.fees.currency, visualCurrency,
                forexRates, tx.fxPair, tx.fxRate, tx.date, getForexRate) : 0;
            realized = proceeds - cost - fees;
        } else if (tx.type === "transfer" && tx.direction === "out" && tx.fee) {
            // No sale is invented. Expense the removed basis; the corresponding
            // unrealized PnL disappears with the fee units, accounting for their value.
            realized = tx.fee.kind === "cash"
                ? -toVisualValue(tx.fee.amount.value, tx.fee.amount.currency, visualCurrency, forexRates, tx.date, getForexRate)
                : -(book.transactions[tx.id] as typeof tx).feeLots?.reduce((sum, lot) => sum + getLotCostValue(lot, visualCurrency, forexRates, getForexRate), 0) || 0;
        }
        if (realized >= 0) result.positive += realized;
        else result.negative += realized;
        return result;
    }, { positive: 0, negative: 0 });
};

export const calculateRealizedPnl = (
    transactions: WalletTx[], visualCurrency: string, forexRates: Record<string, number>, getForexRate?: ForexRateGetter,
) => {
    const result = calculateRealizedPnlBreakdown(transactions, visualCurrency, forexRates, getForexRate);
    return result.positive + result.negative;
};
