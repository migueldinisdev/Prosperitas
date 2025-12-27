import type { AppThunk } from "../index";
import type { BalanceTransaction } from "../../core/schema-types";
import {
    addBalanceTransaction,
    removeBalanceTransaction,
    updateBalanceTransaction,
} from "../slices/balanceSlice";

export const addBalanceTransactionThunk = (payload: {
    month: string;
    transaction: BalanceTransaction;
}): AppThunk => {
    return (dispatch) => {
        dispatch(addBalanceTransaction(payload));
    };
};

export const updateBalanceTransactionThunk = (payload: {
    month: string;
    index: number;
    transaction: BalanceTransaction;
}): AppThunk => {
    return (dispatch) => {
        dispatch(updateBalanceTransaction(payload));
    };
};

export const removeBalanceTransactionThunk = (payload: {
    month: string;
    index: number;
}): AppThunk => {
    return (dispatch) => {
        dispatch(removeBalanceTransaction(payload));
    };
};
