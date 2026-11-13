# Transfer validation and future audit readiness

The regression suite contains 58 tests. Run `npm test` from the repository root.
Tests execute real Redux thunks, ledger replay, history/statistics functions, and
JSON export/import. The deterministic model test uses 40 seeds and checks more
than 1,000 operations against a separate integer-unit reference model across
three wallets and two assets.

## Verified invariants

- A fee-free internal movement preserves global units, remaining original cost,
  average acquisition price, realized/unrealized PnL and pie membership. One asset
  held in several wallets remains one aggregated asset.
- Wallet histories sum to the account history when given the same market prices.
  Outgoing and incoming transfer flows cancel globally. Transfer fees reduce
  equity and total investment PnL; no sale is fabricated.
- Partial transfers take the oldest available original acquisitions. Destination
  sales use original acquisition order, including older transferred purchases
  received after newer local purchases. A sale cannot consume a transfer that
  has not arrived yet.
- Partial branches, onward movements and returns retain original purchase IDs,
  quantities, dates, costs, fees, FX and the movement path. Remaining units plus
  units consumed by sales/fees equal each original purchase quantity.
- Editing, retiming, redirecting or deleting history replays subsequent activity.
  Any resulting deficit rejects the entire ledger mutation. Transfer pairs are
  committed together.
- Export/import reconstructs allocations from original records, including stale
  or malformed allocation caches when complete source history exists. Reordered
  JSON records produce the same lot balances. Missing sources, duplicate IDs,
  mismatched record keys and inconsistent pairs cannot pass strict replay.

## Defects found and corrected

- Transfer leg ordering could interleave unrelated records. Stable event ordering
  keeps each pair together; a persisted sequence resolves same-millisecond ties.
- Quantity addition rounded to 15 significant digits, and a deficit tolerance
  allowed tiny unfunded movements. Decimal arithmetic now retains the canonical
  stored digits and strict validation rejects any unresolved deficit.
- Cash history and ledger could disagree around fractional cents. Both now use
  the same decimal addition and multiplication, preserving recorded precision
  until display formatting.
- TWR ignored flows falling between chart snapshots. It now includes all flows
  within each interval and guards non-finite results and empty intervals.
- A stored FX rate could be applied to an unrelated display currency. Original
  FX is now matched to its pair; acquisition-date lookup is used for other
  conversions. Cost calculations consistently receive historical rates in wallet,
  home, statistics and pie views. Original cross-currency fees also enter the
  quote-cost calculation where convertible.
- Invalid dates, rates, overflowing trade values and unsupported input kinds now
  fail validation. Mixing open quote currencies for the same asset is blocked
  rather than producing a meaningless average.

## What a future tax audit still needs

This is a record-integrity and statistics test suite, not a tax-rules engine.
A future audit must replay the **complete account ledger in strict mode**, then
select the wallet/entity being audited. Cached incoming allocations support
partial UI views; they are not independent proof when source history is missing.
Original exchange records must remain available for reconciliation.

Current transaction dates have day precision. For operations on the same day,
creation time, persisted sequence and stable IDs provide deterministic application
order. An exchange import must retain the actual execution timestamp/order and
external references if an audit requires the true intraday sequence. App entry
order alone cannot establish that exchange sequence retrospectively.

Persistence still stores JavaScript numbers. Arithmetic avoids unnecessary
rounding of their canonical decimal representations, but cannot recover digits
already lost when an external decimal value was parsed as a number. Arbitrary
precision import/audit should retain decimal strings or integer units and use
exact arithmetic, including fee allocation.

Missing historical FX/prices still use the app's existing fallbacks for statistics.
A tax report must identify missing evidence and request authoritative historical
values instead of treating those fallbacks as validated fiscal amounts. TWR uses
available snapshots and interval flows; exact intraday returns require valuations
at each flow. Fee tax classifications and entity-level fiscal policies remain for
the future audit implementation.
