import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WalletPosition, WalletPositionsState } from "../../core/types";
import { defaultState } from "../initialState";

const walletPositionsSlice = createSlice({
    name: "walletPositions",
    initialState: defaultState.walletPositions,
    reducers: {
        setWalletPositions: (
            _state,
            action: PayloadAction<WalletPositionsState>
        ) => action.payload,
        upsertWalletPosition: (
            state,
            action: PayloadAction<{
                walletId: string;
                assetId: string;
                position: WalletPosition;
            }>
        ) => {
            const { walletId, assetId, position } = action.payload;
            if (!state[walletId]) {
                state[walletId] = {};
            }
            state[walletId][assetId] = position;
        },
        removeWalletPosition: (
            state,
            action: PayloadAction<{ walletId: string; assetId: string }>
        ) => {
            const { walletId, assetId } = action.payload;
            if (state[walletId]) {
                delete state[walletId][assetId];
            }
        },
        removeWalletPositionsForWallet: (
            state,
            action: PayloadAction<string>
        ) => {
            delete state[action.payload];
        },
    },
});

export const {
    setWalletPositions,
    upsertWalletPosition,
    removeWalletPosition,
    removeWalletPositionsForWallet,
} = walletPositionsSlice.actions;
export default walletPositionsSlice.reducer;
