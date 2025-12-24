import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Account } from "../../core/schema-types";
import { defaultState } from "../initialState";

const accountSlice = createSlice({
    name: "account",
    initialState: defaultState.account,
    reducers: {
        setAccount: (_state, action: PayloadAction<Account>) => action.payload,
        updateAccountName: (state, action: PayloadAction<string>) => ({
            ...state,
            name: action.payload,
        }),
    },
});

export const { setAccount, updateAccountName } = accountSlice.actions;
export default accountSlice.reducer;
