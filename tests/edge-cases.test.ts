import test from 'node:test';
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../src/store';
import { defaultState } from '../src/store/initialState';
import { deriveWalletState } from '../src/core/finance/deriveWalletState';
import { bookPositions, replayLedger, sortLedgerTransactions, quantitySum } from '../src/core/finance/walletLedger';
import { calculatePositionCostBasis, calculatePositionCostBasisFx, calculateRealizedPnl, calculateTimeWeightedReturn, calculatePeriodReturns } from '../src/core/finance';
import { buildNetWorthHistory, getWalletExternalFlow, transactionTouchesAssets } from '../src/utils/netWorthHistory';
import { addWalletTransaction, removeWalletTransaction, saveWalletTransfer, updateWalletTransaction } from '../src/store/thunks/walletThunks';
import { hydrateState, serializeState } from '../src/data/persistence';
import type { Asset, Money, ProsperitasState, TransferWalletTx, WalletTx } from '../src/core/schema-types';

const meta = (id: string, walletId = 'a', date = '2025-01-01') => ({ id, walletId, date, createdAt: `${date}T10:00:00.000Z` });
const funding = (id = 'fund', walletId = 'a', currency: Money['currency'] = 'EUR'): WalletTx => ({ ...meta(id, walletId), type: 'deposit', amount: { value: 100000, currency } });
const purchase = (id: string, quantity = 1, price = 100, walletId = 'a', date = '2025-01-02'): WalletTx => ({ ...meta(id, walletId, date), type: 'buy', assetId: 'btc', quantity, price: { value: price, currency: 'EUR' } });
const sale = (id: string, quantity = 1, price = 150, walletId = 'b', date = '2025-04-01'): WalletTx => ({ ...meta(id, walletId, date), type: 'sell', assetId: 'btc', quantity, price: { value: price, currency: 'EUR' } });
const pair = (id: string, quantity = 1, walletId = 'a', counterpartWalletId = 'b', date = '2025-03-01'): TransferWalletTx[] => {
    const out: TransferWalletTx = { ...meta(`${id}_out`, walletId, date), type: 'transfer', direction: 'out', transferId: id, counterpartWalletId, assetId: 'btc', quantity, lots: [] };
    return [out, { ...out, id: `${id}_in`, walletId: counterpartWalletId, counterpartWalletId: walletId, direction: 'in' }];
};
const fixture = (transactions: WalletTx[] = [funding(), purchase('buy', 10)]) => {
    const state = structuredClone(defaultState);
    for (const id of ['a', 'b', 'c']) state.wallets[id] = { id, name: id, cash: [], txIds: [] };
    for (const id of ['btc', 'eth']) state.assets[id] = { id, ticker: id.toUpperCase(), name: id, assetType: 'crypto', tradingCurrency: 'EUR', amount: 0, avgCost: { value: 0, currency: 'EUR' }, txIds: [], createdAt: '2025-01-01', updatedAt: '2025-01-01' } as Asset;
    state.pies.p = { id: 'p', name: 'P', assetIds: ['btc', 'eth'] };
    const derived = deriveWalletState(state, Object.fromEntries(transactions.map(tx => [tx.id, tx])));
    assert.equal(derived.violation, undefined, derived.violation?.message);
    return { ...state, ...derived.value } as ProsperitasState;
};
const storeFor = (state = fixture()) => configureStore({ reducer: rootReducer, preloadedState: state });
const txList = (state: ProsperitasState, walletId?: string) => Object.values(state.walletTx).filter(tx => !walletId || tx.walletId === walletId);
const near = (value: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(value - expected) <= tolerance, `${value} != ${expected}`);

// Expected quantities are asserted independently, never via production rounding.
test('full stored precision survives the first buy and a partial transfer', () => {
    const quantity = 0.1234567890123456;
    const state = fixture([funding(), purchase('precise', quantity)]);
    assert.equal(state.walletPositions.a.btc.amount, quantity);
    const store = storeFor(state);
    assert.equal(store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 0.0234567890123456, date: '2025-03-01' })), true);
    assert.equal(store.getState().walletPositions.a.btc.amount, 0.1);
    assert.equal(store.getState().walletPositions.b.btc.amount, 0.0234567890123456);
    assert.equal(store.getState().assets.btc.amount, quantity);
});

test('decimal arithmetic retains all meaningful digits without 0.1+0.2 binary dust', () => {
    assert.equal(quantitySum(0.1, 0.2), 0.3);
    assert.equal(quantitySum(0.1234567890123456, 0), 0.1234567890123456);
    assert.equal(quantitySum(0.1234567890123456, -0.0234567890123456), 0.1);
});

test('even a small excess over the source quantity is rejected, not silently underfunded', () => {
    const store = storeFor(fixture([funding(), purchase('one', 1)]));
    const before = store.getState().walletTx;
    assert.equal(store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 1.000000000000001, date: '2025-03-01' })), false);
    assert.deepEqual(store.getState().walletTx, before);
});

test('transfer pairs remain contiguous despite another ID sorting between the leg IDs', () => {
    const legs = pair('movement');
    const unrelated: WalletTx = { ...meta('movement_mid', 'c', '2025-03-01'), type: 'deposit', amount: { value: 1, currency: 'EUR' } };
    const operations = [legs[1], unrelated, legs[0]];
    const sorted = sortLedgerTransactions(operations);
    const index = sorted.findIndex(tx => tx.id === legs[0].id);
    assert.equal(sorted[index + 1]?.id, legs[1].id);
    const book = replayLedger([funding(), purchase('buy'), ...operations], true);
    assert.equal(book.violation, undefined);
    assert.equal(bookPositions(book).b.btc.amount, 1);
});

test('same-instant transfer chains are deterministic even when IDs sort in reverse causal order', () => {
    const store = storeFor();
    const originalDate = globalThis.Date;
    // Freeze the clock to reproduce multiple user operations recorded within 1 ms.
    const now = '2025-03-01T12:00:00.000Z';
    class FrozenDate extends originalDate { constructor(value?: any) { super(value === undefined ? now : value); } static now() { return originalDate.parse(now); } }
    globalThis.Date = FrozenDate as DateConstructor;
    try {
        for (let i = 0; i < 30; i++) {
            const from = i % 2 === 0 ? 'a' : 'b', to = i % 2 === 0 ? 'b' : 'a';
            assert.equal(store.dispatch(saveWalletTransfer({ walletId: from, counterpartWalletId: to, assetId: 'btc', quantity: 10, date: '2025-03-01' })), true, `transfer ${i}`);
        }
        assert.equal(store.getState().assets.btc.amount, 10);
    } finally { globalThis.Date = originalDate; }
});

test('the user BTC example consumes the January Binance lot after its arrival in Coinbase', () => {
    const store = storeFor(fixture([funding(), funding('fund-b', 'b'), { ...purchase('binance-jan', 1, 100, 'a', '2025-01-01'), createdAt: '2025-01-01T11:00:00.000Z' }, purchase('coinbase-feb', 1, 200, 'b', '2025-02-01')]));
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 1, date: '2025-03-01' }));
    assert.equal(store.dispatch(addWalletTransaction(sale('sell-one'))), true);
    const book = replayLedger(txList(store.getState()), true);
    assert.equal(book.consumed['sell-one'][0].sourceTxId, 'binance-jan');
    assert.equal(book.consumed['sell-one'][0].acquiredAt, '2025-01-01');
    near(calculateRealizedPnl(txList(store.getState()), 'EUR', {}), 50);
    assert.equal(book.lots.b.btc[0].sourceTxId, 'coinbase-feb');
});

test('a small same-asset transfer does not change the fallback historical price globally', () => {
    const store = storeFor(fixture([funding(), purchase('old', 1, 80), purchase('new', 1, 120, 'a', '2025-02-01')]));
    const before = txList(store.getState());
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 0.4, date: '2025-03-01' }));
    const options = { forexRates: {}, baseCurrency: 'EUR', snapshotDates: ['2025-03-01'] };
    assert.deepEqual(buildNetWorthHistory({ ...options, transactions: txList(store.getState()) }), buildNetWorthHistory({ ...options, transactions: before }));
});

test('cash history agrees with the ledger when trade totals have fractional cents', () => {
    const txs = [funding(), purchase('x', 0.1, 10.05), purchase('y', 0.1, 10.05, 'a', '2025-01-03')];
    const state = fixture(txs);
    const history = buildNetWorthHistory({ transactions: txs, forexRates: {}, baseCurrency: 'EUR', includeHoldings: false });
    assert.equal(history.at(-1)!.value, state.wallets.a.cash[0].value);
});

test('TWR accounts for flows between snapshots, not just exactly on snapshot dates', () => {
    near(calculateTimeWeightedReturn([{ date: '2025-01-01', value: 100 }, { date: '2025-01-03', value: 150 }], [{ date: '2025-01-02', amount: 50 }])!, 0);
});

test('original FX is used only when the stored pair actually converts into the visual currency', () => {
    const buy = purchase('usd', 1, 100);
    if (buy.type !== 'buy') return;
    buy.price.currency = 'USD'; buy.fxPair = 'USD/EUR'; buy.fxRate = 0.8;
    const fund = funding('usd-fund', 'a', 'USD');
    const lots = replayLedger([fund, buy]);
    const getHistoricalFx = (currency: string) => currency === 'USD' ? 0.7 : null;
    const result = calculatePositionCostBasisFx([fund, buy], 'GBP', { USD: 0.9 }, getHistoricalFx).get('btc')!;
    near(result.costBasisBase, 70);
    assert.equal(result.hasMissingFx, false);
    const missing = calculatePositionCostBasisFx([fund, buy], 'GBP', {}, () => null).get('btc')!;
    assert.equal(missing.hasMissingFx, true);
    assert.equal(lots.lots.a.btc[0].fxPair, 'USD/EUR');
});

test('acquisition fees in another currency are retained through transfers and included once', () => {
    const buy = purchase('fees', 2, 100);
    if (buy.type !== 'buy') return;
    buy.fees = { value: 10, currency: 'USD' };
    const store = storeFor(fixture([funding(), funding('usd', 'a', 'USD'), buy]));
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 1, date: '2025-03-01' }));
    const txs = txList(store.getState());
    near(calculatePositionCostBasis(txs, 'EUR', { USD: 0.8 }).get('btc')!.costBasisVisual, 208);
    near(calculatePositionCostBasis(txList(store.getState(), 'b'), 'EUR', { USD: 0.8 }).get('btc')!.costBasisVisual, 104);
});

for (const [name, changed] of [
    ['unknown transaction type', { type: 'gift', amount: { value: 1, currency: 'EUR' } }],
    ['impossible calendar date', { date: '2025-02-30' }],
    ['invalid original FX', { fxPair: 'USD/EUR', fxRate: -1 }],
    ['overflowing consideration', { quantity: 1e200, price: { value: 1e200, currency: 'EUR' } }],
] as const) test(`invalid input is rejected: ${name}`, () => {
    const store = storeFor(); const before = store.getState().walletTx;
    assert.equal(store.dispatch(addWalletTransaction({ ...purchase('invalid'), ...changed } as any)), false);
    assert.deepEqual(store.getState().walletTx, before);
});

test('replaying does not mutate the original transactions or saved allocation arrays', () => {
    const store = storeFor(); store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 2, date: '2025-03-01' }));
    const original = serializeState(store.getState());
    replayLedger(txList(store.getState()), true);
    calculatePositionCostBasis(txList(store.getState()), 'EUR', {});
    const snapshot = JSON.parse(original); delete snapshot.meta.updatedAt;
    const after = JSON.parse(serializeState(store.getState())); delete after.meta.updatedAt;
    assert.deepEqual(after, snapshot);
});

test('seeded operation sequences conserve every original lot across sales, fees and three wallets', () => {
    const scale = 100_000_000;
    let verified = 0;
    for (let seed = 1; seed <= 40; seed++) {
        let randomState = seed;
        const random = (limit: number) => {
            randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
            return randomState % limit;
        };
        type Portion = { source: string; units: number; path: string[] };
        const model: Record<string, Record<string, Portion[]>> = {};
        const originals = new Map<string, { units: number; price: number; assetId: string; order: number }>();
        const records: WalletTx[] = ['a', 'b', 'c'].map(id => funding(`fund-${id}`, id));
        const available = (wallet: string, assetId: string) => (model[wallet]?.[assetId] ?? []).reduce((n, lot) => n + lot.units, 0);
        const holding = (wallet: string, assetId: string) => (model[wallet] ??= {})[assetId] ??= [];
        const cost = (lots: Portion[]) => lots.reduce((n, lot) => n + lot.units / scale * originals.get(lot.source)!.price, 0);
        const take = (wallet: string, assetId: string, units: number) => {
            const lots = holding(wallet, assetId);
            lots.sort((x, y) => originals.get(x.source)!.order - originals.get(y.source)!.order || x.path.join('/').localeCompare(y.path.join('/')));
            const selected: Portion[] = [];
            while (units > 0) {
                assert.ok(lots.length, 'reference model overdraft');
                const used = Math.min(units, lots[0].units);
                selected.push({ ...lots[0], units: used, path: [...lots[0].path] });
                lots[0].units -= used; units -= used;
                if (!lots[0].units) lots.shift();
            }
            return selected;
        };
        for (let i = 0; i < 12; i++) {
            const wallet = ['a', 'b', 'c'][i % 3], assetId = i % 2 ? 'eth' : 'btc';
            const source = `original-${i}`, units = 1000 + random(5_000_000), price = 100 + random(20000);
            originals.set(source, { units, price, assetId, order: i });
            holding(wallet, assetId).push({ source, units, path: [] });
            const date = `2025-01-${String(i + 2).padStart(2, '0')}`;
            records.push({ ...purchase(source, units / scale, price, wallet, date), assetId } as WalletTx);
        }
        let expectedRealized = 0;
        const consumed = new Map<string, number>();
        const consume = (lots: Portion[]) => lots.forEach(lot => consumed.set(lot.source, (consumed.get(lot.source) ?? 0) + lot.units));
        for (let step = 0; step < 50; step++) {
            const choices = ['a', 'b', 'c'].flatMap(wallet => ['btc', 'eth'].filter(assetId => available(wallet, assetId) > 0).map(assetId => ({ wallet, assetId })));
            if (!choices.length) break;
            const { wallet, assetId } = choices[random(choices.length)];
            const units = 1 + random(available(wallet, assetId));
            const date = '2025-03-01', createdAt = new Date(Date.UTC(2025, 2, 1, 12, 0, step)).toISOString();
            const beforeCost = cost(Object.values(model).flatMap(byAsset => Object.values(byAsset).flat()));
            const removed = take(wallet, assetId, units);
            if (random(3) === 0) {
                const price = 100 + random(25000), fee = random(100) / 100;
                records.push({ ...sale(`sale-${step}`, units / scale, price, wallet, date), assetId, createdAt, fees: { value: fee, currency: 'EUR' } } as WalletTx);
                expectedRealized += units / scale * price - cost(removed) - fee;
                consume(removed);
            } else {
                const destination = ['a', 'b', 'c'].filter(id => id !== wallet)[random(2)];
                const transferId = `transfer-${step}`;
                const legs = pair(transferId, units / scale, wallet, destination, date).map(tx => ({ ...tx, assetId, createdAt }));
                holding(destination, assetId).push(...removed.map(lot => ({ ...lot, path: [...lot.path, transferId] })));
                if (random(4) === 0) {
                    const feeAsset = random(2) ? assetId : assetId === 'btc' ? 'eth' : 'btc';
                    const balance = available(wallet, feeAsset);
                    if (balance > 0) {
                        const feeUnits = 1 + random(Math.min(balance, 100));
                        legs[0].fee = { kind: 'asset', assetId: feeAsset, quantity: feeUnits / scale };
                        const feeLots = take(wallet, feeAsset, feeUnits);
                        consume(feeLots); expectedRealized -= cost(feeLots);
                    }
                }
                records.push(...legs);
            }
            const book = replayLedger(records, true);
            assert.equal(book.violation, undefined, `seed=${seed} step=${step}: ${book.violation?.message}`);
            const positions = bookPositions(book);
            for (const id of ['a', 'b', 'c']) for (const asset of ['btc', 'eth']) {
                assert.equal(positions[id]?.[asset]?.amount ?? 0, available(id, asset) / scale, `seed=${seed}, step=${step}, ${id}/${asset}`);
            }
            for (const [source, original] of originals) {
                const actualRemaining = Object.values(book.lots).flatMap(byAsset => Object.values(byAsset).flat()).filter(lot => lot.sourceTxId === source)
                    .reduce((n, lot) => n + Math.round(lot.quantity * scale), 0);
                assert.equal(actualRemaining + (consumed.get(source) ?? 0), original.units, `source ${source} seed=${seed} step=${step}`);
            }
            const reconstructed = Object.values(book.transactions);
            near(calculateRealizedPnl(reconstructed, 'EUR', {}), expectedRealized, 1e-8);
            const expectedCost = cost(Object.values(model).flatMap(byAsset => Object.values(byAsset).flat()));
            const actualCost = [...calculatePositionCostBasis(reconstructed, 'EUR', {}).values()].reduce((n, position) => n + position.costBasisVisual, 0);
            near(actualCost, expectedCost, 1e-8);
            if (records.at(-1)!.type === 'transfer' && (records.at(-2) as TransferWalletTx).fee === undefined) near(expectedCost, beforeCost, 1e-8);
            verified++;
        }
        // A persisted/reordered object must not change the future audit result.
        const shuffled = [...records].sort((x, y) => y.id.localeCompare(x.id));
        assert.deepEqual(bookPositions(replayLedger(shuffled, true)), bookPositions(replayLedger(records, true)));
    }
    assert.ok(verified >= 1000, `only ${verified} operations verified`);
});

test('multiple partial branches and returns preserve a reconstructible sale path after export/import', () => {
    const store = storeFor(fixture([funding(), purchase('original-jan', 5, 100), purchase('original-feb', 5, 200, 'a', '2025-02-01')]));
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 3, date: '2025-03-01' }));
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'c', assetId: 'btc', quantity: 4, date: '2025-03-02' }));
    store.dispatch(saveWalletTransfer({ walletId: 'c', counterpartWalletId: 'b', assetId: 'btc', quantity: 3, date: '2025-03-03' }));
    store.dispatch(saveWalletTransfer({ walletId: 'b', counterpartWalletId: 'a', assetId: 'btc', quantity: 2, date: '2025-03-04' }));
    assert.equal(store.dispatch(addWalletTransaction(sale('sale-a', 3, 300, 'a'))), true);
    const restored = hydrateState(serializeState(store.getState()));
    const book = replayLedger(Object.values(restored.walletTx), true);
    assert.equal(book.violation, undefined);
    const used = book.consumed['sale-a'];
    assert.equal(used[0].sourceTxId, 'original-jan');
    assert.equal(used[0].quantity, 2);
    assert.equal(used[1].sourceTxId, 'original-feb');
    for (const lot of used) {
        assert.ok(restored.walletTx[lot.sourceTxId]);
        for (const transferId of lot.transferIds) assert.equal(Object.values(restored.walletTx).filter(tx => tx.type === 'transfer' && tx.transferId === transferId).length, 2);
    }
    near(calculateRealizedPnl(Object.values(restored.walletTx), 'EUR', {}), 500);
});

test('a destination sale before receipt is blocked even if the incoming lot was purchased earlier', () => {
    const store = storeFor();
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 5, date: '2025-03-01' }));
    const before = store.getState().walletTx;
    assert.equal(store.dispatch(addWalletTransaction(sale('too-early', 1, 150, 'b', '2025-02-28'))), false);
    assert.deepEqual(store.getState().walletTx, before);
});

test('retiming or changing the destination cannot strand a subsequent sale', () => {
    const store = storeFor();
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 5, date: '2025-03-01' }));
    store.dispatch(addWalletTransaction(sale('sold', 5)));
    const before = store.getState(), out = txList(before).find((tx): tx is TransferWalletTx => tx.type === 'transfer' && tx.direction === 'out')!;
    for (const change of [{ date: '2025-05-01' }, { counterpartWalletId: 'c' }]) {
        assert.equal(store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 5, date: '2025-03-01', ...change }, out.transferId)), false);
        assert.deepEqual(store.getState().walletTx, before.walletTx);
    }
});

test('TWR remains neutral through complete exit, empty snapshots, and re-entry', () => {
    near(calculateTimeWeightedReturn([
        { date: '2025-01-01', value: 100 }, { date: '2025-01-02', value: 0 },
        { date: '2025-01-03', value: 0 }, { date: '2025-01-04', value: 200 }, { date: '2025-01-05', value: 220 },
    ], [{ date: '2025-01-02', amount: -100 }, { date: '2025-01-04', amount: 200 }])!, 0.1);
    assert.equal(calculateTimeWeightedReturn([{ date: 'a', value: 100 }, { date: 'b', value: Infinity }], []), null);
});

test('an asset can reach zero without losing its historical pie membership or audit records', () => {
    const store = storeFor(fixture([funding(), purchase('one', 1)]));
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 1, date: '2025-03-01' }));
    store.dispatch(addWalletTransaction(sale('all')));
    assert.equal(store.getState().assets.btc.amount, 0);
    assert.ok(store.getState().pies.p.assetIds.includes('btc'));
    assert.ok(store.getState().walletTx.one);
    const roundtrip = hydrateState(serializeState(store.getState()));
    assert.equal(replayLedger(Object.values(roundtrip.walletTx), true).consumed.all[0].sourceTxId, 'one');
});

test('strict audit replay rejects duplicate transaction IDs instead of merging their provenance', () => {
    const duplicate = purchase('same', 1);
    assert.match(replayLedger([funding(), duplicate, { ...duplicate }], true).violation!.message, /unique/i);
});

test('transaction map keys must match the acquisition IDs used by audit references', () => {
    const state = fixture();
    const transactions = { ...state.walletTx, wrongKey: purchase('different-id') };
    assert.match(deriveWalletState(state, transactions).violation!.message, /key/i);
});

test('full replay reconstructs malformed transfer snapshots from original history', () => {
    const store = storeFor();
    assert.equal(store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 2, date: '2025-03-01' })), true);
    const saved = JSON.parse(serializeState(store.getState()));
    for (const tx of Object.values(saved.walletTx) as any[]) if (tx.type === 'transfer') tx.lots = null;
    const restored = hydrateState(JSON.stringify(saved));
    const book = replayLedger(Object.values(restored.walletTx), true);
    assert.equal(book.violation, undefined);
    assert.equal(book.lots.b.btc[0].sourceTxId, 'buy');
    assert.equal(book.lots.b.btc[0].quantity, 2);
});

test('malformed cached allocations without source history do not invent available lots', () => {
    const incoming = { ...pair('missing')[1], lots: [{ sourceTxId: 'fake', quantity: 1 }] } as any;
    assert.doesNotThrow(() => replayLedger([incoming]));
    assert.equal(bookPositions(replayLedger([incoming])).b?.btc, undefined);
    assert.ok(replayLedger([incoming], true).violation);
});

test('cross-currency acquisition fees contribute to quote average at the original FX rate', () => {
    const buy = purchase('fees-fx', 2, 100);
    if (buy.type !== 'buy') return;
    buy.fees = { value: 10, currency: 'USD' }; buy.fxPair = 'USD/EUR'; buy.fxRate = 0.8;
    const store = storeFor(fixture([funding(), funding('usd-fee-cash', 'a', 'USD'), buy]));
    assert.equal(store.getState().walletPositions.a.btc.avgCost.value, 104);
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 1, date: '2025-03-01' }));
    const fx = calculatePositionCostBasisFx(txList(store.getState()), 'GBP', { USD: 0.7, EUR: 0.875 });
    near(fx.get('btc')!.costBasisQuote, 208);
    near(fx.get('btc')!.costBasisBase, 182);
    assert.equal(store.getState().assets.btc.avgCost.value, 104);
});

test('exactly funded decimal trades do not fail due to binary multiplication dust', () => {
    const deposit = { ...funding(), amount: { value: 0.02, currency: 'EUR' as const } };
    const state = fixture([deposit, purchase('decimal-buy', 0.1, 0.2)]);
    assert.equal(state.wallets.a.cash[0].value, 0);
    const txs = txList(state);
    const history = buildNetWorthHistory({ transactions: txs, forexRates: {}, baseCurrency: 'EUR', includeHoldings: false });
    assert.equal(history.at(-1)!.value, 0);
});

test('a different quote currency cannot silently contaminate the same open asset average', () => {
    const store = storeFor(fixture([funding(), funding('fund-usd', 'a', 'USD'), purchase('eur-buy', 1, 100)]));
    const before = store.getState().walletTx;
    const usdBuy = { ...purchase('usd-buy', 1, 100), price: { value: 100, currency: 'USD' } } as WalletTx;
    assert.equal(store.dispatch(addWalletTransaction(usdBuy)), false);
    assert.deepEqual(store.getState().walletTx, before);
});

test('asset fees reduce total equity and total PnL by market value without a fictitious sale', () => {
    const store = storeFor();
    const before = txList(store.getState());
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 2, date: '2025-03-01', fee: { kind: 'asset', assetId: 'btc', quantity: 0.1 } }));
    const after = txList(store.getState());
    const totalPnl = (txs: WalletTx[]) => {
        const basis = calculatePositionCostBasis(txs, 'EUR', {}).get('btc')!;
        return basis.amount * 150 - basis.costBasisVisual + calculateRealizedPnl(txs, 'EUR', {});
    };
    near(totalPnl(after) - totalPnl(before), -15);
    const history = (transactions: WalletTx[]) => buildNetWorthHistory({ transactions, forexRates: {}, baseCurrency: 'EUR', getAssetPrice: () => 150, snapshotDates: ['2025-03-01'] })[0].value;
    near(history(after) - history(before), -15);
    assert.equal(after.some(tx => tx.type === 'sell'), false);
});

test('all wallet histories sum to global history with market prices and cash/asset fees', () => {
    const store = storeFor(fixture([funding(), funding('fund-b', 'b'), purchase('a-buy', 10, 100), purchase('b-buy', 2, 200, 'b', '2025-02-01')]));
    store.dispatch(saveWalletTransfer({ walletId: 'a', counterpartWalletId: 'b', assetId: 'btc', quantity: 2, date: '2025-03-01', fee: { kind: 'cash', amount: { value: 3, currency: 'EUR' } } }));
    store.dispatch(saveWalletTransfer({ walletId: 'b', counterpartWalletId: 'c', assetId: 'btc', quantity: 1, date: '2025-03-02', fee: { kind: 'asset', assetId: 'btc', quantity: 0.05 } }));
    const options = { forexRates: {}, baseCurrency: 'EUR', getAssetPrice: (_: string, date: string) => date < '2025-03-01' ? 200 : 250, snapshotDates: ['2025-02-28', '2025-03-01', '2025-03-02', '2025-04-01'] };
    const global = buildNetWorthHistory({ ...options, transactions: txList(store.getState()) });
    const local = ['a', 'b', 'c'].map(id => buildNetWorthHistory({ ...options, transactions: txList(store.getState(), id) }));
    global.forEach((point, i) => near(point.value, local.reduce((sum, series) => sum + series[i].value, 0), 0.01));
    const flows = txList(store.getState()).filter(tx => tx.type === 'transfer').map(tx => getWalletExternalFlow(tx, 'EUR', {}, undefined, { [tx.id]: { value: tx.type === 'transfer' ? tx.quantity * 250 : 0, currency: 'EUR' } }));
    near(flows.reduce((sum, value) => sum + value, 0), 0);
});

test('decimal sale proceeds can be converted completely without phantom cash deficits', () => {
    const store = storeFor(fixture([funding(), purchase('tiny-sale-buy', 0.1, 0.2)]));
    assert.equal(store.dispatch(addWalletTransaction(sale('tiny-sale', 0.1, 0.2, 'a'))), true);
    assert.equal(store.dispatch(addWalletTransaction({ ...meta('convert-proceeds', 'a', '2025-04-02'), type: 'forex', from: { value: 0.02, currency: 'EUR' }, to: { value: 0.03, currency: 'USD' } })), true);
    assert.equal(store.getState().wallets.a.cash.find(money => money.currency === 'EUR')!.value, 99999.98);
});
