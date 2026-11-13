import { getLotCostValue } from "../core/finance";
import { decimalProduct } from "../core/finance/decimal";
import { quantitySum, sortLedgerTransactions } from "../core/finance/walletLedger";
import { Money, WalletTx } from "../core/schema-types";

export interface NetWorthHistoryPoint {
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
    includeHoldings?: boolean;
    includeDeposits?: boolean;
    includeWithdrawals?: boolean;
    includeDividends?: boolean;
    includeForex?: boolean;
    assetMetadata?: Record<string, { tradingCurrency?: string }>;
    getAssetPrice?: (assetId: string, date: string) => number | null;
    getForexRate?: (currency: string, date: string) => number | null;
    snapshotDates?: string[];
}

export const formatHistoryDate = (date: string, locale?: string) => {
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
    sortLedgerTransactions(transactions.filter((tx) => tx.date && Number.isFinite(Date.parse(tx.date))));

const toBaseValue = (
    amount: number,
    currency: string,
    baseCurrency: string,
    forexRates: Record<string, number>,
    date: string,
    getForexRate?: (currency: string, date: string) => number | null
) => {
    if (currency === baseCurrency) {
        return amount;
    }
    const rate = getForexRate ? getForexRate(currency, date) : null;
    const fallbackRate = forexRates[currency];
    const resolvedRate = rate ?? fallbackRate;
    if (!resolvedRate) {
        return amount;
    }
    return amount * resolvedRate;
};

export const getWalletTxCurrencies = (
    transactions: WalletTx[] | Record<string, WalletTx> | null | undefined
) => {
    const currencies = new Set<string>();
    const txList = Array.isArray(transactions)
        ? transactions
        : Object.values(transactions ?? {});
    txList.forEach((tx) => {
        switch (tx.type) {
            case "transfer":
                tx.lots.forEach((lot) => { currencies.add(lot.price.currency); if (lot.feePerUnit) currencies.add(lot.feePerUnit.currency); });
                if (tx.fee?.kind === "cash") currencies.add(tx.fee.amount.currency);
                break;
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
    includeHoldings = true,
    includeDeposits = true,
    includeWithdrawals = true,
    includeDividends = true,
    includeForex = true,
    assetMetadata,
    getAssetPrice,
    getForexRate,
    snapshotDates,
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
        cashByCurrency.set(currency, quantitySum(current, delta));
    };

    const sortedTransactions = sortTransactions(transactions);
    
    const applyTransaction = (tx: WalletTx) => {
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
            case "transfer": {
                const move = (assetId: string, delta: number, price: number, currency: string) => {
                    if (!includeHoldings || assetFilter && !assetFilter.has(assetId)) return;
                    const holding = holdings.get(assetId) ?? { quantity: 0, price, currency };
                    holdings.set(assetId, { ...holding, quantity: quantitySum(holding.quantity, delta) });
                };
                const price = tx.lots.reduce((sum, lot) => sum + lot.price.value * lot.quantity, 0) / tx.quantity;
                move(tx.assetId, tx.quantity * (tx.direction === "in" ? 1 : -1), price || 0,
                    assetMetadata?.[tx.assetId]?.tradingCurrency ?? tx.lots[0]?.price.currency ?? baseCurrency);
                if (tx.direction === "out" && tx.fee) {
                    if (tx.fee.kind === "cash" && includeCash) addCash(tx.fee.amount.currency, -tx.fee.amount.value);
                    if (tx.fee.kind === "asset") move(tx.fee.assetId, -tx.fee.quantity,
                        tx.feeLots?.[0]?.price.value ?? 0,
                        assetMetadata?.[tx.fee.assetId]?.tradingCurrency ?? tx.feeLots?.[0]?.price.currency ?? baseCurrency);
                }
                break;
            }
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
                if (includeHoldings) {
                    if (assetFilter && !assetFilter.has(tx.assetId)) break;
                    const tradingCurrency =
                        assetMetadata?.[tx.assetId]?.tradingCurrency ??
                        tx.price.currency;
                    const holding = holdings.get(tx.assetId) ?? {
                        quantity: 0,
                        price: tx.price.value,
                        currency: tradingCurrency,
                    };
                    holdings.set(tx.assetId, {
                        quantity: quantitySum(holding.quantity, tx.quantity),
                        price: tx.price.value,
                        currency: tradingCurrency,
                    });
                }
                if (includeCash) {
                    addCash(
                        tx.price.currency,
                        -decimalProduct(tx.price.value, tx.quantity)
                    );
                    if (tx.fees) {
                        addCash(tx.fees.currency, -tx.fees.value);
                    }
                }
                break;
            }
            case "sell": {
                if (includeHoldings) {
                    if (assetFilter && !assetFilter.has(tx.assetId)) break;
                    const tradingCurrency =
                        assetMetadata?.[tx.assetId]?.tradingCurrency ??
                        tx.price.currency;
                    const holding = holdings.get(tx.assetId) ?? {
                        quantity: 0,
                        price: tx.price.value,
                        currency: tradingCurrency,
                    };
                    const nextQuantity = quantitySum(holding.quantity, -tx.quantity);
                    if (nextQuantity <= 0) {
                        holdings.delete(tx.assetId);
                    } else {
                        holdings.set(tx.assetId, {
                            quantity: nextQuantity,
                            price: tx.price.value,
                            currency: tradingCurrency,
                        });
                    }
                }
                if (includeCash) {
                    addCash(
                        tx.price.currency,
                        decimalProduct(tx.price.value, tx.quantity)
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
    };

    const calculateSnapshotValue = (date: string) => {
        const holdingsValue = includeHoldings
            ? Array.from(holdings.entries()).reduce(
                  (total, [assetId, holding]) => {
                      const marketPrice =
                          getAssetPrice?.(assetId, date) ?? holding.price;
                      return (
                          total +
                          toBaseValue(
                              holding.quantity * marketPrice,
                              holding.currency,
                              baseCurrency,
                              forexRates,
                              date,
                              getForexRate
                          )
                      );
                  },
                  0
              )
            : 0;

        const cashValue = includeCash
            ? Array.from(cashByCurrency.entries()).reduce(
                  (total, [currency, value]) =>
                      total +
                      toBaseValue(
                          value,
                          currency,
                          baseCurrency,
                          forexRates,
                          date,
                          getForexRate
                      ),
                  0
              )
            : 0;

        return holdingsValue + cashValue;
    };

    if (snapshotDates && snapshotDates.length > 0) {
        const uniqueSnapshotDates = Array.from(new Set(snapshotDates)).sort(
            (a, b) => a.localeCompare(b)
        );
        
        let txIndex = 0;
        uniqueSnapshotDates.forEach((snapshotDate) => {
            while (
                txIndex < sortedTransactions.length &&
                sortedTransactions[txIndex].date <= snapshotDate
            ) {
                applyTransaction(sortedTransactions[txIndex]);
                txIndex += 1;
            }
            const snapshotValue = calculateSnapshotValue(snapshotDate);
            seriesByDate.set(snapshotDate, snapshotValue);
        });

        return Array.from(seriesByDate.entries())
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, value]) => ({
                date,
                name: formatHistoryDate(date, locale),
                value: Number(value.toFixed(2)),
            }));
    }

    sortedTransactions.forEach((tx) => {
        applyTransaction(tx);
        seriesByDate.set(tx.date, calculateSnapshotValue(tx.date));
    });

    return Array.from(seriesByDate.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, value]) => ({
            date,
            name: formatHistoryDate(date, locale),
            value: Number(value.toFixed(2)),
        }));
};

/** Transfer legs cancel when both wallets are selected; one leg is a flow for a single-wallet view. */
export const getWalletExternalFlow = (
    tx: WalletTx, baseCurrency: string, forexRates: Record<string, number> = {},
    getForexRate?: (currency: string, date: string) => number | null,
    transferValues?: Record<string, Money>,
) => {
    if (tx.type === "deposit" || tx.type === "withdraw") {
        return toBaseValue(tx.amount.value, tx.amount.currency, baseCurrency, forexRates, tx.date, getForexRate) * (tx.type === "deposit" ? 1 : -1);
    }
    if (tx.type !== "transfer") return 0;
    const market = transferValues?.[tx.id];
    const value = market
        ? toBaseValue(market.value, market.currency, baseCurrency, forexRates, tx.date, getForexRate)
        : tx.lots.reduce((sum, lot) => sum + getLotCostValue(lot, baseCurrency, forexRates, getForexRate), 0);
    return value * (tx.direction === "in" ? 1 : -1);
};

export const transactionTouchesAssets = (tx: WalletTx, assetIds: Set<string>) =>
    "assetId" in tx && !!tx.assetId && assetIds.has(tx.assetId) ||
    tx.type === "transfer" && tx.fee?.kind === "asset" && assetIds.has(tx.fee.assetId);
