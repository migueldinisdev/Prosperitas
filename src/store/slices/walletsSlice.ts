import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Wallet, WalletsState, Money } from "../../core/schema-types";
import { defaultState } from "../initialState";

const walletsSlice = createSlice({
    name: "wallets",
    initialState: defaultState.wallets,
    reducers: {
        setWallets: (_state, action: PayloadAction<WalletsState>) =>
            action.payload,
        addWallet: (state, action: PayloadAction<Wallet>) => {
            // Use lowercase wallet name as the id/key, but keep the stored `name`'s original casing
            const origName = action.payload.name || action.payload.id || "";
            const name = origName.trim();
            const id = name ? name.toLowerCase() : action.payload.id;
            state[id] = { ...action.payload, id, name: action.payload.name ?? action.payload.id };
        },
        updateWallet: (
            state,
            action: PayloadAction<{ id: string; changes: Partial<Wallet> }>
        ) => {
            const { id, changes } = action.payload;
            if (state[id]) {
                state[id] = { ...state[id], ...changes };
            }
        },
        removeWallet: (state, action: PayloadAction<string>) => {
            delete state[action.payload];
        },
        setWalletCash: (
            state,
            action: PayloadAction<{ id: string; cash: Money[] }>
        ) => {
            if (state[action.payload.id]) {
                state[action.payload.id].cash = action.payload.cash;
            }
        },
        setWalletCashValue: (
            state,
            action: PayloadAction<{
                id: string;
                currency: string;
                amount: number;
            }>
        ) => {
            const { id, currency, amount } = action.payload;
            if (!state[id]) return;
            const cashArr = state[id].cash || [];
            const existingIdx = cashArr.findIndex((m) => m.currency === currency);
            if (existingIdx >= 0) {
                cashArr[existingIdx].value = amount;
            } else {
                cashArr.push({ value: amount, currency: currency as any });
            }
            state[id].cash = cashArr;
        },
        addWalletTxId: (
            state,
            action: PayloadAction<{ id: string; txId: string }>
        ) => {
            const wallet = state[action.payload.id];
            if (wallet && !wallet.txIds.includes(action.payload.txId)) {
                wallet.txIds.push(action.payload.txId);
            }
        },
        removeWalletTxId: (
            state,
            action: PayloadAction<{ id: string; txId: string }>
        ) => {
            const wallet = state[action.payload.id];
            if (wallet) {
                wallet.txIds = wallet.txIds.filter(
                    (existingId) => existingId !== action.payload.txId
                );
            }
        },
    },
});

export const {
    setWallets,
    addWallet,
    updateWallet,
    removeWallet,
    setWalletCash,
    setWalletCashValue,
    addWalletTxId,
    removeWalletTxId,
} = walletsSlice.actions;
export default walletsSlice.reducer;
