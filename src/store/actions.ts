import { createAction } from "@reduxjs/toolkit";
import { ProsperitasState } from "../core/schema-types";

export const replaceState = createAction<ProsperitasState>("app/replaceState");
