import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../index";

// TODO: add derived finance selectors (PnL, allocations, valuations) using pure functions.

export const selectSchemaVersion = (state: RootState) => state.schemaVersion;
export const selectMeta = (state: RootState) => state.meta;
export const selectSettings = (state: RootState) => state.settings;
export const selectAccount = (state: RootState) => state.account;
export const selectCategories = (state: RootState) => state.categories;
export const selectBalance = (state: RootState) => state.balance;
export const selectAssets = (state: RootState) => state.assets;
export const selectWallets = (state: RootState) => state.wallets;
export const selectWalletPositionsState = (state: RootState) =>
    state.walletPositions;
export const selectWalletTxState = (state: RootState) => state.walletTx;
export const selectPies = (state: RootState) => state.pies;
export const selectNotifications = (state: RootState) => state.notifications;

export const makeSelectWalletById = (walletId: string) =>
    createSelector([selectWallets], (wallets) => wallets[walletId]);

export const makeSelectWalletCash = (walletId: string) =>
    createSelector([makeSelectWalletById(walletId)], (wallet) => wallet?.cash);

export const makeSelectWalletTxIds = (walletId: string) =>
    createSelector(
        [makeSelectWalletById(walletId)],
        (wallet) => wallet?.txIds ?? []
    );

export const makeSelectWalletTxByWallet = (walletId: string) =>
    createSelector([selectWalletTxState], (walletTx) =>
        Object.values(walletTx).filter((tx) => tx.walletId === walletId)
    );

export const makeSelectWalletPositions = (walletId: string) =>
    createSelector(
        [selectWalletPositionsState],
        (walletPositions) => walletPositions[walletId] ?? {}
    );

export const makeSelectAssetById = (assetId: string) =>
    createSelector([selectAssets], (assets) => assets[assetId]);

export const makeSelectAssetsByPie = (pieId: string) =>
    createSelector([selectAssets, selectPies], (assets, pies) => {
        const pie = pies[pieId];
        if (!pie) {
            return [];
        }
        return pie.assetIds
            .map((assetId) => assets[assetId])
            .filter((asset) => Boolean(asset));
    });

export const makeSelectBalanceByMonth = (month: string) =>
    createSelector([selectBalance], (balance) => balance[month]);
