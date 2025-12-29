import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Pie, PiesState } from "../../core/schema-types";
import { defaultState } from "../initialState";

const piesSlice = createSlice({
    name: "pies",
    initialState: defaultState.pies,
    reducers: {
        setPies: (_state, action: PayloadAction<PiesState>) => action.payload,
        addPie: (state, action: PayloadAction<Pie>) => {
            // Use lowercase pie name as the id/key, but keep the stored `name`'s original casing
            const origName = action.payload.name || action.payload.id || "";
            const name = origName.trim();
            const id = name ? name.toLowerCase() : action.payload.id;
            state[id] = { ...action.payload, id, name: action.payload.name ?? action.payload.id };
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
