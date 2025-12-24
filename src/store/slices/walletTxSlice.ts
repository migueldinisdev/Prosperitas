import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WalletTx, WalletTxState } from "../../core/schema-types";
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
                // Merge changes into existing tx. Cast to WalletTx to satisfy TypeScript
                // We keep this simple; callers should provide a valid discriminated union shape.
                state[id] = ({ ...state[id], ...changes } as unknown) as WalletTx;
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
