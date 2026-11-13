import { nanoid } from "nanoid";
import type { TransferFee, TransferWalletTx, WalletTx } from "../../core/schema-types";
import type { AppThunk } from "../index";
import { deriveWalletState } from "../../core/finance/deriveWalletState";
import { nextLedgerSequence } from "../../core/finance/walletLedger";
import { applyWalletLedger } from "../actions";
import { removeWallet } from "../slices/walletsSlice";
import { removeWalletPositionsForWallet } from "../slices/walletPositionsSlice";
import { addNotification } from "../slices/notificationsSlice";

const commitTransactions = (transactions: Record<string, WalletTx>): AppThunk<boolean> => (dispatch, getState) => {
    const result = deriveWalletState(getState(), transactions);
    if (result.violation) {
        const { tx, message } = result.violation;
        dispatch(addNotification({ type: "error", title: "Transaction blocked",
            message: `${tx.type.toUpperCase()} (${tx.id} on ${tx.date}): ${message}` }));
        return false;
    }
    dispatch(applyWalletLedger(result.value));
    return true;
};

export const addWalletTransaction = (tx: WalletTx): AppThunk<boolean> => (dispatch, getState) => {
    if (getState().walletTx[tx.id]) {
        dispatch(addNotification({ type: "error", message: "This transaction already exists." }));
        return false;
    }
    const sequence = tx.sequence ?? nextLedgerSequence(getState().walletTx);
    return dispatch(commitTransactions({ ...getState().walletTx, [tx.id]: { ...tx, sequence } }));
};

export interface WalletTransferInput {
    walletId: string;
    counterpartWalletId: string;
    assetId: string;
    quantity: number;
    date: string;
    fee?: TransferFee;
    reference?: string;
}

export const saveWalletTransfer = (input: WalletTransferInput, transferId?: string): AppThunk<boolean> => (dispatch, getState) => {
    const state = getState();
    const previous = Object.values(state.walletTx).filter((tx): tx is TransferWalletTx =>
        tx.type === "transfer" && tx.transferId === transferId);
    if (transferId && previous.length !== 2) return false;
    const id = transferId ?? `transfer_${nanoid()}`;
    const createdAt = previous[0]?.createdAt ?? new Date().toISOString();
    const next = { ...state.walletTx };
    previous.forEach((tx) => delete next[tx.id]);
    const out: TransferWalletTx = {
        ...input, id: `${id}_out`, type: "transfer", direction: "out", transferId: id,
        createdAt, sequence: previous[0]?.sequence ?? nextLedgerSequence(state.walletTx), lots: [],
    };
    const incoming: TransferWalletTx = {
        ...out, id: `${id}_in`, direction: "in", walletId: input.counterpartWalletId,
        counterpartWalletId: input.walletId, fee: undefined, feeLots: undefined,
    };
    next[out.id] = out;
    next[incoming.id] = incoming;
    return dispatch(commitTransactions(next));
};

export const removeWalletTransaction = (txId: string): AppThunk<boolean> => (dispatch, getState) => {
    const state = getState();
    const existing = state.walletTx[txId];
    if (!existing) return false;
    const next = { ...state.walletTx };
    Object.values(next).forEach((tx) => {
        if (tx.id === txId || existing.type === "transfer" && tx.type === "transfer" && tx.transferId === existing.transferId) delete next[tx.id];
    });
    return dispatch(commitTransactions(next));
};

export const updateWalletTransaction = (tx: WalletTx): AppThunk<boolean> => (dispatch, getState) => {
    if (tx.type === "transfer") {
        const source = Object.values(getState().walletTx).find((entry): entry is TransferWalletTx =>
            entry.type === "transfer" && entry.transferId === tx.transferId && entry.direction === "out");
        if (!source) return false;
        const input = tx.direction === "out" ? tx : {
            ...source, walletId: tx.counterpartWalletId, counterpartWalletId: tx.walletId,
            quantity: tx.quantity, assetId: tx.assetId, date: tx.date, reference: tx.reference,
        };
        return dispatch(saveWalletTransfer(input, tx.transferId));
    }
    const previous = getState().walletTx[tx.id];
    return dispatch(commitTransactions({ ...getState().walletTx, [tx.id]: { ...tx, sequence: previous?.sequence ?? tx.sequence } }));
};

export const removeWalletIfEmpty = (walletId: string): AppThunk<boolean> => (dispatch, getState) => {
    const state = getState();
    if (!state.wallets[walletId]) return false;
    if (Object.values(state.walletTx).some((tx) => tx.walletId === walletId)) {
        dispatch(addNotification({ type: "warning", title: "Wallet not deleted",
            message: "Delete this wallet's transactions before deleting the wallet." }));
        return false;
    }
    dispatch(removeWalletPositionsForWallet(walletId));
    dispatch(removeWallet(walletId));
    return true;
};
