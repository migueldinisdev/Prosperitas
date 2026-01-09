import { combineReducers, configureStore, ThunkAction } from "@reduxjs/toolkit";
import type { AnyAction } from "@reduxjs/toolkit";
import schemaVersionReducer from "./slices/schemaVersionSlice";
import metaReducer from "./slices/metaSlice";
import settingsReducer from "./slices/settingsSlice";
import accountReducer from "./slices/accountSlice";
import categoriesReducer from "./slices/categoriesSlice";
import balanceReducer from "./slices/balanceSlice";
import assetsReducer from "./slices/assetsSlice";
import walletsReducer from "./slices/walletsSlice";
import walletPositionsReducer from "./slices/walletPositionsSlice";
import walletTxReducer from "./slices/walletTxSlice";
import piesReducer from "./slices/piesSlice";
import livePricesReducer from "./slices/livePricesSlice";
import notificationsReducer from "./slices/notificationsSlice";
import { defaultState } from "./initialState";
import { ProsperitasState } from "../core/schema-types";
import {
    createIndexedDbStorage,
    persistReducer,
    persistStore,
    PersistConfig,
    REHYDRATE_ACTION,
} from "./persist";
import { replaceState } from "./actions";
import { dirtyMiddleware } from "./dirtyMiddleware";

const appReducer = combineReducers({
    schemaVersion: schemaVersionReducer,
    meta: metaReducer,
    settings: settingsReducer,
    account: accountReducer,
    categories: categoriesReducer,
    balance: balanceReducer,
    assets: assetsReducer,
    wallets: walletsReducer,
    walletPositions: walletPositionsReducer,
    walletTx: walletTxReducer,
    pies: piesReducer,
    livePrices: livePricesReducer,
    notifications: notificationsReducer,
});

const rootReducer = (
    state: ProsperitasState | undefined,
    action: AnyAction
) => {
    if (action.type === REHYDRATE_ACTION && action.payload) {
        // Preserve notifications when rehydrating from IndexedDB
        return {
            ...action.payload,
            notifications: state?.notifications ?? [],
        } as ProsperitasState;
    }
    if (replaceState.match(action)) {
        // Preserve notifications when importing from file/Google Drive
        return {
            ...action.payload,
            notifications: state?.notifications ?? [],
        } as ProsperitasState;
    }
    return appReducer(state, action);
};

const persistConfig: PersistConfig<ProsperitasState> = {
    key: "prosperitas",
    storage: createIndexedDbStorage("prosperitas"),
    version: 1,
    whitelist: [
        "schemaVersion",
        "meta",
        "settings",
        "account",
        "categories",
        "balance",
        "assets",
        "wallets",
        "walletPositions",
        "walletTx",
        "pies",
        "livePrices",
    ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    devTools: true,
    preloadedState: defaultState,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(dirtyMiddleware),
});

// Only rehydrate from IndexedDB if not in cloud mode
// Cloud mode should exclusively use data from Google Drive
const shouldRehydrate = () => {
    if (typeof window === 'undefined') return true;
    const storedMode = window.localStorage.getItem('prosperitas:syncMode');
    return storedMode !== 'cloud';
};

export const persistor = persistStore(store, persistConfig, undefined, shouldRehydrate);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    AnyAction
>;

export type AppReducer = typeof rootReducer;
export { replaceState } from "./actions";
