import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Pie, PiesState } from "../../core/types";
import { defaultState } from "../initialState";

const piesSlice = createSlice({
    name: "pies",
    initialState: defaultState.pies,
    reducers: {
        setPies: (_state, action: PayloadAction<PiesState>) => action.payload,
        addPie: (state, action: PayloadAction<Pie>) => {
            state[action.payload.id] = action.payload;
        },
        updatePie: (
            state,
            action: PayloadAction<{ id: string; changes: Partial<Pie> }>
        ) => {
            const { id, changes } = action.payload;
            if (state[id]) {
                state[id] = { ...state[id], ...changes };
            }
        },
        removePie: (state, action: PayloadAction<string>) => {
            delete state[action.payload];
        },
        setPieAssets: (
            state,
            action: PayloadAction<{ id: string; assetIds: string[] }>
        ) => {
            if (state[action.payload.id]) {
                state[action.payload.id].assetIds = action.payload.assetIds;
            }
        },
    },
});

export const { setPies, addPie, updatePie, removePie, setPieAssets } =
    piesSlice.actions;
export default piesSlice.reducer;
