import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Wallet, WalletsState } from "../../core/types";
import { defaultState } from "../initialState";

const walletsSlice = createSlice({
    name: "wallets",
    initialState: defaultState.wallets,
    reducers: {
        setWallets: (_state, action: PayloadAction<WalletsState>) =>
            action.payload,
        addWallet: (state, action: PayloadAction<Wallet>) => {
            state[action.payload.id] = action.payload;
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
            action: PayloadAction<{ id: string; cash: Record<string, number> }>
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
            if (state[id]) {
                state[id].cash[currency] = amount;
            }
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
