import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ForexLivePrice, ForexLivePricesState } from "../../core/schema-types";
import { defaultState } from "../initialState";

const forexLivePricesSlice = createSlice({
    name: "forexLivePrices",
    initialState: defaultState.forexLivePrices,
    reducers: {
        setForexLivePrices: (
            _state,
            action: PayloadAction<ForexLivePricesState>
        ) => action.payload,
        setForexLivePrice: (state, action: PayloadAction<ForexLivePrice>) => {
            state[action.payload.pair] = action.payload;
        },
        clearForexLivePrices: () => ({}),
    },
});

export const {
    setForexLivePrices,
    setForexLivePrice,
    clearForexLivePrices,
} = forexLivePricesSlice.actions;

export default forexLivePricesSlice.reducer;
