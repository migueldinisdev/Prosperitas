import type {
    Currency, Money, TransferWalletTx, WalletLot,
    WalletPosition, WalletTx,
} from "../schema-types";
import { decimalProduct, decimalSum } from "./decimal";

// Quantity arithmetic must retain crypto precision, while removing binary dust.
export const quantitySum = decimalSum;
export const nextLedgerSequence = (transactions: Record<string, WalletTx>) =>
    Object.values(transactions).reduce((max, tx) => Math.max(max, tx.sequence ?? 0), 0) + 1;
export const sortLedgerTransactions = (transactions: WalletTx[]) => [...transactions].sort((a, b) => {
    const date = Date.parse(a.date) - Date.parse(b.date);
    if (date) return date;
    const created = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (created) return created;
    const sequence = (a.sequence ?? 0) - (b.sequence ?? 0);
    if (sequence) return sequence;
    // Compare whole events before legs, ensuring a transitive ordering. Comparing
    // leg IDs first could interleave a third transaction between out and in.
    const event = (a.type === "transfer" ? a.transferId : a.id)
        .localeCompare(b.type === "transfer" ? b.transferId : b.id);
    if (event) return event;
    if (a.type === "transfer" && b.type === "transfer" && a.transferId === b.transferId) {
        return a.direction === b.direction ? 0 : a.direction === "out" ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
});
export const compareLots = (a: WalletLot, b: WalletLot) =>
    Date.parse(a.acquiredAt) - Date.parse(b.acquiredAt) ||
    Date.parse(a.sourceCreatedAt) - Date.parse(b.sourceCreatedAt) ||
    (a.sourceSequence ?? 0) - (b.sourceSequence ?? 0) || a.sourceTxId.localeCompare(b.sourceTxId) ||
    a.transferIds.join("/").localeCompare(b.transferIds.join("/"));

export interface LedgerBook {
    lots: Record<string, Record<string, WalletLot[]>>;
    cash: Record<string, Record<string, number>>;
    consumed: Record<string, WalletLot[]>;
    transactions: Record<string, WalletTx>;
    violation?: { tx: WalletTx; message: string };
}
const validMoney = (money: Money) => money && Number.isFinite(money.value) &&
    ["EUR", "USD", "GBP"].includes(money.currency);

export const validateLedgerInput = (tx: WalletTx): string | null => {
    if (!["deposit", "withdraw", "forex", "buy", "sell", "dividend", "transfer"].includes(tx.type)) return "Unsupported transaction type.";
    const date = typeof tx.date === "string" ? tx.date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date) return "A valid calendar date is required.";
    if (!tx.walletId || !tx.id || !tx.date || !Number.isFinite(Date.parse(tx.date)) ||
        !Number.isFinite(Date.parse(tx.createdAt))) return "A valid wallet, date and creation time are required.";
    if (tx.sequence !== undefined && (!Number.isSafeInteger(tx.sequence) || tx.sequence < 0)) return "Invalid transaction sequence.";
    if ((tx.type === "buy" || tx.type === "sell" || tx.type === "forex") && tx.fxRate !== undefined &&
        (!Number.isFinite(tx.fxRate) || tx.fxRate <= 0)) return "FX rate must be finite and greater than 0.";
    if ((tx.type === "buy" || tx.type === "sell") && tx.fxPair !== undefined &&
        (typeof tx.fxPair !== "string" || !/^(EUR|USD|GBP)\/(EUR|USD|GBP)$/.test(tx.fxPair.trim().toUpperCase()))) return "Invalid FX currency pair.";
    if (tx.type === "buy" || tx.type === "sell" || tx.type === "transfer") {
        if (!tx.assetId || !Number.isFinite(tx.quantity) || tx.quantity <= 0) return "Quantity must be finite and greater than 0.";
        if (tx.type === "transfer") {
            if (!tx.transferId || !tx.counterpartWalletId || tx.counterpartWalletId === tx.walletId ||
                !["in", "out"].includes(tx.direction)) return "Choose two different wallets.";
            if (tx.fee) {
                if (tx.direction !== "out") return "Transfer fees belong to the source wallet.";
                if (tx.fee.kind === "cash") {
                    if (!validMoney(tx.fee.amount) || tx.fee.amount.value < 0) return "Invalid cash fee.";
                } else if (tx.fee.kind !== "asset" || !tx.fee.assetId || !Number.isFinite(tx.fee.quantity) || tx.fee.quantity < 0) return "Invalid asset fee.";
            }
        } else {
            if (!validMoney(tx.price) || tx.price.value < 0) return "Price must be zero or greater.";
            if (!Number.isFinite(tx.price.value * tx.quantity)) return "Trade consideration is too large.";
            if (tx.fees && (!validMoney(tx.fees) || tx.fees.value < 0)) return "Invalid fees.";
        }
    } else if (tx.type === "forex") {
        if (!validMoney(tx.from) || tx.from.value <= 0 || !validMoney(tx.to) || tx.to.value <= 0) return "FX amounts must be greater than 0.";
        if (tx.fees && (!validMoney(tx.fees) || tx.fees.value < 0)) return "Invalid FX fees.";
    } else if (!validMoney(tx.amount) || (tx.type === "dividend" ? tx.amount.value < 0 : tx.amount.value <= 0)) {
        return "Amount must be greater than 0.";
    }
    return null;
};

/**
 * A single FIFO book for balances, holdings and statistics. Strict replay is used
 * before committing any mutation. Partial analytical replays can use the saved
 * incoming allocations when the source wallet is outside the selected view.
 */
export const replayLedger = (transactions: WalletTx[], strict = false): LedgerBook => {
    const book: LedgerBook = { lots: {}, cash: {}, consumed: {}, transactions: {} };
    const resolved = new Map<string, WalletLot[]>();
    const transfers = new Map<string, TransferWalletTx[]>();
    for (const tx of transactions) {
        if (strict && Object.hasOwn(book.transactions, tx.id)) {
            book.violation = { tx, message: "Transaction IDs must be unique." };
            return book;
        }
        book.transactions[tx.id] = tx;
        if (tx.type === "transfer") transfers.set(tx.transferId, [...(transfers.get(tx.transferId) ?? []), tx]);
    }
    const fail = (tx: WalletTx, message: string) => {
        if (strict && !book.violation) book.violation = { tx, message };
    };
    if (strict) for (const tx of transactions) {
        const error = validateLedgerInput(tx);
        if (error) { fail(tx, error); return book; }
        if (tx.type !== "transfer") continue;
        const pair = transfers.get(tx.transferId)!;
        const other = pair.find((leg) => leg.direction !== tx.direction);
        if (pair.length !== 2 || !other || other.assetId !== tx.assetId || other.quantity !== tx.quantity ||
            other.walletId !== tx.counterpartWalletId || other.counterpartWalletId !== tx.walletId ||
            other.date !== tx.date || other.createdAt !== tx.createdAt || other.sequence !== tx.sequence) {
            fail(tx, "The two transfer entries must match."); return book;
        }
    }
    const walletLots = (walletId: string, assetId: string) => {
        book.lots[walletId] ??= {};
        return book.lots[walletId][assetId] ??= [];
    };
    const cashDelta = (tx: WalletTx, money: Money, sign: number) => {
        const cash = book.cash[tx.walletId] ??= {};
        cash[money.currency] = decimalSum(cash[money.currency] ?? 0, sign * money.value);
        if (!Number.isFinite(cash[money.currency])) fail(tx, "Cash balance is too large.");
        if (cash[money.currency] < 0) fail(tx, `Insufficient cash (${money.currency}).`);
    };
    const take = (tx: WalletTx, assetId: string, quantity: number): WalletLot[] => {
        const lots = walletLots(tx.walletId, assetId);
        lots.sort(compareLots);
        const selected: WalletLot[] = [];
        let remaining = quantity;
        while (remaining > 0 && lots.length) {
            const lot = lots[0];
            const used = Math.min(remaining, lot.quantity);
            selected.push({ ...lot, quantity: used, transferIds: [...lot.transferIds] });
            lot.quantity = quantitySum(lot.quantity, -used);
            remaining = quantitySum(remaining, -used);
            if (lot.quantity <= 0) lots.shift();
        }
        if (remaining > 0) fail(tx, `Insufficient ${assetId} units in the source wallet.`);
        return selected;
    };
    for (const tx of sortLedgerTransactions(transactions)) {
        switch (tx.type) {
            case "deposit": case "dividend": cashDelta(tx, tx.amount, 1); break;
            case "withdraw": cashDelta(tx, tx.amount, -1); break;
            case "forex":
                cashDelta(tx, tx.from, -1); cashDelta(tx, tx.to, 1);
                if (tx.fees) cashDelta(tx, tx.fees, -1);
                break;
            case "buy":
                if (strict && Object.values(book.lots).some((assets) => assets[tx.assetId]?.some((lot) =>
                    lot.price.currency !== tx.price.currency))) {
                    fail(tx, "Open lots for one asset must use the same quote currency. Use a separate asset for a different quote currency.");
                    break;
                }
                cashDelta(tx, { ...tx.price, value: decimalProduct(tx.price.value, tx.quantity) }, -1);
                if (tx.fees) cashDelta(tx, tx.fees, -1);
                walletLots(tx.walletId, tx.assetId).push({
                    sourceTxId: tx.id, acquiredAt: tx.date, sourceCreatedAt: tx.createdAt, sourceSequence: tx.sequence,
                    quantity: tx.quantity, price: { ...tx.price },
                    feePerUnit: tx.fees ? { ...tx.fees, value: tx.fees.value / tx.quantity } : undefined,
                    fxPair: tx.fxPair, fxRate: tx.fxRate, transferIds: [],
                });
                break;
            case "sell":
                book.consumed[tx.id] = take(tx, tx.assetId, tx.quantity);
                cashDelta(tx, { ...tx.price, value: decimalProduct(tx.price.value, tx.quantity) }, 1);
                if (tx.fees) cashDelta(tx, tx.fees, -1);
                break;
            case "transfer": {
                if (tx.direction === "out") {
                    const lots = take(tx, tx.assetId, tx.quantity);
                    resolved.set(tx.transferId, lots);
                    let feeLots: WalletLot[] | undefined;
                    if (tx.fee?.kind === "asset") feeLots = take(tx, tx.fee.assetId, tx.fee.quantity);
                    if (tx.fee?.kind === "cash") cashDelta(tx, tx.fee.amount, -1);
                    book.transactions[tx.id] = { ...tx, lots, feeLots };
                } else {
                    if (strict && !resolved.has(tx.transferId)) {
                        fail(tx, "A transfer must leave the source before arriving at the destination.");
                        break;
                    }
                    const lots = resolved.get(tx.transferId) ?? (strict ? [] : cachedTransferLots(tx));
                    walletLots(tx.walletId, tx.assetId).push(...lots.map((lot) => ({
                        ...lot, transferIds: [...lot.transferIds, tx.transferId],
                    })));
                    book.transactions[tx.id] = { ...tx, lots };
                }
                break;
            }
        }
        if (book.violation) return book;
    }
    return book;
};

/** Only validated snapshots are usable when a source is outside an analytical view. */
const cachedTransferLots = (tx: TransferWalletTx): WalletLot[] => {
    if (!Array.isArray(tx.lots)) return [];
    return tx.lots.filter((lot) => lot && typeof lot.sourceTxId === "string" &&
        Number.isFinite(Date.parse(lot.acquiredAt)) && Number.isFinite(Date.parse(lot.sourceCreatedAt)) &&
        Number.isFinite(lot.quantity) && lot.quantity > 0 && validMoney(lot.price) && lot.price.value >= 0 &&
        (!lot.feePerUnit || validMoney(lot.feePerUnit) && lot.feePerUnit.value >= 0) &&
        (lot.fxPair === undefined || typeof lot.fxPair === "string") &&
        (lot.fxRate === undefined || Number.isFinite(lot.fxRate) && lot.fxRate > 0) &&
        Array.isArray(lot.transferIds) && lot.transferIds.every((id) => typeof id === "string"));
};

export const lotQuoteCost = (lot: WalletLot) => {
    let fee = lot.feePerUnit?.currency === lot.price.currency ? lot.feePerUnit.value : 0;
    if (lot.feePerUnit && lot.feePerUnit.currency !== lot.price.currency && lot.fxPair &&
        Number.isFinite(lot.fxRate) && lot.fxRate > 0) {
        const [from, to] = lot.fxPair.split("/").map((part) => part.trim().toUpperCase());
        if (from === lot.feePerUnit.currency && to === lot.price.currency) fee = lot.feePerUnit.value * lot.fxRate;
        if (to === lot.feePerUnit.currency && from === lot.price.currency) fee = lot.feePerUnit.value / lot.fxRate;
    }
    return lot.quantity * (lot.price.value + fee);
};

export const bookPositions = (book: LedgerBook): Record<string, Record<string, WalletPosition>> =>
    Object.fromEntries(Object.entries(book.lots).map(([walletId, byAsset]) => [walletId,
        Object.fromEntries(Object.entries(byAsset).filter(([, lots]) => lots.length).map(([assetId, lots]) => {
            const amount = lots.reduce((n, lot) => quantitySum(n, lot.quantity), 0);
            return [assetId, { amount, avgCost: {
                value: lots.reduce((n, lot) => n + lotQuoteCost(lot), 0) / amount,
                currency: lots[0].price.currency,
            } }];
        })),
    ]));

export const bookCash = (book: LedgerBook, walletId: string): Money[] =>
    Object.entries(book.cash[walletId] ?? {}).map(([currency, value]) => ({ currency: currency as Currency, value }));
