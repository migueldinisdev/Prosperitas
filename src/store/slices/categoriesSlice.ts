import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Category } from "../../core/types";
import { defaultState } from "../initialState";

export type CategoriesState = Record<string, Category>;

const categoriesSlice = createSlice({
    name: "categories",
    initialState: defaultState.categories,
    reducers: {
        addCategory: (state, action: PayloadAction<Category>) => {
            state[action.payload.id] = action.payload;
        },
        updateCategory: (
            state,
            action: PayloadAction<{ id: string; changes: Partial<Category> }>
        ) => {
            const { id, changes } = action.payload;
            if (state[id]) {
                state[id] = { ...state[id], ...changes };
            }
        },
        removeCategory: (state, action: PayloadAction<string>) => {
            delete state[action.payload];
        },
        setCategories: (_state, action: PayloadAction<CategoriesState>) =>
            action.payload,
    },
});

export const {
    addCategory,
    updateCategory,
    removeCategory,
    setCategories,
} = categoriesSlice.actions;
export default categoriesSlice.reducer;
