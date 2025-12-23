import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Asset, AssetsState, Money } from "../../core/types";
import { defaultState } from "../initialState";

const assetsSlice = createSlice({
    name: "assets",
    initialState: defaultState.assets,
    reducers: {
        setAssets: (_state, action: PayloadAction<AssetsState>) =>
            action.payload,
        addAsset: (state, action: PayloadAction<Asset>) => {
            state[action.payload.id] = action.payload;
        },
        updateAsset: (
            state,
            action: PayloadAction<{ id: string; changes: Partial<Asset> }>
        ) => {
            const { id, changes } = action.payload;
            if (state[id]) {
                state[id] = { ...state[id], ...changes };
            }
        },
        removeAsset: (state, action: PayloadAction<string>) => {
            delete state[action.payload];
        },
        addAssetTxId: (
            state,
            action: PayloadAction<{ assetId: string; txId: string }>
        ) => {
            const asset = state[action.payload.assetId];
            if (asset && !asset.txIds.includes(action.payload.txId)) {
                asset.txIds.push(action.payload.txId);
            }
        },
        removeAssetTxId: (
            state,
            action: PayloadAction<{ assetId: string; txId: string }>
        ) => {
            const asset = state[action.payload.assetId];
            if (asset) {
                asset.txIds = asset.txIds.filter(
                    (existingId) => existingId !== action.payload.txId
                );
            }
        },
        setAssetAggregate: (
            state,
            action: PayloadAction<{
                assetId: string;
                amount: number;
                avgCost: Money;
            }>
        ) => {
            const { assetId, amount, avgCost } = action.payload;
            if (state[assetId]) {
                state[assetId].amount = amount;
                state[assetId].avgCost = avgCost;
                state[assetId].updatedAt = new Date().toISOString();
            }
        },
    },
});

export const {
    setAssets,
    addAsset,
    updateAsset,
    removeAsset,
    addAssetTxId,
    removeAssetTxId,
    setAssetAggregate,
} = assetsSlice.actions;
export default assetsSlice.reducer;
