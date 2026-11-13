import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../src/store';
import { replaceState } from '../src/store/actions';
import { createDemoState } from '../src/data/demoState';
import { defaultState } from '../src/store/initialState';
import { saveWalletTransfer, addWalletTransaction, removeWalletTransaction, updateWalletTransaction } from '../src/store/thunks/walletThunks';
import { calculatePositionCostBasis, calculatePositionCostBasisFx, calculateRealizedPnl, getPnL } from '../src/core/finance';
import { deriveWalletState } from '../src/core/finance/deriveWalletState';
import { replayLedger, quantitySum } from '../src/core/finance/walletLedger';
import { buildNetWorthHistory, getWalletExternalFlow, transactionTouchesAssets } from '../src/utils/netWorthHistory';
import { hydrateState, serializeState } from '../src/data/persistence';
import type { Asset, ProsperitasState, TransferWalletTx, WalletTx } from '../src/core/schema-types';

const base = (id: string, walletId = 'binance', date = '2025-01-01') => ({ id, walletId, date, createdAt: `${date}T10:00:00.000Z` });
const deposit = (id: string, walletId = 'binance', value = 10000): WalletTx => ({ ...base(id, walletId), type: 'deposit', amount: { value, currency: 'EUR' } });
const buy = (id: string, walletId: string, quantity: number, price: number, date = '2025-01-02', assetId = 'link'): WalletTx => ({ ...base(id, walletId, date), type: 'buy', assetId, quantity, price: { value: price, currency: 'EUR' } });
const sell = (id: string, walletId: string, quantity: number, price: number, date = '2025-04-01'): WalletTx => ({ ...base(id, walletId, date), type: 'sell', assetId: 'link', quantity, price: { value: price, currency: 'EUR' } });
const transferInput = (quantity = 15) => ({ walletId: 'binance', counterpartWalletId: 'coinbase', assetId: 'link', quantity, date: '2025-03-01' });
const makeFixture = (txs: WalletTx[] = [deposit('fund-a'), deposit('fund-b', 'coinbase'), buy('a', 'binance', 10, 8), buy('b', 'binance', 10, 12, '2025-02-01'), buy('c', 'coinbase', 5, 20, '2025-02-02')]) => {
    const state = structuredClone(defaultState);
    for (const id of ['binance', 'coinbase', 'ledger']) state.wallets[id] = { id, name: id, cash: [], txIds: [] };
    for (const id of ['link', 'eth']) state.assets[id] = { id, ticker: id.toUpperCase(), name: id, tradingCurrency: 'EUR', assetType: 'crypto', amount: 0, avgCost: { value: 0, currency: 'EUR' }, txIds: [], createdAt: '2025-01-01', updatedAt: '2025-01-01' } as Asset;
    state.pies.pie = { id: 'pie', name: 'Crypto', assetIds: ['link', 'eth'] };
    const result = deriveWalletState(state, Object.fromEntries(txs.map((tx) => [tx.id, tx])));
    assert.equal(result.violation, undefined);
    return { ...state, ...result.value } as ProsperitasState;
};
const makeStore = (state = makeFixture()) => configureStore({ reducer: rootReducer, preloadedState: state });
const list = (state: ProsperitasState, walletId?: string) => Object.values(state.walletTx).filter((tx) => !walletId || tx.walletId === walletId);
const out = (state: ProsperitasState) => list(state).find((tx): tx is TransferWalletTx => tx.type === 'transfer' && tx.direction === 'out')!;
const approx = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

// This is the user-visible invariant for both pie cards and pie detail holdings.
const pieSummary = (state: ProsperitasState) => {
    const cost = calculatePositionCostBasis(list(state).filter((tx) => transactionTouchesAssets(tx, new Set(state.pies.pie.assetIds))), 'EUR', {});
    const units = state.assets.link.amount;
    return { units, cost: cost.get('link')?.costBasisVisual, avg: state.assets.link.avgCost.value, value: units * 30, pnl: getPnL(units * 30, cost.get('link')!.costBasisVisual), members: state.pies.pie.assetIds };
};

test('partial FIFO transfer preserves exact purchase links, dates, cost and pie totals', () => {
    const store = makeStore(); const before = pieSummary(store.getState());
    assert.equal(store.dispatch(saveWalletTransfer(transferInput())), true);
    const state = store.getState(); const tx = out(state);
    assert.deepEqual(tx.lots.map((lot) => [lot.sourceTxId, lot.quantity]), [['a', 10], ['b', 5]]);
    assert.equal(state.walletPositions.binance.link.amount, 5);
    assert.equal(state.walletPositions.coinbase.link.amount, 20);
    approx(state.walletPositions.coinbase.link.avgCost.value, 12);
    assert.deepEqual(pieSummary(state), before);
    assert.equal(calculateRealizedPnl(list(state), 'EUR', {}), 0);
});

test('a total transfer preserves pie membership and publishes one atomic state', () => {
    const store = makeStore(); const before = pieSummary(store.getState()); let notifications = 0;
    store.subscribe(() => { notifications++; assert.equal(store.getState().assets.link.amount, 25); });
    assert.equal(store.dispatch(saveWalletTransfer(transferInput(20))), true);
    assert.equal(notifications, 1);
    assert.equal(store.getState().walletPositions.binance.link, undefined);
    assert.deepEqual(pieSummary(store.getState()), before);
});

test('sales consume lots from the selling wallet, not an older lot elsewhere', () => {
    const store = makeStore(makeFixture([deposit('f1'), deposit('f2', 'coinbase'), buy('old', 'binance', 1, 5), buy('new', 'coinbase', 1, 10, '2025-02-01')]));
    assert.equal(store.dispatch(addWalletTransaction(sell('sale', 'coinbase', 1, 12))), true);
    approx(calculateRealizedPnl(list(store.getState()), 'EUR', {}), 2);
    approx(calculatePositionCostBasis(list(store.getState()), 'EUR', {}).get('link')!.costBasisVisual, 5);
});

test('destination sales use transferred acquisition dates and original purchase costs', () => {
    const store = makeStore(); store.dispatch(saveWalletTransfer(transferInput()));
    assert.equal(store.dispatch(addWalletTransaction(sell('sale', 'coinbase', 12, 30))), true);
    const state = store.getState();
    approx(calculateRealizedPnl(list(state), 'EUR', {}), 256); // 360 - (10*8 + 2*12)
    approx(calculatePositionCostBasis(list(state), 'EUR', {}).get('link')!.costBasisVisual, 196);
    approx(calculatePositionCostBasis(list(state, 'coinbase'), 'EUR', {}).get('link')!.costBasisVisual, 136);
});

test('successive transfers retain original source and each movement in the audit path', () => {
    const store = makeStore(); store.dispatch(saveWalletTransfer(transferInput()));
    const first = out(store.getState());
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(4), walletId: 'coinbase', counterpartWalletId: 'ledger', date: '2025-03-02' })), true);
    const incoming = list(store.getState(), 'ledger').find((tx): tx is TransferWalletTx => tx.type === 'transfer')!;
    assert.equal(incoming.lots[0].sourceTxId, 'a');
    assert.deepEqual(incoming.lots[0].transferIds, [first.transferId]);
    const lot = replayLedger(list(store.getState())).lots.ledger.link[0];
    assert.deepEqual(lot.transferIds, [first.transferId, incoming.transferId]);
    approx(store.getState().walletPositions.ledger.link.avgCost.value, 8);
});

test('editing/removing either transfer leg updates both wallets together', () => {
    const store = makeStore(); const before = pieSummary(store.getState()); store.dispatch(saveWalletTransfer(transferInput()));
    const tx = out(store.getState());
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(7), reference: 'chain-hash' }, tx.transferId)), true);
    assert.equal(list(store.getState()).filter((t) => t.type === 'transfer').length, 2);
    assert.equal(store.getState().walletPositions.binance.link.amount, 13);
    const incoming = list(store.getState()).find((t) => t.type === 'transfer' && t.direction === 'in')!;
    assert.equal(store.dispatch(removeWalletTransaction(incoming.id)), true);
    assert.equal(list(store.getState()).filter((t) => t.type === 'transfer').length, 0);
    assert.deepEqual(pieSummary(store.getState()), before);
});

test('dependent destination sales block removal and reduction without changing financial state', () => {
    const store = makeStore(); store.dispatch(saveWalletTransfer(transferInput()));
    store.dispatch(addWalletTransaction(sell('sale', 'coinbase', 19, 30)));
    const before = store.getState(); const tx = out(before);
    assert.equal(store.dispatch(removeWalletTransaction(tx.id)), false);
    assert.equal(store.dispatch(saveWalletTransfer(transferInput(1), tx.transferId)), false);
    assert.deepEqual(store.getState().walletTx, before.walletTx);
    assert.deepEqual(store.getState().walletPositions, before.walletPositions);
});

test('removing or editing an original purchase replays dependent transfers and remains atomic', () => {
    const store = makeStore(); store.dispatch(saveWalletTransfer(transferInput()));
    assert.equal(store.dispatch(removeWalletTransaction('a')), false);
    assert.equal(store.dispatch(updateWalletTransaction(buy('a', 'binance', 10, 9))), true);
    approx(out(store.getState()).lots[0].price.value, 9);
    approx(calculatePositionCostBasis(list(store.getState(), 'coinbase'), 'EUR', {}).get('link')!.costBasisVisual, 250);
});

test('overdrafts, nonfinite amounts, identical wallets and backdating before acquisition are rejected', () => {
    for (const input of [transferInput(21), transferInput(NaN), transferInput(Infinity), transferInput(0), transferInput(-1), { ...transferInput(), counterpartWalletId: 'binance' }, { ...transferInput(), date: '2024-01-01' }]) {
        const store = makeStore(); const before = store.getState().walletTx;
        assert.equal(store.dispatch(saveWalletTransfer(input)), false);
        assert.deepEqual(store.getState().walletTx, before);
    }
});

test('later source sales also constrain backdated transfers', () => {
    const store = makeStore(); store.dispatch(addWalletTransaction(sell('sale', 'binance', 15, 30)));
    const before = store.getState().walletTx;
    assert.equal(store.dispatch(saveWalletTransfer(transferInput(10))), false);
    assert.deepEqual(store.getState().walletTx, before);
});

test('same-asset fees are additional units and do not inflate received cost', () => {
    const store = makeStore();
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(15), fee: { kind: 'asset', assetId: 'link', quantity: 1 } })), true);
    const state = store.getState(); const tx = out(state);
    assert.equal(state.walletPositions.binance.link.amount, 4);
    assert.equal(state.walletPositions.coinbase.link.amount, 20);
    assert.equal(state.assets.link.amount, 24);
    approx(tx.feeLots![0].price.value, 12);
    approx(calculatePositionCostBasis(list(state), 'EUR', {}).get('link')!.costBasisVisual, 288);
    approx(calculateRealizedPnl(list(state), 'EUR', {}), -12);
});

test('cash fees reduce source cash only; insufficient fees block the whole transfer', () => {
    const store = makeStore(); const before = store.getState();
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(), fee: { kind: 'cash', amount: { value: 2, currency: 'EUR' } } })), true);
    approx(store.getState().wallets.binance.cash[0].value, before.wallets.binance.cash[0].value - 2);
    approx(calculateRealizedPnl(list(store.getState()), 'EUR', {}), -2);
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(1), fee: { kind: 'cash', amount: { value: 1, currency: 'USD' } } })), false);
});

test('fees paid in another asset appear in that asset pie cost and history', () => {
    const store = makeStore(makeFixture([deposit('fund'), buy('link-buy', 'binance', 10, 8), buy('eth-buy', 'binance', 2, 100, '2025-01-03', 'eth')]));
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(5), fee: { kind: 'asset', assetId: 'eth', quantity: 0.1 } })), true);
    const state = store.getState(); const selected = list(state).filter((tx) => transactionTouchesAssets(tx, new Set(['eth'])));
    approx(calculatePositionCostBasis(selected, 'EUR', {}).get('eth')!.costBasisVisual, 190);
    approx(state.assets.eth.amount, 1.9);
    const history = buildNetWorthHistory({ transactions: list(state), forexRates: {}, baseCurrency: 'EUR', includeCash: false, assetFilter: new Set(['eth']) });
    approx(history.at(-1)!.value, 190);
});

test('crypto precision survives tiny transfers and complete depletion', () => {
    const store = makeStore(makeFixture([deposit('fund'), buy('tiny', 'binance', 0.00000003, 8)]));
    store.dispatch(saveWalletTransfer(transferInput(0.00000001)));
    assert.equal(store.dispatch(saveWalletTransfer(transferInput(0.00000002))), true);
    assert.equal(store.getState().walletPositions.binance.link, undefined);
    assert.equal(store.getState().walletPositions.coinbase.link.amount, 0.00000003);
});

test('global histories and external flows are unchanged by a fee-free internal transfer', () => {
    const store = makeStore(); const before = list(store.getState()); store.dispatch(saveWalletTransfer(transferInput()));
    const txs = list(store.getState()); const options = { forexRates: {}, baseCurrency: 'EUR', getAssetPrice: () => 30, snapshotDates: ['2025-02-28', '2025-03-01', '2025-04-01'] };
    assert.deepEqual(buildNetWorthHistory({ ...options, transactions: txs }), buildNetWorthHistory({ ...options, transactions: before }));
    const flows = txs.filter((tx) => tx.type === 'transfer').reduce((n, tx) => n + getWalletExternalFlow(tx, 'EUR'), 0);
    assert.equal(flows, 0);
    const basis = calculatePositionCostBasis(txs, 'EUR', {});
    const walletSum = ['binance', 'coinbase'].reduce((n, id) => n + calculatePositionCostBasis(list(store.getState(), id), 'EUR', {}).get('link')!.costBasisVisual, 0);
    approx(basis.get('link')!.costBasisVisual, walletSum);
});

test('original FX and acquisition fees remain attached after transfers', () => {
    const purchase = buy('usd-buy', 'binance', 10, 10);
    assert.equal(purchase.type, 'buy'); if (purchase.type !== 'buy') return;
    purchase.price.currency = 'USD'; purchase.fxPair = 'USD/EUR'; purchase.fxRate = 0.8;
    purchase.fees = { value: 2, currency: 'USD' };
    const fund = deposit('usd-fund'); if (fund.type === 'deposit') fund.amount.currency = 'USD';
    const store = makeStore(makeFixture([fund, purchase]));
    store.dispatch(saveWalletTransfer(transferInput(5)));
    approx(calculatePositionCostBasis(list(store.getState(), 'coinbase'), 'EUR', { USD: 0.9 }).get('link')!.costBasisVisual, 40.8);
    approx(calculatePositionCostBasisFx(list(store.getState(), 'coinbase'), 'EUR', { USD: 0.9 }).get('link')!.costBasisQuote, 51);
});

test('save/load reconstructs transfer allocations, including tampered cached lots', () => {
    const store = makeStore(); store.dispatch(saveWalletTransfer({ ...transferInput(), reference: 'exchange-id' }));
    const raw = JSON.parse(serializeState(store.getState()));
    for (const tx of Object.values(raw.walletTx) as WalletTx[]) if (tx.type === 'transfer') tx.lots = [];
    const restored = hydrateState(JSON.stringify(raw));
    assert.equal(restored.schemaVersion, '0.3');
    assert.deepEqual(out(restored as ProsperitasState).lots.map((lot) => [lot.sourceTxId, lot.quantity]), [['a', 10], ['b', 5]]);
    assert.equal(out(restored as ProsperitasState).reference, 'exchange-id');
    assert.deepEqual(restored.walletPositions, store.getState().walletPositions);
});

test('legacy cash-only files remain compatible and incomplete holdings are preserved', () => {
    const old = makeFixture(); old.schemaVersion = '0.2';
    const restored = hydrateState(JSON.stringify(old));
    assert.deepEqual(restored.walletTx, old.walletTx);
    assert.equal(restored.wallets.binance.cash[0].value, old.wallets.binance.cash[0].value);
    const incomplete = structuredClone(old); delete incomplete.walletTx.a;
    const result = hydrateState(JSON.stringify(incomplete));
    assert.deepEqual(result.walletPositions, incomplete.walletPositions);
    const store = makeStore(result as ProsperitasState);
    assert.equal(store.dispatch(saveWalletTransfer(transferInput(1))), false);
    assert.match(store.getState().notifications.at(-1)!.message, /Incomplete purchase history/);
});

test('unpaired transfer entries cannot be committed independently', () => {
    const store = makeStore(); const tx: TransferWalletTx = { ...base('bad'), ...transferInput(1), type: 'transfer', direction: 'out', transferId: 'bad', lots: [] };
    assert.equal(store.dispatch(addWalletTransaction(tx)), false);
    assert.equal(list(store.getState()).filter((tx) => tx.type === 'transfer').length, 0);
});


test('even sub-satoshi quantities cannot create units from an empty source', () => {
    const store = makeStore();
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(1e-18), walletId: 'ledger', counterpartWalletId: 'coinbase' })), false);
});

test('same-day FIFO uses original creation order rather than purchase ID or arrival order', () => {
    const early = buy('z-early', 'binance', 1, 5); early.createdAt = '2025-01-02T09:00:00Z';
    const late = buy('a-late', 'binance', 1, 10); late.createdAt = '2025-01-02T10:00:00Z';
    const store = makeStore(makeFixture([deposit('fund'), early, late]));
    store.dispatch(saveWalletTransfer(transferInput(1)));
    assert.equal(out(store.getState()).lots[0].sourceTxId, 'z-early');
    assert.equal(out(store.getState()).lots[0].acquiredAt, early.date);
});

test('a return transfer keeps one acquisition and preserves global basis', () => {
    const store = makeStore(); const before = pieSummary(store.getState());
    store.dispatch(saveWalletTransfer(transferInput()));
    assert.equal(store.dispatch(saveWalletTransfer({ ...transferInput(15), walletId: 'coinbase', counterpartWalletId: 'binance', date: '2025-03-02' })), true);
    assert.deepEqual(pieSummary(store.getState()), before);
    assert.equal(store.getState().walletPositions.binance.link.amount, 20);
    assert.equal(store.getState().walletPositions.coinbase.link.amount, 5);
});

test('total investment PnL decreases by the market value of asset-denominated fees', () => {
    const store = makeStore(); const before = pieSummary(store.getState()).pnl;
    store.dispatch(saveWalletTransfer({ ...transferInput(), fee: { kind: 'asset', assetId: 'link', quantity: 1 } }));
    const after = pieSummary(store.getState()).pnl + calculateRealizedPnl(list(store.getState()), 'EUR', {});
    approx(after, before - 30);
});

test('single-wallet history follows received and remaining units while matching flows cancel globally', () => {
    const store = makeStore(); store.dispatch(saveWalletTransfer(transferInput()));
    for (const [id, quantity] of [['binance', 5], ['coinbase', 20]] as const) {
        const txs = list(store.getState(), id);
        const points = buildNetWorthHistory({ transactions: txs, forexRates: {}, baseCurrency: 'EUR', includeCash: false, getAssetPrice: () => 30 });
        approx(points.at(-1)!.value, quantity * 30);
    }
    const marketValues = Object.fromEntries(list(store.getState()).filter((tx) => tx.type === 'transfer').map((tx) => [tx.id, { value: 450, currency: 'EUR' as const }]));
    const flows = list(store.getState()).filter((tx) => tx.type === 'transfer').map((tx) => getWalletExternalFlow(tx, 'EUR', {}, undefined, marketValues));
    assert.deepEqual(flows.sort((a, b) => a - b), [-450, 450]);
});

test('direct demo loads rebuild derived state before the first transfer so unrelated wallets do not jump', () => {
    const store = makeStore(); store.dispatch(replaceState(createDemoState()));
    const before = store.getState();
    const summary = calculatePositionCostBasis(list(before), 'EUR', {});
    const cash = Object.values(before.wallets).flatMap((wallet) => wallet.cash);
    const amount = before.assets.asset_btc.amount;
    assert.equal(store.dispatch(saveWalletTransfer({ walletId: 'wallet_crypto', counterpartWalletId: 'wallet_stocks', assetId: 'asset_btc', quantity: 0.02, date: '2026-11-01' })), true);
    assert.deepEqual(Object.values(store.getState().wallets).flatMap((wallet) => wallet.cash), cash);
    assert.equal(store.getState().assets.asset_btc.amount, amount);
    assert.deepEqual(calculatePositionCostBasis(list(store.getState()), 'EUR', {}), summary);
});

test('generic edits from the incoming side preserve the original source fee', () => {
    const store = makeStore(); store.dispatch(saveWalletTransfer({ ...transferInput(), fee: { kind: 'cash', amount: { value: 2, currency: 'EUR' } } }));
    const incoming = list(store.getState()).find((tx): tx is TransferWalletTx => tx.type === 'transfer' && tx.direction === 'in')!;
    assert.equal(store.dispatch(updateWalletTransaction({ ...incoming, quantity: 10 })), true);
    assert.deepEqual(out(store.getState()).fee, { kind: 'cash', amount: { value: 2, currency: 'EUR' } });
});
