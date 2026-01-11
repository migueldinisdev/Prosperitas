export const getPositionCurrentValue = (units: number, currentPrice: number) =>
    units * currentPrice;

export const getPositionInvestedValue = (
    units: number,
    costAverage: number
) => units * costAverage;

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
