import { createAction } from "@reduxjs/toolkit";
import { ProsperitasState } from "../core/types";

export const replaceState = createAction<ProsperitasState>("app/replaceState");
