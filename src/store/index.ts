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
});

const rootReducer = (
    state: ProsperitasState | undefined,
    action: AnyAction
) => {
    if (action.type === REHYDRATE_ACTION && action.payload) {
        return action.payload;
    }
    if (replaceState.match(action)) {
        return action.payload;
    }
    return appReducer(state, action);
};

const persistConfig: PersistConfig<ProsperitasState> = {
    key: "prosperitas",
    storage: createIndexedDbStorage("prosperitas"),
    version: 1,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    devTools: true,
    preloadedState: defaultState,
});

export const persistor = persistStore(store, persistConfig);

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
