import { WalletTx, Money, WalletPosition } from "../../core/schema-types";
import { AppThunk, AppDispatch, RootState } from "../index";
import {
    addWalletTx,
    removeWalletTx,
    updateWalletTx as updateWalletTxAction,
} from "../slices/walletTxSlice";
import {
    addWalletTxId,
    removeWalletTxId,
    setWalletCashValue,
} from "../slices/walletsSlice";
import {
    addAssetTxId,
    removeAssetTxId,
    setAssetAggregate,
    removeAsset,
    updateAsset,
} from "../slices/assetsSlice";
import { setPieAssets } from "../slices/piesSlice";
import { upsertWalletPosition } from "../slices/walletPositionsSlice";

const calculateWeightedAverage = (
    currentAmount: number,
    currentAvgCost: Money,
    deltaQuantity: number,
    txPrice: Money
): Money => {
    const nextAmount = currentAmount + deltaQuantity;
    if (nextAmount <= 0) {
        return { value: 0, currency: txPrice.currency };
    }

    const currentCost = currentAmount * currentAvgCost.value;
    const deltaCost = deltaQuantity * txPrice.value;
    return {
        currency: txPrice.currency,
        value: (currentCost + deltaCost) / nextAmount,
    };
};

const adjustWalletCash = (
    walletId: string,
    currency: string,
    delta: number,
    getState: () => RootState,
    dispatch: AppDispatch
) => {
    const wallet = getState().wallets[walletId];
    if (!wallet) {
        return;
    }
    const cashEntry = (wallet.cash || []).find((m) => m.currency === currency);
    const currentCash = cashEntry ? cashEntry.value : 0;
    const nextCash = Math.round((currentCash + delta) * 100) / 100;
    dispatch(
        setWalletCashValue({
            id: walletId,
            currency,
            amount: nextCash,
        })
    );
};

const updatePositions = (
    walletId: string,
    assetId: string,
    quantityDelta: number,
    price: Money | undefined,
    getState: () => RootState,
    dispatch: AppDispatch,
    updateAverage: boolean
) => {
    const state = getState();
    const currentWalletPosition =
        state.walletPositions[walletId]?.[assetId] ?? null;
    const asset = state.assets[assetId];

    const currentAmount = currentWalletPosition?.amount ?? 0;
    const currentAvgCost =
        currentWalletPosition?.avgCost ??
        price ?? { value: 0, currency: (asset?.tradingCurrency ?? 'EUR') as any };

    const nextAmount = Math.max(currentAmount + quantityDelta, 0);
    const nextAvgCost =
        updateAverage && price
            ? calculateWeightedAverage(currentAmount, currentAvgCost, quantityDelta, price)
            : currentAvgCost;

    const walletPosition: WalletPosition = {
        amount: nextAmount,
        avgCost:
            nextAmount === 0
                ? { value: 0, currency: nextAvgCost.currency }
                : nextAvgCost,
    };

    dispatch(
        upsertWalletPosition({
            walletId,
            assetId,
            position: walletPosition,
        })
    );

    if (asset) {
        const assetNextAmount = Math.max(asset.amount + quantityDelta, 0);
        const assetAvg =
            updateAverage && price
                ? calculateWeightedAverage(asset.amount, asset.avgCost, quantityDelta, price)
                : asset.avgCost;

        dispatch(
            setAssetAggregate({
                assetId,
                amount: assetNextAmount,
                avgCost:
                    assetNextAmount === 0
                        ? { value: 0, currency: assetAvg.currency }
                        : assetAvg,
            })
        );

        if (assetNextAmount === 0) {
            const pies = getState().pies;
            Object.values(pies).forEach((pie) => {
                if (!pie.assetIds.includes(assetId)) return;
                dispatch(
                    setPieAssets({
                        id: pie.id,
                        assetIds: pie.assetIds.filter(
                            (existingId) => existingId !== assetId
                        ),
                    })
                );
            });
            dispatch(removeAsset(assetId));
        }
    }
};

const applyWalletTransactionEffects = (
    tx: WalletTx,
    direction: 1 | -1,
    getState: () => RootState,
    // dispatch can be a thunk dispatch; keep flexible to avoid strict type mismatch
    dispatch: any
) => {
    switch (tx.type) {
        case "deposit":
            adjustWalletCash(
                tx.walletId,
                tx.amount.currency,
                direction * tx.amount.value,
                getState,
                dispatch
            );
            break;
        case "withdraw":
            adjustWalletCash(
                tx.walletId,
                tx.amount.currency,
                -direction * tx.amount.value,
                getState,
                dispatch
            );
            break;
        case "forex":
            adjustWalletCash(
                tx.walletId,
                tx.from.currency,
                -direction * tx.from.value,
                getState,
                dispatch
            );
            adjustWalletCash(
                tx.walletId,
                tx.to.currency,
                direction * tx.to.value,
                getState,
                dispatch
            );
            if (tx.fees) {
                adjustWalletCash(
                    tx.walletId,
                    tx.fees.currency,
                    -direction * tx.fees.value,
                    getState,
                    dispatch
                );
            }
            break;
        case "buy":
			
            adjustWalletCash(
                tx.walletId,
                tx.price.currency,
                -direction * tx.price.value * tx.quantity,
                getState,
                dispatch
            );
            if (tx.fees) {
                adjustWalletCash(
                    tx.walletId,
                    tx.fees.currency,
                    -direction * tx.fees.value,
                    getState,
                    dispatch
                );
            }
            updatePositions(
                tx.walletId,
                tx.assetId,
                direction * tx.quantity,
                tx.price,
                getState,
                dispatch,
                true
            );
            if (direction === 1) {
                const asset = getState().assets[tx.assetId];
                if (asset && !asset.livePrice) {
                    dispatch(
                        updateAsset({
                            id: tx.assetId,
                            changes: {
                                livePrice: tx.price,
                                livePriceUpdatedAt: tx.date,
                            },
                        })
                    );
                }
            }
            if (direction === 1) {
                dispatch(addAssetTxId({ assetId: tx.assetId, txId: tx.id }));
            } else {
                dispatch(removeAssetTxId({ assetId: tx.assetId, txId: tx.id }));
            }
            break;
        case "sell":
            adjustWalletCash(
                tx.walletId,
                tx.price.currency,
                direction * tx.price.value * tx.quantity,
                getState,
                dispatch
            );

            if (tx.fees) {
                adjustWalletCash(
                    tx.walletId,
                    tx.fees.currency,
                    -direction * tx.fees.value,
                    getState,
                    dispatch
                );
            }
            updatePositions(
                tx.walletId,
                tx.assetId,
                -direction * tx.quantity,
                tx.price,
                getState,
                dispatch,
                false
            );
            if (direction === 1) {
                dispatch(addAssetTxId({ assetId: tx.assetId, txId: tx.id }));
            } else {
                dispatch(removeAssetTxId({ assetId: tx.assetId, txId: tx.id }));
            }
            break;
        case "dividend":
            adjustWalletCash(
                tx.walletId,
                tx.amount.currency,
                direction * tx.amount.value,
                getState,
                dispatch
            );
            break;
    }

    if (direction === 1) {
        dispatch(addWalletTxId({ id: tx.walletId, txId: tx.id }));
    } else {
        dispatch(removeWalletTxId({ id: tx.walletId, txId: tx.id }));
    }
};

export const addWalletTransaction = (tx: WalletTx): AppThunk => {
    return (dispatch, getState) => {
        applyWalletTransactionEffects(tx, 1, getState, dispatch);
        dispatch(addWalletTx(tx));
    };
};

export const removeWalletTransaction = (txId: string): AppThunk => {
    return (dispatch, getState) => {
        const existing = getState().walletTx[txId];
        if (!existing) return;
        applyWalletTransactionEffects(existing, -1, getState, dispatch);
        dispatch(removeWalletTx(txId));
    };
};

export const updateWalletTransaction = (tx: WalletTx): AppThunk => {
    return (dispatch, getState) => {
        const existing = getState().walletTx[tx.id];
        if (existing) {
            applyWalletTransactionEffects(existing, -1, getState, dispatch);
        }
        applyWalletTransactionEffects(tx, 1, getState, dispatch);
        dispatch(updateWalletTxAction({ id: tx.id, changes: tx }));
    };
};
