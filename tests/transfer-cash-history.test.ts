import test from 'node:test';
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../src/store';
import { defaultState } from '../src/store/initialState';
import { deriveWalletState } from '../src/core/finance/deriveWalletState';
import { bookPositions, replayLedger } from '../src/core/finance/walletLedger';
import { calculatePositionCostBasis } from '../src/core/finance';
import { hydrateState, serializeState } from '../src/data/persistence';
import { addWalletTransaction, removeWalletTransaction, saveWalletTransfer, updateWalletTransaction } from '../src/store/thunks/walletThunks';
import type { Asset, ProsperitasState, TransferFee, TransferWalletTx, WalletTx } from '../src/core/schema-types';

const transfer = (quantity = 0.1, fee?: TransferFee) => ({ walletId: 'binance', counterpartWalletId: 'coinbase', assetId: 'link', quantity, date: '2026-11-08', fee });
const original: WalletTx = { id: 'link-buy', walletId: 'binance', type: 'buy', assetId: 'link', quantity: 2, price: { value: 10, currency: 'USD' }, date: '2024-12-19', createdAt: '2024-12-19T12:00:00Z' };
const deposit = (id: string, value: number, currency: 'EUR' | 'USD', date = '2025-01-01'): WalletTx => ({ id, walletId: 'binance', type: 'deposit', amount: { value, currency }, date, createdAt: `${date}T10:00:00Z` });
const legacy = (extra: WalletTx[] = [], savedCash = 0): ProsperitasState => {
    const state = structuredClone(defaultState);
    for (const id of ['binance', 'coinbase', 'unrelated']) state.wallets[id] = { id, name: id, txIds: [], cash: [] };
    state.wallets.binance.cash = [{ value: savedCash, currency: 'USD' }];
    for (const id of ['link', 'eth']) state.assets[id] = { id, ticker: id.toUpperCase(), name: id, assetType: 'crypto', tradingCurrency: 'USD', amount: id === 'link' ? 2 : 0, avgCost: { value: 10, currency: 'USD' }, txIds: id === 'link' ? ['link-buy'] : [], createdAt: original.createdAt, updatedAt: original.createdAt } as Asset;
    state.walletTx = Object.fromEntries([original, ...extra].map(tx => [tx.id, structuredClone(tx)]));
    state.walletPositions = bookPositions(replayLedger(Object.values(state.walletTx)));
    for (const [id, wallet] of Object.entries(state.wallets)) wallet.txIds = Object.values(state.walletTx).filter(tx => tx.walletId === id).map(tx => tx.id);
    state.pies.crypto = { id: 'crypto', name: 'Crypto', assetIds: ['link'] };
    return state;
};
const storeFor = (state = legacy()) => configureStore({ reducer: rootReducer, preloadedState: state });
const cashOf = (state: ProsperitasState) => Object.fromEntries(Object.entries(state.wallets).map(([id, wallet]) => [id, wallet.cash]));
const firstOut = (state: ProsperitasState) => Object.values(state.walletTx).find((tx): tx is TransferWalletTx => tx.type === 'transfer' && tx.direction === 'out')!;

test('LINK preview and save require no USD despite the 2024 historical cash shortfall', () => {
    const store = storeFor();
    const before = store.getState();
    const baselineCost = calculatePositionCostBasis(Object.values(before.walletTx), 'USD', {}).get('link')!.costBasisVisual;
    const legs: TransferWalletTx[] = ['out', 'in'].map(direction => ({ ...transfer(), id: `preview-${direction}`, type: 'transfer', transferId: 'preview', direction, walletId: direction === 'out' ? 'binance' : 'coinbase', counterpartWalletId: direction === 'out' ? 'coinbase' : 'binance', createdAt: '2026-11-08T12:00:00Z', lots: [] } as TransferWalletTx));
    const preview = deriveWalletState(before, { ...before.walletTx, ...Object.fromEntries(legs.map(tx => [tx.id, tx])) });
    assert.equal(preview.violation, undefined);
    assert.equal(store.dispatch(saveWalletTransfer(transfer())), true);
    const after = store.getState();
    assert.deepEqual(cashOf(after), cashOf(before));
    assert.deepEqual(after.walletTx['link-buy'], before.walletTx['link-buy']);
    assert.equal(after.walletPositions.binance.link.amount, 1.9);
    assert.equal(after.walletPositions.coinbase.link.amount, 0.1);
    assert.equal(after.assets.link.amount, 2);
    assert.equal(calculatePositionCostBasis(Object.values(after.walletTx), 'USD', {}).get('link')!.costBasisVisual, baselineCost);
    assert.deepEqual(firstOut(after).lots.map(lot => [lot.sourceTxId, lot.acquiredAt, lot.quantity]), [['link-buy', '2024-12-19', 0.1]]);
    assert.deepEqual(after.pies, before.pies);
});

test('LINK-denominated fees need LINK only and preserve every cash balance', () => {
    const store = storeFor(); const before = cashOf(store.getState());
    assert.equal(store.dispatch(saveWalletTransfer(transfer(0.1, { kind: 'asset', assetId: 'link', quantity: 0.01 }))), true);
    assert.equal(store.getState().walletPositions.binance.link.amount, 1.89);
    assert.equal(store.getState().walletPositions.coinbase.link.amount, 0.1);
    assert.equal(store.getState().assets.link.amount, 1.99);
    assert.deepEqual(cashOf(store.getState()), before);
    assert.equal(firstOut(store.getState()).feeLots![0].sourceTxId, 'link-buy');
});

test('unrelated wallet cash gaps and absent cash buckets do not block or change a LINK movement', () => {
    const unrelated: WalletTx = { ...original, id: 'other-buy', walletId: 'unrelated', assetId: 'eth' };
    const state = legacy([unrelated]); state.wallets.binance.cash = [];
    const store = storeFor(state); const before = cashOf(store.getState());
    assert.equal(store.dispatch(saveWalletTransfer(transfer())), true);
    assert.deepEqual(cashOf(store.getState()), before);
});

test('a zero cash fee does not require cash or create a phantom cash bucket', () => {
    const store = storeFor(); const before = cashOf(store.getState());
    assert.equal(store.dispatch(saveWalletTransfer(transfer(0.1, { kind: 'cash', amount: { value: 0, currency: 'USD' } }))), true);
    assert.deepEqual(cashOf(store.getState()), before);
});

test('new cash fees are still rejected if their source currency is unfunded', () => {
    const store = storeFor(); const before = store.getState();
    assert.equal(store.dispatch(saveWalletTransfer(transfer(0.1, { kind: 'cash', amount: { value: 1, currency: 'USD' } }))), false);
    assert.deepEqual(store.getState().walletTx, before.walletTx);
    assert.deepEqual(store.getState().walletPositions, before.walletPositions);
    assert.deepEqual(cashOf(store.getState()), cashOf(before));
});

test('a funded EUR fee works even though historical USD funding is incomplete', () => {
    const state = legacy([deposit('eur-funding', 10, 'EUR')]); state.wallets.binance.cash.push({ value: 10, currency: 'EUR' });
    const store = storeFor(state);
    assert.equal(store.dispatch(saveWalletTransfer(transfer(0.1, { kind: 'cash', amount: { value: 2, currency: 'EUR' } }))), true);
    assert.deepEqual(store.getState().wallets.binance.cash, [{ value: 0, currency: 'USD' }, { value: 8, currency: 'EUR' }]);
});

test('a historical shortfall that was later covered also stops blocking asset-only transfers', () => {
    const store = storeFor(legacy([deposit('later-funding', 20, 'USD')]));
    assert.equal(store.dispatch(saveWalletTransfer(transfer())), true);
    assert.equal(store.getState().wallets.binance.cash[0].value, 0);
});

test('old cash gaps never relax LINK availability or permit future-dependent history edits', () => {
    const store = storeFor();
    assert.equal(store.dispatch(saveWalletTransfer(transfer(2.000000000000001))), false);
    assert.equal(store.dispatch(saveWalletTransfer(transfer(2))), true);
    const before = store.getState().walletTx;
    assert.equal(store.dispatch(removeWalletTransaction('link-buy')), false);
    assert.deepEqual(store.getState().walletTx, before);
});

test('increasing an old cash deficit or creating a new unfunded purchase still fails', () => {
    const store = storeFor(); const before = store.getState().walletTx;
    assert.equal(store.dispatch(updateWalletTransaction({ ...original, price: { value: 11, currency: 'USD' } })), false);
    assert.equal(store.dispatch(addWalletTransaction({ ...original, id: 'new-unfunded', date: '2026-11-09' })), false);
    assert.deepEqual(store.getState().walletTx, before);
});

test('new credits can reduce historical funding gaps without fabricating any other cash records', () => {
    const store = storeFor();
    assert.equal(store.dispatch(addWalletTransaction(deposit('partial-funding', 5, 'USD'))), true);
    assert.equal(store.getState().wallets.binance.cash[0].value, 5);
    assert.equal(Object.values(store.getState().walletTx).filter(tx => tx.type === 'deposit').length, 1);
});

test('editing, removing, and reloading fee-free transfers preserves cash and the original audit gap', () => {
    const store = storeFor(); const cash = cashOf(store.getState());
    assert.equal(store.dispatch(saveWalletTransfer(transfer())), true);
    const transferId = firstOut(store.getState()).transferId;
    assert.equal(store.dispatch(saveWalletTransfer(transfer(0.2), transferId)), true);
    const restored = hydrateState(serializeState(store.getState())) as ProsperitasState;
    assert.deepEqual(cashOf(restored), cash);
    assert.equal(restored.walletPositions.coinbase.link.amount, 0.2);
    assert.equal(replayLedger(Object.values(restored.walletTx), true).violation!.tx.id, 'link-buy');
    assert.match(replayLedger(Object.values(restored.walletTx), true).violation!.message, /Insufficient cash/);
    assert.equal(store.dispatch(removeWalletTransaction(firstOut(store.getState()).id)), true);
    assert.deepEqual(cashOf(store.getState()), cash);
    assert.deepEqual(store.getState().walletTx['link-buy'], original);
});

test('cash fees cannot overspend the saved cash balance when historical cash has a reconciliation gap', () => {
    // Ledger funding reaches +80 USD, but the wallet's recorded current cash is
    // zero. Inherited funding inconsistencies cannot grant spendable cash.
    const store = storeFor(legacy([deposit('later-cash', 100, 'USD')]));
    const before = store.getState().walletTx;
    assert.equal(store.dispatch(saveWalletTransfer(transfer(0.1, { kind: 'cash', amount: { value: 1, currency: 'USD' } }))), false);
    assert.deepEqual(store.getState().walletTx, before);
});
