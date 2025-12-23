import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WalletTx, WalletTxState } from "../../core/types";
import { defaultState } from "../initialState";

const walletTxSlice = createSlice({
    name: "walletTx",
    initialState: defaultState.walletTx,
    reducers: {
        setWalletTx: (_state, action: PayloadAction<WalletTxState>) =>
            action.payload,
        addWalletTx: (state, action: PayloadAction<WalletTx>) => {
            state[action.payload.id] = action.payload;
        },
        updateWalletTx: (
            state,
            action: PayloadAction<{ id: string; changes: Partial<WalletTx> }>
        ) => {
            const { id, changes } = action.payload;
            if (state[id]) {
                state[id] = { ...state[id], ...changes };
            }
        },
        removeWalletTx: (state, action: PayloadAction<string>) => {
            delete state[action.payload];
        },
    },
});

export const {
    setWalletTx,
    addWalletTx,
    updateWalletTx,
    removeWalletTx,
} = walletTxSlice.actions;
export default walletTxSlice.reducer;
