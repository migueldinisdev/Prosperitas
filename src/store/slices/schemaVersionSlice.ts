import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { defaultState } from "../initialState";

const schemaVersionSlice = createSlice({
    name: "schemaVersion",
    initialState: defaultState.schemaVersion,
    reducers: {
        setSchemaVersion: (_state, action: PayloadAction<string>) =>
            action.payload,
    },
});

export const { setSchemaVersion } = schemaVersionSlice.actions;
export default schemaVersionSlice.reducer;
