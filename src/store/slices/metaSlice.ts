import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Meta } from "../../core/schema-types";
import { defaultState } from "../initialState";

const metaSlice = createSlice({
    name: "meta",
    initialState: defaultState.meta,
    reducers: {
        setMeta: (_state, action: PayloadAction<Meta>) => action.payload,
        updateMeta: (state, action: PayloadAction<Partial<Meta>>) => ({
            ...state,
            ...action.payload,
        }),
    },
});

export const { setMeta, updateMeta } = metaSlice.actions;
export default metaSlice.reducer;
