import { BuyWalletTx, Money, SellWalletTx, WalletTx } from "../schema-types";

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
    const lotsByAsset = new Map<
        string,
        Array<{ quantity: number; costBasisVisual: number }>
    >();
    const sorted = [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    });

    sorted.forEach((tx) => {
        if (tx.type !== "buy" && tx.type !== "sell") return;
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
            const lots = lotsByAsset.get(tx.assetId) ?? [];
            lots.push({
                quantity: tx.quantity,
                costBasisVisual: costVisual + feesVisual,
            });
            lotsByAsset.set(tx.assetId, lots);
            return;
        }

        const lots = lotsByAsset.get(tx.assetId) ?? [];
        let remainingQuantity = tx.quantity;
        while (remainingQuantity > 0 && lots.length > 0) {
            const lot = lots[0];
            const quantityToConsume = Math.min(remainingQuantity, lot.quantity);
            const costPerUnit = lot.costBasisVisual / lot.quantity;
            lot.quantity -= quantityToConsume;
            lot.costBasisVisual -= costPerUnit * quantityToConsume;
            remainingQuantity -= quantityToConsume;
            if (lot.quantity <= 0) {
                lots.shift();
            }
        }
        lotsByAsset.set(tx.assetId, lots);
    });

    const positions = new Map<
        string,
        { amount: number; costBasisVisual: number }
    >();
    lotsByAsset.forEach((lots, assetId) => {
        const totals = lots.reduce(
            (sum, lot) => ({
                amount: sum.amount + lot.quantity,
                costBasisVisual: sum.costBasisVisual + lot.costBasisVisual,
            }),
            { amount: 0, costBasisVisual: 0 }
        );
        positions.set(assetId, totals);
    });

    return positions;
};

export const calculatePositionCostBasisFx = (
    transactions: WalletTx[],
    visualCurrency: string,
    forexRates: Record<string, number>,
    getForexRate?: ForexRateGetter
) => {
    const lotsByAsset = new Map<
        string,
        {
            lots: Array<{
                quantity: number;
                costBasisQuote: number;
                costBasisBase: number;
            }>;
            hasMissingFx: boolean;
        }
    >();
    const sorted = [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    sorted.forEach((tx) => {
        if (tx.type !== "buy" && tx.type !== "sell") return;
        const current = lotsByAsset.get(tx.assetId) ?? {
            lots: [],
            hasMissingFx: false,
        };
        if (tx.type === "buy") {
            const costQuote = tx.price.value * tx.quantity;
            const rate = resolveForexRate(
                tx.price.currency,
                visualCurrency,
                forexRates,
                tx.date,
                getForexRate
            );
            const hasMissingFx =
                current.hasMissingFx ||
                (rate === null && tx.price.currency !== visualCurrency);
            current.lots.push({
                quantity: tx.quantity,
                costBasisQuote: costQuote,
                costBasisBase: rate === null ? 0 : costQuote * rate,
            });
            lotsByAsset.set(tx.assetId, {
                lots: current.lots,
                hasMissingFx,
            });
            return;
        }

        let remainingQuantity = tx.quantity;
        while (remainingQuantity > 0 && current.lots.length > 0) {
            const lot = current.lots[0];
            const quantityToConsume = Math.min(remainingQuantity, lot.quantity);
            const costPerUnitQuote = lot.costBasisQuote / lot.quantity;
            const costPerUnitBase = lot.costBasisBase / lot.quantity;
            lot.quantity -= quantityToConsume;
            lot.costBasisQuote -= costPerUnitQuote * quantityToConsume;
            lot.costBasisBase -= costPerUnitBase * quantityToConsume;
            remainingQuantity -= quantityToConsume;
            if (lot.quantity <= 0) {
                current.lots.shift();
            }
        }
        lotsByAsset.set(tx.assetId, current);
    });

    const positions = new Map<
        string,
        {
            amount: number;
            costBasisQuote: number;
            costBasisBase: number;
            hasMissingFx: boolean;
        }
    >();
    lotsByAsset.forEach((entry, assetId) => {
        const totals = entry.lots.reduce(
            (sum, lot) => ({
                amount: sum.amount + lot.quantity,
                costBasisQuote: sum.costBasisQuote + lot.costBasisQuote,
                costBasisBase: sum.costBasisBase + lot.costBasisBase,
            }),
            { amount: 0, costBasisQuote: 0, costBasisBase: 0 }
        );
        positions.set(assetId, {
            ...totals,
            hasMissingFx: entry.hasMissingFx,
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
    const toVisualValueForTx = (
        tx: BuyWalletTx | SellWalletTx,
        amount: number
    ) =>
        tx.fxPair && tx.fxRate
            ? toVisualValueUsingTxFx(
                  amount,
                  tx.price.currency,
                  visualCurrency,
                  forexRates,
                  tx.fxPair,
                  tx.fxRate
              )
            : toVisualValue(
                  amount,
                  tx.price.currency,
                  visualCurrency,
                  forexRates,
                  tx.date,
                  getForexRate
              );
    const lotsByAsset = new Map<
        string,
        Array<{ quantity: number; costBasisVisual: number }>
    >();
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
                const costVisual = toVisualValueForTx(
                    tx,
                    tx.price.value * tx.quantity
                );
                const lots = lotsByAsset.get(tx.assetId) ?? [];
                lots.push({
                    quantity: tx.quantity,
                    costBasisVisual: costVisual,
                });
                lotsByAsset.set(tx.assetId, lots);
                return total;
            }
            case "sell": {
                const lots = lotsByAsset.get(tx.assetId) ?? [];
                const availableQuantity = lots.reduce(
                    (sum, lot) => sum + lot.quantity,
                    0
                );
                const quantity = Math.min(tx.quantity, availableQuantity);
                const proceedsVisual = toVisualValueForTx(
                    tx,
                    tx.price.value * quantity
                );
                let remainingQuantity = quantity;
                let costBasisConsumed = 0;
                while (remainingQuantity > 0 && lots.length > 0) {
                    const lot = lots[0];
                    const quantityToConsume = Math.min(
                        remainingQuantity,
                        lot.quantity
                    );
                    const costPerUnit = lot.costBasisVisual / lot.quantity;
                    costBasisConsumed += costPerUnit * quantityToConsume;
                    lot.quantity -= quantityToConsume;
                    lot.costBasisVisual -= costPerUnit * quantityToConsume;
                    remainingQuantity -= quantityToConsume;
                    if (lot.quantity <= 0) {
                        lots.shift();
                    }
                }
                lotsByAsset.set(tx.assetId, lots);
                const realized = proceedsVisual - costBasisConsumed;
                return total + realized;
            }
            default:
                return total;
        }
    }, 0);
};
