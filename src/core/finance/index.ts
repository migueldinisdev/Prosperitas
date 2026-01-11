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

const toVisualValue = (
    amount: number,
    currency: string,
    visualCurrency: string,
    forexRates: Record<string, number>
) => {
    if (currency === visualCurrency) {
        return amount;
    }
    const rate = forexRates[currency];
    if (!rate) return amount;
    return getConvertedValue(amount, rate);
};

export const calculateRealizedPnl = (
    transactions: WalletTx[],
    visualCurrency: string,
    forexRates: Record<string, number>
) => {
    const positions = new Map<string, { amount: number; avgCost: Money }>();
    const sorted = [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    });

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
                return total;
            }
            case "sell": {
                const current =
                    positions.get(tx.assetId) ?? {
                        amount: 0,
                        avgCost: { value: 0, currency: tx.price.currency },
                    };
                const basePnl =
                    (tx.price.value - current.avgCost.value) * tx.quantity;
                const fees = tx.fees
                    ? toVisualValue(
                          tx.fees.value,
                          tx.fees.currency,
                          visualCurrency,
                          forexRates
                      )
                    : 0;
                const realized = toVisualValue(
                    basePnl,
                    tx.price.currency,
                    visualCurrency,
                    forexRates
                );
                const nextAmount = Math.max(current.amount - tx.quantity, 0);
                positions.set(tx.assetId, {
                    amount: nextAmount,
                    avgCost:
                        nextAmount === 0
                            ? { value: 0, currency: current.avgCost.currency }
                            : current.avgCost,
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
                        forexRates
                    )
                );
            }
            default:
                return total;
        }
    }, 0);
};
