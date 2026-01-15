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
    setWalletCash,
} from "../slices/walletsSlice";
import { updateAsset, setAssetAggregate, removeAsset } from "../slices/assetsSlice";
import { setPieAssets } from "../slices/piesSlice";
import {
    removeWalletPositionsForWallet,
    upsertWalletPosition,
} from "../slices/walletPositionsSlice";
import { addNotification } from "../slices/notificationsSlice";

type LedgerPosition = {
    qty: number;
    totalCost: number;
    currency: string;
};

type LedgerViolation = {
    tx: WalletTx;
    message: string;
};

type LedgerResult = {
    cashByCurrency: Record<string, number>;
    positionsByAsset: Record<string, LedgerPosition>;
    touchedCurrencies: Set<string>;
    violation?: LedgerViolation;
};

const roundCash = (value: number) => Math.round(value * 100) / 100;

const formatValue = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(2);

const sortWalletTransactions = (transactions: WalletTx[]) =>
    [...transactions].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

const getAssetLabel = (state: RootState, assetId: string) => {
    const asset = state.assets[assetId];
    return asset?.ticker || asset?.name || assetId;
};

const describeTransaction = (state: RootState, tx: WalletTx) => {
    switch (tx.type) {
        case "buy":
            return `BUY ${getAssetLabel(state, tx.assetId)}`;
        case "sell":
            return `SELL ${getAssetLabel(state, tx.assetId)}`;
        case "deposit":
            return `Deposit ${tx.amount.currency}`;
        case "withdraw":
            return `Withdraw ${tx.amount.currency}`;
        case "forex":
            return `FX ${tx.from.currency}→${tx.to.currency}`;
        case "dividend":
            return `Dividend ${tx.amount.currency}`;
        default:
            return "Transaction";
    }
};

const validateTransactionInput = (tx: WalletTx) => {
    const hasInvalidMoney = (money: Money) =>
        !Number.isFinite(money.value) || !money.currency;

    switch (tx.type) {
        case "buy":
        case "sell":
            if (tx.quantity <= 0) return "Quantity must be greater than 0.";
            if (tx.price.value < 0 || hasInvalidMoney(tx.price)) {
                return "Price must be zero or greater.";
            }
            if (tx.fees) {
                if (tx.fees.value < 0 || hasInvalidMoney(tx.fees)) {
                    return "Fees must be zero or greater with a valid currency.";
                }
            }
            return null;
        case "deposit":
        case "withdraw":
            if (tx.amount.value <= 0 || hasInvalidMoney(tx.amount)) {
                return "Amount must be greater than 0.";
            }
            return null;
        case "forex":
            if (tx.from.value <= 0 || hasInvalidMoney(tx.from)) {
                return "From amount must be greater than 0.";
            }
            if (tx.to.value <= 0 || hasInvalidMoney(tx.to)) {
                return "To amount must be greater than 0.";
            }
            if (tx.fees) {
                if (tx.fees.value < 0 || hasInvalidMoney(tx.fees)) {
                    return "FX fees must be zero or greater with a valid currency.";
                }
            }
            return null;
        case "dividend":
            if (tx.amount.value < 0 || hasInvalidMoney(tx.amount)) {
                return "Dividend amount must be zero or greater.";
            }
            return null;
        default:
            return "Unsupported transaction type.";
    }
};

const replayWalletLedger = (
    state: RootState,
    transactions: WalletTx[]
): LedgerResult => {
    const cashByCurrency: Record<string, number> = {};
    const positionsByAsset: Record<string, LedgerPosition> = {};
    const touchedCurrencies = new Set<string>();
    const sorted = sortWalletTransactions(transactions);

    const applyCashDelta = (tx: WalletTx, currency: string, delta: number) => {
        const current = cashByCurrency[currency] ?? 0;
        const next = roundCash(current + delta);
        cashByCurrency[currency] = next;
        touchedCurrencies.add(currency);
        if (next < 0) {
            return {
                tx,
                message: `Insufficient cash (${currency} ${formatValue(next)})`,
            } as LedgerViolation;
        }
        return null;
    };

    const applyPositionDelta = (
        tx: WalletTx,
        assetId: string,
        qtyDelta: number,
        totalCostDelta: number,
        currency: string
    ) => {
        const current = positionsByAsset[assetId] ?? {
            qty: 0,
            totalCost: 0,
            currency,
        };
        const nextQty = current.qty + qtyDelta;
        const nextTotalCost = current.totalCost + totalCostDelta;
        positionsByAsset[assetId] = {
            qty: nextQty,
            totalCost: nextQty <= 0 ? 0 : nextTotalCost,
            currency: current.currency || currency,
        };
        if (nextQty < 0) {
            return {
                tx,
                message: `Insufficient ${getAssetLabel(
                    state,
                    assetId
                )} shares (${formatValue(nextQty)})`,
            } as LedgerViolation;
        }
        return null;
    };

    for (const tx of sorted) {
        let violation: LedgerViolation | null = null;
        switch (tx.type) {
            case "deposit":
                violation = applyCashDelta(
                    tx,
                    tx.amount.currency,
                    tx.amount.value
                );
                break;
            case "withdraw":
                violation = applyCashDelta(
                    tx,
                    tx.amount.currency,
                    -tx.amount.value
                );
                break;
            case "forex":
                violation = applyCashDelta(tx, tx.from.currency, -tx.from.value);
                if (violation) break;
                violation = applyCashDelta(tx, tx.to.currency, tx.to.value);
                if (violation) break;
                if (tx.fees) {
                    violation = applyCashDelta(
                        tx,
                        tx.fees.currency,
                        -tx.fees.value
                    );
                }
                break;
            case "buy": {
                const cost = tx.price.value * tx.quantity;
                violation = applyCashDelta(
                    tx,
                    tx.price.currency,
                    -cost
                );
                if (violation) break;
                if (tx.fees) {
                    violation = applyCashDelta(
                        tx,
                        tx.fees.currency,
                        -tx.fees.value
                    );
                    if (violation) break;
                }
                violation = applyPositionDelta(
                    tx,
                    tx.assetId,
                    tx.quantity,
                    cost,
                    tx.price.currency
                );
                break;
            }
            case "sell": {
                const cost = tx.price.value * tx.quantity;
                const current = positionsByAsset[tx.assetId] ?? {
                    qty: 0,
                    totalCost: 0,
                    currency: tx.price.currency,
                };
                const avgCost =
                    current.qty > 0 ? current.totalCost / current.qty : 0;
                violation = applyPositionDelta(
                    tx,
                    tx.assetId,
                    -tx.quantity,
                    -avgCost * tx.quantity,
                    tx.price.currency
                );
                if (violation) break;
                violation = applyCashDelta(tx, tx.price.currency, cost);
                if (violation) break;
                if (tx.fees) {
                    violation = applyCashDelta(
                        tx,
                        tx.fees.currency,
                        -tx.fees.value
                    );
                }
                break;
            }
            case "dividend":
                violation = applyCashDelta(
                    tx,
                    tx.amount.currency,
                    tx.amount.value
                );
                break;
            default:
                break;
        }
        if (violation) {
            return { cashByCurrency, positionsByAsset, touchedCurrencies, violation };
        }
    }

    return { cashByCurrency, positionsByAsset, touchedCurrencies };
};

const buildWalletPositions = (
    positionsByAsset: Record<string, LedgerPosition>
) => {
    const positions: Record<string, WalletPosition> = {};
    Object.entries(positionsByAsset).forEach(([assetId, position]) => {
        if (position.qty <= 0) return;
        positions[assetId] = {
            amount: position.qty,
            avgCost: {
                value: position.totalCost / position.qty,
                currency: position.currency,
            },
        };
    });
    return positions;
};

const buildWalletCash = (
    cashByCurrency: Record<string, number>,
    touchedCurrencies: Set<string>
) =>
    Array.from(touchedCurrencies).map((currency) => ({
        currency: currency as Money["currency"],
        value: roundCash(cashByCurrency[currency] ?? 0),
    }));

const applyWalletDerivedState = (
    walletId: string,
    ledgerResult: LedgerResult,
    dispatch: AppDispatch
) => {
    dispatch(
        setWalletCash({
            id: walletId,
            cash: buildWalletCash(
                ledgerResult.cashByCurrency,
                ledgerResult.touchedCurrencies
            ),
        })
    );

    dispatch(removeWalletPositionsForWallet(walletId));

    const positions = buildWalletPositions(ledgerResult.positionsByAsset);
    Object.entries(positions).forEach(([assetId, position]) => {
        dispatch(
            upsertWalletPosition({
                walletId,
                assetId,
                position,
            })
        );
    });

    return positions;
};

const collectAffectedAssets = (
    state: RootState,
    walletIds: string[],
    nextPositionsByWallet: Record<string, Record<string, WalletPosition>>
) => {
    const assetIds = new Set<string>();
    walletIds.forEach((walletId) => {
        const existing = state.walletPositions[walletId] ?? {};
        Object.keys(existing).forEach((assetId) => assetIds.add(assetId));
        const next = nextPositionsByWallet[walletId] ?? {};
        Object.keys(next).forEach((assetId) => assetIds.add(assetId));
    });
    return assetIds;
};

const updateAssetAggregates = (
    state: RootState,
    assetIds: Set<string>,
    nextPositionsByWallet: Record<string, Record<string, WalletPosition>>,
    nextWalletTx: RootState["walletTx"],
    dispatch: AppDispatch
) => {
    const walletIds = Object.keys(state.wallets);

    assetIds.forEach((assetId) => {
        const asset = state.assets[assetId];
        if (!asset) return;

        let totalAmount = 0;
        let totalCost = 0;
        let avgCurrency: string | null = null;

        walletIds.forEach((walletId) => {
            const positions =
                nextPositionsByWallet[walletId] ??
                state.walletPositions[walletId] ??
                {};
            const position = positions[assetId];
            if (!position) return;
            totalAmount += position.amount;
            totalCost += position.amount * position.avgCost.value;
            if (!avgCurrency) {
                avgCurrency = position.avgCost.currency;
            }
        });

        if (totalAmount <= 0) {
            const pies = state.pies;
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
            return;
        }

        const avgCost = {
            value: totalCost / totalAmount,
            currency: (avgCurrency ?? asset.tradingCurrency) as Money["currency"],
        };

        const txIds = Object.values(nextWalletTx)
            .filter((tx) => "assetId" in tx && tx.assetId === assetId)
            .map((tx) => tx.id);

        dispatch(setAssetAggregate({ assetId, amount: totalAmount, avgCost }));
        dispatch(updateAsset({ id: assetId, changes: { txIds } }));
    });
};

const notifyTransactionBlocked = (
    dispatch: AppDispatch,
    state: RootState,
    tx: WalletTx,
    reason: string
) => {
    dispatch(
        addNotification({
            type: "error",
            title: "Transaction blocked",
            message: `${describeTransaction(state, tx)} (${tx.id} on ${tx.date}) failed: ${reason}`,
        })
    );
};

export const addWalletTransaction = (tx: WalletTx): AppThunk => {
    return (dispatch, getState) => {
        const state = getState();
        const inputError = validateTransactionInput(tx);
        if (inputError) {
            notifyTransactionBlocked(dispatch, state, tx, inputError);
            return;
        }

        const nextWalletTx = { ...state.walletTx, [tx.id]: tx };
        const walletTransactions = Object.values(nextWalletTx).filter(
            (existingTx) => existingTx.walletId === tx.walletId
        );
        const ledgerResult = replayWalletLedger(state, walletTransactions);
        if (ledgerResult.violation) {
            notifyTransactionBlocked(
                dispatch,
                state,
                ledgerResult.violation.tx,
                ledgerResult.violation.message
            );
            return;
        }

        dispatch(addWalletTx(tx));
        dispatch(addWalletTxId({ id: tx.walletId, txId: tx.id }));

        const nextPositionsByWallet: Record<string, Record<string, WalletPosition>> = {};
        nextPositionsByWallet[tx.walletId] = applyWalletDerivedState(
            tx.walletId,
            ledgerResult,
            dispatch
        );

        const affectedAssets = collectAffectedAssets(
            state,
            [tx.walletId],
            nextPositionsByWallet
        );
        updateAssetAggregates(
            state,
            affectedAssets,
            nextPositionsByWallet,
            nextWalletTx,
            dispatch
        );
    };
};

export const removeWalletTransaction = (txId: string): AppThunk => {
    return (dispatch, getState) => {
        const state = getState();
        const existing = state.walletTx[txId];
        if (!existing) return;

        const nextWalletTx = { ...state.walletTx };
        delete nextWalletTx[txId];

        const walletTransactions = Object.values(nextWalletTx).filter(
            (tx) => tx.walletId === existing.walletId
        );
        const ledgerResult = replayWalletLedger(state, walletTransactions);
        if (ledgerResult.violation) {
            notifyTransactionBlocked(
                dispatch,
                state,
                ledgerResult.violation.tx,
                ledgerResult.violation.message
            );
            return;
        }

        dispatch(removeWalletTx(txId));
        dispatch(removeWalletTxId({ id: existing.walletId, txId }));

        const nextPositionsByWallet: Record<string, Record<string, WalletPosition>> = {};
        nextPositionsByWallet[existing.walletId] = applyWalletDerivedState(
            existing.walletId,
            ledgerResult,
            dispatch
        );

        const affectedAssets = collectAffectedAssets(
            state,
            [existing.walletId],
            nextPositionsByWallet
        );
        updateAssetAggregates(
            state,
            affectedAssets,
            nextPositionsByWallet,
            nextWalletTx,
            dispatch
        );
    };
};

export const updateWalletTransaction = (tx: WalletTx): AppThunk => {
    return (dispatch, getState) => {
        const state = getState();
        const existing = state.walletTx[tx.id];
        const inputError = validateTransactionInput(tx);
        if (inputError) {
            notifyTransactionBlocked(dispatch, state, tx, inputError);
            return;
        }

        if (!existing) {
            dispatch(addWalletTransaction(tx) as any);
            return;
        }

        const nextWalletTx = { ...state.walletTx, [tx.id]: tx };
        const walletIds =
            existing.walletId === tx.walletId
                ? [tx.walletId]
                : [existing.walletId, tx.walletId];

        const ledgerResults: Record<string, LedgerResult> = {};

        for (const walletId of walletIds) {
            const walletTransactions = Object.values(nextWalletTx).filter(
                (walletTx) => walletTx.walletId === walletId
            );
            const ledgerResult = replayWalletLedger(state, walletTransactions);
            if (ledgerResult.violation) {
                notifyTransactionBlocked(
                    dispatch,
                    state,
                    ledgerResult.violation.tx,
                    ledgerResult.violation.message
                );
                return;
            }
            ledgerResults[walletId] = ledgerResult;
        }

        dispatch(updateWalletTxAction({ id: tx.id, changes: tx }));
        if (existing.walletId !== tx.walletId) {
            dispatch(removeWalletTxId({ id: existing.walletId, txId: tx.id }));
            dispatch(addWalletTxId({ id: tx.walletId, txId: tx.id }));
        }

        const nextPositionsByWallet: Record<string, Record<string, WalletPosition>> = {};
        walletIds.forEach((walletId) => {
            nextPositionsByWallet[walletId] = applyWalletDerivedState(
                walletId,
                ledgerResults[walletId],
                dispatch
            );
        });

        const affectedAssets = collectAffectedAssets(
            state,
            walletIds,
            nextPositionsByWallet
        );
        updateAssetAggregates(
            state,
            affectedAssets,
            nextPositionsByWallet,
            nextWalletTx,
            dispatch
        );
    };
};
