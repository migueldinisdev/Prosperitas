import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BalanceState, BalanceTransaction, BalanceMonth } from "../../core/schema-types";
import { defaultState } from "../initialState";

const balanceSlice = createSlice({
    name: "balance",
    initialState: defaultState.balance,
    reducers: {
        setBalance: (_state, action: PayloadAction<BalanceState>) =>
            action.payload,
        setBalanceMonth: (
            state,
            action: PayloadAction<{ month: string; data: BalanceMonth }>
        ) => {
            state[action.payload.month] = action.payload.data;
        },
        addBalanceTransaction: (
            state,
            action: PayloadAction<{ month: string; transaction: BalanceTransaction }>
        ) => {
            const { month, transaction } = action.payload;
            if (!state[month]) {
                state[month] = { month, txs: [] };
            }
            state[month].txs.push(transaction);
        },
        updateBalanceTransaction: (
            state,
            action: PayloadAction<{
                month: string;
                index: number;
                transaction: BalanceTransaction;
            }>
        ) => {
            const { month, index, transaction } = action.payload;
            const monthData = state[month];
            if (monthData && monthData.txs[index]) {
                monthData.txs[index] = transaction;
            }
        },
        removeBalanceTransaction: (
            state,
            action: PayloadAction<{ month: string; index: number }>
        ) => {
            const { month, index } = action.payload;
            const monthData = state[month];
            if (monthData) {
                monthData.txs = monthData.txs.filter((_, idx) => idx !== index);
            }
        },
    },
});

export const {
    setBalance,
    setBalanceMonth,
    addBalanceTransaction,
    updateBalanceTransaction,
    removeBalanceTransaction,
} = balanceSlice.actions;
export default balanceSlice.reducer;
