import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LivePrice, LivePricesState } from "../../core/schema-types";
import { defaultState } from "../initialState";

const livePricesSlice = createSlice({
    name: "livePrices",
    initialState: defaultState.livePrices,
    reducers: {
        setLivePrices: (_state, action: PayloadAction<LivePricesState>) =>
            action.payload,
        setLivePrice: (state, action: PayloadAction<LivePrice>) => {
            state[action.payload.key] = action.payload;
        },
        clearLivePrices: () => ({}),
    },
});

export const { setLivePrices, setLivePrice, clearLivePrices } =
    livePricesSlice.actions;

export default livePricesSlice.reducer;
