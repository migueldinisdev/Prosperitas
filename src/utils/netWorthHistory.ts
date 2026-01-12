import { WalletTx } from "../core/schema-types";

interface NetWorthHistoryPoint {
    name: string;
    value: number;
    date: string;
}

interface NetWorthHistoryOptions {
    transactions: WalletTx[];
    forexRates: Record<string, number>;
    baseCurrency: string;
    locale?: string;
    assetFilter?: Set<string>;
    includeCash?: boolean;
    includeDeposits?: boolean;
    includeWithdrawals?: boolean;
    includeDividends?: boolean;
    includeForex?: boolean;
}

const formatHistoryDate = (date: string, locale?: string) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return parsed.toLocaleDateString(locale ?? undefined, {
        month: "short",
        day: "numeric",
    });
};

const sortTransactions = (transactions: WalletTx[]) =>
    [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
    });

const toBaseValue = (
    amount: number,
    currency: string,
    baseCurrency: string,
    forexRates: Record<string, number>
) => {
    if (currency === baseCurrency) {
        return amount;
    }
    const rate = forexRates[currency];
    if (!rate) {
        return amount;
    }
    return amount * rate;
};

export const getWalletTxCurrencies = (transactions: WalletTx[]) => {
    const currencies = new Set<string>();
    transactions.forEach((tx) => {
        switch (tx.type) {
            case "deposit":
            case "withdraw":
            case "dividend":
                currencies.add(tx.amount.currency);
                break;
            case "forex":
                currencies.add(tx.from.currency);
                currencies.add(tx.to.currency);
                if (tx.fees) currencies.add(tx.fees.currency);
                break;
            case "buy":
            case "sell":
                currencies.add(tx.price.currency);
                if (tx.fees) currencies.add(tx.fees.currency);
                break;
        }
    });
    return Array.from(currencies);
};

export const buildNetWorthHistory = ({
    transactions,
    forexRates,
    baseCurrency,
    locale,
    assetFilter,
    includeCash = true,
    includeDeposits = true,
    includeWithdrawals = true,
    includeDividends = true,
    includeForex = true,
}: NetWorthHistoryOptions): NetWorthHistoryPoint[] => {
    if (!transactions.length) {
        return [];
    }

    const cashByCurrency = new Map<string, number>();
    const holdings = new Map<
        string,
        { quantity: number; price: number; currency: string }
    >();
    const seriesByDate = new Map<string, number>();

    const addCash = (currency: string, delta: number) => {
        const current = cashByCurrency.get(currency) ?? 0;
        cashByCurrency.set(currency, current + delta);
    };

    const sortedTransactions = sortTransactions(transactions);

    sortedTransactions.forEach((tx) => {
        switch (tx.type) {
            case "deposit":
                if (includeCash && includeDeposits) {
                    addCash(tx.amount.currency, tx.amount.value);
                }
                break;
            case "withdraw":
                if (includeCash && includeWithdrawals) {
                    addCash(tx.amount.currency, -tx.amount.value);
                }
                break;
            case "forex":
                if (includeCash && includeForex) {
                    addCash(tx.from.currency, -tx.from.value);
                    addCash(tx.to.currency, tx.to.value);
                    if (tx.fees) {
                        addCash(tx.fees.currency, -tx.fees.value);
                    }
                }
                break;
            case "buy": {
                if (assetFilter && !assetFilter.has(tx.assetId)) break;
                const holding = holdings.get(tx.assetId) ?? {
                    quantity: 0,
                    price: tx.price.value,
                    currency: tx.price.currency,
                };
                holdings.set(tx.assetId, {
                    quantity: holding.quantity + tx.quantity,
                    price: tx.price.value,
                    currency: tx.price.currency,
                });
                if (includeCash) {
                    addCash(
                        tx.price.currency,
                        -tx.price.value * tx.quantity
                    );
                    if (tx.fees) {
                        addCash(tx.fees.currency, -tx.fees.value);
                    }
                }
                break;
            }
            case "sell": {
                if (assetFilter && !assetFilter.has(tx.assetId)) break;
                const holding = holdings.get(tx.assetId) ?? {
                    quantity: 0,
                    price: tx.price.value,
                    currency: tx.price.currency,
                };
                const nextQuantity = holding.quantity - tx.quantity;
                if (nextQuantity <= 0) {
                    holdings.delete(tx.assetId);
                } else {
                    holdings.set(tx.assetId, {
                        quantity: nextQuantity,
                        price: tx.price.value,
                        currency: tx.price.currency,
                    });
                }
                if (includeCash) {
                    addCash(
                        tx.price.currency,
                        tx.price.value * tx.quantity
                    );
                    if (tx.fees) {
                        addCash(tx.fees.currency, -tx.fees.value);
                    }
                }
                break;
            }
            case "dividend":
                if (includeCash && includeDividends) {
                    if (assetFilter && tx.assetId && !assetFilter.has(tx.assetId)) {
                        break;
                    }
                    addCash(tx.amount.currency, tx.amount.value);
                }
                break;
        }

        const holdingsValue = Array.from(holdings.values()).reduce(
            (total, holding) =>
                total +
                toBaseValue(
                    holding.quantity * holding.price,
                    holding.currency,
                    baseCurrency,
                    forexRates
                ),
            0
        );

        const cashValue = includeCash
            ? Array.from(cashByCurrency.entries()).reduce(
                  (total, [currency, value]) =>
                      total +
                      toBaseValue(value, currency, baseCurrency, forexRates),
                  0
              )
            : 0;

        seriesByDate.set(tx.date, holdingsValue + cashValue);
    });

    return Array.from(seriesByDate.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, value]) => ({
            date,
            name: formatHistoryDate(date, locale),
            value: Number(value.toFixed(2)),
        }));
};
