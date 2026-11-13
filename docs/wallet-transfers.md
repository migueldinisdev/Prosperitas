# Internal wallet transfers (schema 0.3)

Deposit and withdrawal forms and transaction shapes remain unchanged. Transfers
move existing assets between wallets; they do not create purchases, sales or
account-level external contributions. No tax calculation or filing is implemented.

## Stored records and audit trail

One transfer is represented by two `TransferWalletTx` entries sharing a stable
`transferId`: an `out` entry in the source wallet and an `in` entry in the destination.
The counterpart wallet IDs, asset, quantity, date, creation time and optional
sequence must match.
Both entries are validated and committed in one `walletLedger/apply` Redux action.
Editing or removing either entry updates both.

`quantity` means the quantity **received**. An optional fee is charged **in addition**
in the source wallet, either as cash or units of an existing asset. Thus, receiving
99.9 LINK with a 0.1 LINK fee debits 100 LINK from the source. A reference field can
retain an exchange transaction ID or blockchain hash.

Each transfer's `lots` records the exact portions of original purchases selected
by FIFO in its source wallet. A portion retains `sourceTxId`, original date and
creation time, price, per-unit purchase fees, transaction FX and all prior
`transferIds`. Received holdings append the current transfer ID to their path.
`feeLots` identifies the lots consumed by asset-denominated fees. These are audit
references, not new acquisitions or taxable-disposal classifications.

The complete chronological ledger is replayed before every mutation. Cached lot
allocations are reconstructed, including those in subsequent transfers, so editing
an earlier purchase cannot leave stale cost references. A change is rejected if a
later sale, fee or transfer would lack holdings/cash. Transactions sort by operation
date, creation time, persisted sequence and stable event ID, with the outgoing leg
immediately preceding its incoming counterpart. Sequence disambiguates operations
created in the same millisecond. Original purchase ordering is retained after transfers.

## Cost and statistics

Every wallet has an independent FIFO lot book. Aggregate cost is the sum of the
remaining lot costs in those books, grouped by the existing asset ID. The same LINK
asset remains one asset in pies, regardless of how many wallets hold it. Displayed
average cost is remaining original cost divided by remaining quantity, including
purchase fees where convertible. Entry FX travels with original purchase lots.
An original transaction FX rate is used only for its own currency pair. Other
display currencies use acquisition-date rates, with the existing live-rate fallback
when historical rates are unavailable. Cross-currency fees are included in quote
cost where their original conversion is known. Open lots of one asset cannot mix
quote currencies, because summing those costs into one average would be invalid.

A fee-free transfer preserves aggregate units, cost, average cost, market value,
realized/unrealized PnL and pie membership. It never records realized transfer
profit. Fees are recorded separately; asset fee units reduce holdings and their
removed cost is included in the expense calculation, without inventing a sale.

Individual-wallet return calculations neutralize transfers using market value on
the movement date. The history price service requests those dates even between
chart ticks. If a historical quote is unavailable, the existing acquisition-price
fallback applies. This valuation is internal and does not reset acquisition cost.
When both wallets are selected, matching flows cancel. Account net contributions
therefore remain unchanged.

## Compatibility and missing history

Schema 0.3 adds the transfer variant without new required top-level state keys.
Imports, IndexedDB hydration and direct state loads rebuild derived FIFO holdings
from existing transactions. Cash transaction records retain their original shape.
Files with incomplete purchase history preserve their saved balances/holdings and
block ledger mutations with an explanation until the missing history is restored.
The app never fabricates a purchase to reconcile an unexplained position.

FIFO for partial transfer allocation is an application policy. A future tax audit
can inspect and validate that policy and trace every quantity to its original
acquisition; this feature does not assert or implement tax rules.

## Verification

`npm test` bundles the TypeScript test entry to a temporary directory and runs the
Node test runner. `npx tsc --noEmit` checks types; `npm run build` produces the app.
Regression tests cover FIFO per wallet, partial/full/successive transfers,
destination sales, atomic mutations and dependent-operation rejection, fees,
crypto precision, original FX/fees, pie conservation, histories and persistence.
