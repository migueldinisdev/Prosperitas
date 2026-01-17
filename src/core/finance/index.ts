import { Money, WalletTx } from "../schema-types";

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

const calculateWeightedAverage = (
    currentAmount: number,
    currentAvgCost: Money,
    deltaQuantity: number,
    txPrice: Money
): Money => {
    const nextAmount = currentAmount + deltaQuantity;
    if (nextAmount <= 0) {
        return { value: 0, currency: txPrice.currency };
    }

    const currentCost = currentAmount * currentAvgCost.value;
    const deltaCost = deltaQuantity * txPrice.value;
    return {
        currency: txPrice.currency,
        value: (currentCost + deltaCost) / nextAmount,
    };
};

export type ForexRateGetter = (currency: string, date: string) => number | null;

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
    return historicalRate ?? forexRates[currency] ?? null;
};

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

const toVisualValueUsingTxFx = (
    amount: number,
    currency: string,
    visualCurrency: string,
    forexRates: Record<string, number>,
    fxPair?: string,
    fxRate?: number
) => {
    const normalizedCurrency = currency.trim().toUpperCase();
    const normalizedVisualCurrency = visualCurrency.trim().toUpperCase();
    const pair = parseFxPair(fxPair);
    if (pair && fxRate) {
        if (
            normalizedVisualCurrency === pair.base &&
            normalizedCurrency === pair.quote
        ) {
            return amount / fxRate;
        }
        if (
            normalizedVisualCurrency === pair.quote &&
            normalizedCurrency === pair.base
        ) {
            return amount * fxRate;
        }
    }
    return toVisualValue(amount, currency, visualCurrency, forexRates);
};

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

export const calculatePositionCostBasis = (
    transactions: WalletTx[],
    visualCurrency: string,
    forexRates: Record<string, number>
) => {
    const positions = new Map<string, { amount: number; costBasisVisual: number }>();
    const sorted = [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    });

    sorted.forEach((tx) => {
        if (tx.type !== "buy" && tx.type !== "sell") return;
        const current = positions.get(tx.assetId) ?? {
            amount: 0,
            costBasisVisual: 0,
        };
        if (tx.type === "buy") {
            const cost = tx.price.value * tx.quantity;
            const costVisual = toVisualValueUsingTxFx(
                cost,
                tx.price.currency,
                visualCurrency,
                forexRates,
                tx.fxPair,
                tx.fxRate
            );
            const feesVisual = tx.fees
                ? toVisualValueUsingTxFx(
                      tx.fees.value,
                      tx.fees.currency,
                      visualCurrency,
                      forexRates,
                      tx.fxPair,
                      tx.fxRate
                  )
                : 0;
            positions.set(tx.assetId, {
                amount: current.amount + tx.quantity,
                costBasisVisual: current.costBasisVisual + costVisual + feesVisual,
            });
            return;
        }

        if (current.amount <= 0) {
            positions.set(tx.assetId, { amount: 0, costBasisVisual: 0 });
            return;
        }

        const quantity = Math.min(tx.quantity, current.amount);
        const avgCostVisual = current.costBasisVisual / current.amount;
        const costBasisSold = avgCostVisual * quantity;
        const remainingAmount = current.amount - quantity;
        const remainingCostBasis = Math.max(
            current.costBasisVisual - costBasisSold,
            0
        );
        positions.set(tx.assetId, {
            amount: remainingAmount,
            costBasisVisual: remainingCostBasis,
        });
    });

    return positions;
};

export const calculateRealizedPnl = (
    transactions: WalletTx[],
    visualCurrency: string,
    forexRates: Record<string, number>,
    getForexRate?: ForexRateGetter
) => {
    const positions = new Map<string, { amount: number; avgCost: Money }>();
    const sorted = [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    });

    const positionsVisual = new Map<
        string,
        { amount: number; costBasisVisual: number }
    >();

    return sorted.reduce((total, tx) => {
        switch (tx.type) {
            case "buy": {
                const current =
                    positions.get(tx.assetId) ?? {
                        amount: 0,
                        avgCost: { value: 0, currency: tx.price.currency },
                    };
                const nextAvgCost = calculateWeightedAverage(
                    current.amount,
                    current.avgCost,
                    tx.quantity,
                    tx.price
                );
                positions.set(tx.assetId, {
                    amount: current.amount + tx.quantity,
                    avgCost: nextAvgCost,
                });
                const currentVisual = positionsVisual.get(tx.assetId) ?? {
                    amount: 0,
                    costBasisVisual: 0,
                };
                const costVisual = toVisualValue(
                    tx.price.value * tx.quantity,
                    tx.price.currency,
                    visualCurrency,
                    forexRates,
                    tx.date,
                    getForexRate
                );
                const feesVisual = tx.fees
                    ? toVisualValue(
                          tx.fees.value,
                          tx.fees.currency,
                          visualCurrency,
                          forexRates,
                          tx.date,
                          getForexRate
                      )
                    : 0;
                positionsVisual.set(tx.assetId, {
                    amount: currentVisual.amount + tx.quantity,
                    costBasisVisual:
                        currentVisual.costBasisVisual + costVisual + feesVisual,
                });
                return total;
            }
            case "sell": {
                const current =
                    positions.get(tx.assetId) ?? {
                        amount: 0,
                        avgCost: { value: 0, currency: tx.price.currency },
                    };
                const currentVisual = positionsVisual.get(tx.assetId) ?? {
                    amount: 0,
                    costBasisVisual: 0,
                };
                const quantity = Math.min(tx.quantity, current.amount);
                const avgCostVisual =
                    currentVisual.amount > 0
                        ? currentVisual.costBasisVisual / currentVisual.amount
                        : 0;
                const proceedsVisual = toVisualValue(
                    tx.price.value * quantity,
                    tx.price.currency,
                    visualCurrency,
                    forexRates,
                    tx.date,
                    getForexRate
                );
                const fees = tx.fees
                    ? toVisualValue(
                          tx.fees.value,
                          tx.fees.currency,
                          visualCurrency,
                          forexRates,
                          tx.date,
                          getForexRate
                      )
                    : 0;
                const realized = proceedsVisual - avgCostVisual * quantity;
                const nextAmount = Math.max(current.amount - tx.quantity, 0);
                positions.set(tx.assetId, {
                    amount: nextAmount,
                    avgCost:
                        nextAmount === 0
                            ? { value: 0, currency: current.avgCost.currency }
                            : current.avgCost,
                });
                const remainingAmount = Math.max(
                    currentVisual.amount - quantity,
                    0
                );
                const remainingCostBasis = Math.max(
                    currentVisual.costBasisVisual - avgCostVisual * quantity,
                    0
                );
                positionsVisual.set(tx.assetId, {
                    amount: remainingAmount,
                    costBasisVisual: remainingCostBasis,
                });
                return total + realized - fees;
            }
            case "dividend": {
                return (
                    total +
                    toVisualValue(
                        tx.amount.value,
                        tx.amount.currency,
                        visualCurrency,
                        forexRates,
                        tx.date,
                        getForexRate
                    )
                );
            }
            default:
                return total;
        }
    }, 0);
};
