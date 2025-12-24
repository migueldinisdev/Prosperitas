import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Settings } from "../../core/schema-types";
import { defaultState } from "../initialState";

const settingsSlice = createSlice({
    name: "settings",
    initialState: defaultState.settings,
    reducers: {
        setSettings: (_state, action: PayloadAction<Settings>) =>
            action.payload,
        updateSettings: (state, action: PayloadAction<Partial<Settings>>) => ({
            ...state,
            ...action.payload,
        }),
    },
});

export const { setSettings, updateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
