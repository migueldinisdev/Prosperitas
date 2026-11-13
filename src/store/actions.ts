import { createAction } from "@reduxjs/toolkit";
import { PersistedState } from "../core/schema-types";
import type { WalletLedgerState } from "../core/finance/deriveWalletState";

export const replaceState = createAction<PersistedState>("app/replaceState");
export const applyWalletLedger = createAction<WalletLedgerState>("walletLedger/apply");
