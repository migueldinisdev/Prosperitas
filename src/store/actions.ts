import { createAction } from "@reduxjs/toolkit";
import { PersistedState } from "../core/schema-types";

export const replaceState = createAction<PersistedState>("app/replaceState");
