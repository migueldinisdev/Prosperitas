import type { Currency, Money, PersistedState, WalletTx, WalletTxState } from "../schema-types";
import { bookCash, bookPositions, quantitySum, replayLedger } from "./walletLedger";

export type WalletLedgerState = Pick<PersistedState, "walletTx" | "wallets" | "walletPositions" | "assets" | "pies">;

/** Build an entire consistent snapshot before publishing a single Redux action. */
export const deriveWalletState = (state: WalletLedgerState, transactions: WalletTxState) => {
    for (const [id, tx] of Object.entries(transactions)) {
        if (id !== tx.id) return { violation: { tx, message: "The transaction key must match its original ID." } };
    }
    const previous = replayLedger(Object.values(state.walletTx));
    for (const [walletId, positions] of Object.entries(state.walletPositions)) {
        for (const [assetId, position] of Object.entries(positions)) {
            const recorded = (previous.lots[walletId]?.[assetId] ?? []).reduce((n, lot) => quantitySum(n, lot.quantity), 0);
            if (position.amount > recorded + position.amount * 1e-12) {
                const tx = Object.values(transactions)[0] ?? Object.values(state.walletTx)[0];
                if (!tx) return { value: state };
                return { violation: { tx, message: `Incomplete purchase history for ${state.assets[assetId]?.ticker ?? assetId} in ${state.wallets[walletId]?.name ?? walletId}. Restore the missing purchases before changing the ledger.` } };
            }
        }
    }
    const book = replayLedger(Object.values(transactions), true, previous);
    if (book.violation) {
        const violation = { ...book.violation };
        Object.entries(state.assets).forEach(([id, asset]) => {
            violation.message = violation.message.replace(`Insufficient ${id} units`, `Insufficient ${asset.ticker} units`);
        });
        return { violation };
    }
    for (const tx of Object.values(transactions)) {
        if (!state.wallets[tx.walletId] || ("assetId" in tx && tx.assetId && !state.assets[tx.assetId]) ||
            (tx.type === "transfer" && (!state.wallets[tx.counterpartWalletId] ||
                (tx.fee?.kind === "asset" && !state.assets[tx.fee.assetId])))) {
            return { violation: { tx, message: "A referenced wallet or asset no longer exists." } };
        }
    }
    const walletPositions = bookPositions(book);
    const inheritedCashGaps = new Map<string, Set<string>>();
    let cashViolation: { tx: WalletTx; message: string } | undefined;
    Object.entries(previous.cashCheckpoints).forEach(([txId, currencies]) => {
        const walletId = previous.transactions[txId].walletId;
        Object.entries(currencies).forEach(([currency, balances]) => {
            if (!balances.some((balance) => balance < 0)) return;
            if (!inheritedCashGaps.has(walletId)) inheritedCashGaps.set(walletId, new Set());
            inheritedCashGaps.get(walletId)!.add(currency);
        });
    });
    const deriveCash = (id: string): Money[] => {
        const cash = bookCash(book, id);
        const gaps = inheritedCashGaps.get(id);
        if (!gaps) return cash;
        const saved = state.wallets[id].cash;
        const savedCash = Array.isArray(saved) ? saved : Object.entries(saved ?? {})
            .map(([currency, value]) => ({ currency: currency as Currency, value: Number(value) }));
        // Preserve saved cash when historical funding is incomplete. Apply only
        // this mutation's cash delta; never fabricate a deposit or rewrite cash
        // merely because existing assets moved to another wallet.
        gaps.forEach((currency) => {
            const existing = savedCash.find((money) => money.currency === currency);
            const before = previous.cash[id]?.[currency] ?? 0;
            const after = book.cash[id]?.[currency] ?? 0;
            const delta = quantitySum(after, -before);
            const index = cash.findIndex((money) => money.currency === currency);
            if (delta === 0 && !existing) {
                if (index >= 0) cash.splice(index, 1);
                return;
            }
            const money = { currency: currency as Currency, value: quantitySum(existing?.value ?? 0, delta) };
            if (delta < 0 && money.value < Math.min(0, existing?.value ?? 0)) {
                const changed = Object.values(transactions).find((tx) => tx.walletId === id && state.walletTx[tx.id] !== tx) ??
                    Object.values(state.walletTx).find((tx) => tx.walletId === id && !transactions[tx.id]);
                if (changed) cashViolation ??= { tx: changed, message: `Insufficient cash (${currency}).` };
            }
            if (index >= 0) cash[index] = money;
            else cash.push(money);
        });
        return cash;
    };
    const wallets = Object.fromEntries(Object.entries(state.wallets).map(([id, wallet]) => [id, {
        ...wallet, cash: deriveCash(id),
        txIds: Object.values(transactions).filter((tx) => tx.walletId === id).map((tx) => tx.id),
    }]));
    if (cashViolation) return { violation: cashViolation };
    const assets = Object.fromEntries(Object.entries(state.assets).map(([id, asset]) => {
        const positions = Object.values(walletPositions).map((positions) => positions[id]).filter(Boolean);
        const amount = positions.reduce((n, p) => quantitySum(n, p.amount), 0);
        const totalCost = positions.reduce((n, p) => n + p.amount * p.avgCost.value, 0);
        // An asset with no ledger history may come from an older/incomplete file.
        // Preserve it until an operation actually touches its history.
        const touched = Object.values(transactions).some((tx) => "assetId" in tx && tx.assetId === id ||
            tx.type === "transfer" && tx.fee?.kind === "asset" && tx.fee.assetId === id) ||
            Object.values(state.walletTx).some((tx) => "assetId" in tx && tx.assetId === id);
        return [id, !touched ? asset : {
            ...asset, amount,
            avgCost: { value: amount > 0 ? totalCost / amount : 0, currency: positions[0]?.avgCost.currency ?? asset.tradingCurrency },
            txIds: Object.values(transactions).filter((tx) => "assetId" in tx && tx.assetId === id ||
                tx.type === "transfer" && tx.fee?.kind === "asset" && tx.fee.assetId === id).map((tx) => tx.id),
        }];
    }));
    // Pie membership describes the asset, not its current wallet. Never remove
    // membership while moving the last units out of one particular wallet.
    return { value: { walletTx: book.transactions, wallets, walletPositions, assets, pies: state.pies } satisfies WalletLedgerState };
};
