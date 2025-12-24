# Prosperitas Architecture & Requirements Summary

This document consolidates the app concepts, requirements, UI flows, calculation rules, and the proposed architecture. It distinguishes what exists today vs. what is planned.

---

## 1) App Overview

- Purpose: Premium financial tracker for net worth, portfolios, and monthly balance management.
- Current stack: React 19 + TypeScript + Vite + React Router (HashRouter) + Tailwind via CDN.
- Current data: Mock-only, no backend; no persistence yet.
- Routing (current): `#/`, `#/balance`, `#/wallets`, `#/wallets/:id`, `#/pies`, `#/pies/:id`, `#/statistics`, `#/help`, `#/settings`.
- Styling: Dark UI aesthetic with design tokens loaded via CDN in `index.html`.

---

## 2) Functional Requirements by View

### Header View
- Real-time net-worth.
- Real-time EUR/USD and BTC/EUR.
- Define default display currency (EUR initially).

### Balance Management (Balance View)
- Shows monthly money flow with visible inputs to add expenses and incomes.

Inputs
- Set default balance currency to EUR.
- Add expense/income with associated category.
- Month switcher (focus on current month).
- Manage categories: add, edit, remove (+ category color).

Info
- List of latest transactions (expandable).
- Spend per category.
- Metrics: expense, gross savings, net savings (after transfers to wallets = remaining in checking).
- Extra: optional flow chart.

Implementation Notes
- All inputs create new entries in the database, respecting schema.
- All relevant information should be queried from the database and processed.

### Wallet View
- Shows wallets; each wallet corresponds to a bank/broker, with inputs to add transactions.

Inputs
- Create wallet (properties: name, description).
- Transfer money back to balance (appears as income entry in balance).
- Add FX operation (currency exchange):
  - Origin currency, destination currency, exchange rate, fees.
  - Result: decrement one currency holdings, increment the other.
- Add buy/sell operation:
  - Type: stock / ETF / crypto.
  - Ticker.
  - Operation: BUY / SELL.
  - Select corresponding Pie from pre-created list if no holding exists (BUY only).
  - Price and stock currency.
  - FX rate and pair.
  - Unit amount, date (default today), optional time.
  - Fees (deduct at the end when adding to holdings).
  - Tax.
  - Show value in stock currency (units × price) and in FX pair currency (stock value × fx rate).
  - Optional for SELL: profit for the sale (cohesion with broker). Default: units sold × sell price × fx_sell − units sold × cost average (in display currency).
- Add dividend or interest:
  - Type: dividend / interest.
  - If dividend: ticker.
  - Currency.
  - Tax.

Info
- Sidebar shows wallet list (clickable).
- Selected wallet shows:
  - Cash in FIAT (for all FIAT buckets the wallet has).
  - Chronological transaction list (buy/sell/FX/in-out balance) with all captured input data.
  - Current holdings:
    - For each holding: ticker + asset name | unit amount | cost average (holding currency) | cost average in display currency | current price (holding currency) | current value (holding currency) | current value (display currency at today’s FX) | % change in holding currency (ratio of current price to cost average + absolute value) | % change in display currency (ratio) | allocation %.
  - Total invested (in EUR — standard currency).
  - Current value & % change (absolute and percentage).
  - Profit/loss (PnL) absolute and percentage.
  - Pie chart of holdings.
  - Growth chart over time (absolute wallet value) + baseline of deposits vs. S&P 500 performance.

Implementation Notes
- All inputs create new entries in the database per schema.
- All info is queried from the database and processed.
- Any value depending on current prices (stock or FX) must read from the prices table in the database. If an FX price exists on the transaction, prefer it (cohesion with broker).
- Cost average in display currency: convert amounts and compute average; store on holding and update frequently.
- % change in display currency: if stock in USD and display currency CHF, use USDCHF of transaction dates to compute equivalent CHF, sum buys, subtract sells, and compare to current CHF value (USDCHF today). Alternative: use cost average.
- Allocation: current display-currency value of holding divided by total of all holdings’ current display-currency values in the wallet.
- Total invested example: 2×AMD at 100 USD + 1×INTC at 200 USD; display CHF. Invested = 2×100×USDCHF(on buy date) + 1×200×USDCHF(on buy date). If USDCHF=0.8 ⇒ 320 CHF.
- Current value: sum of all holdings’ current values in display currency. % change = current value / total invested − 1.
- PnL: sum realized gains/losses from all SELL transactions.

### Pie View
- Reorganizes holdings differently than wallets; transactions are added only in wallets.

Inputs
- Create pie (properties: name, description, risk 1-5).

Info
- Sidebar shows pie list (clickable).
- Selected pie shows:
  - Chronological list of transactions (buy/sell).
  - Current holdings (same schema as wallet view).
  - Total invested, current value, PnL (absolute and %).
  - Pie chart of holdings by value.
  - Growth chart over time + baseline deposits vs. S&P 500.

### General Statistics
- Pie charts per asset type (stock, BTC, alts, ETFs, cash-like).
- Total invested.
- Current portfolio value.

---

## 3) Non-Functional Requirements
- Transactions are independent, always associated to one wallet; optionally associated to one pie (only one).
- Holdings must be tracked for all assets and rendered either in wallet or pie views.
- System collects all tickers used (stocks/crypto) to build a real-time price table for current value calculations.
- Mobile-first design for all views.
- A standard base currency is defined (initially EUR) and used as the canonical valuation currency. Changing mid-life may have implications; needs strategy.

---

## 4) UI & Flows (Mockup Summary)

Navigation (Lateral Menu)
- Home, Balance, Wallets (Coinbase, Binance, Trading212), Pies, Statistics, Display Currency Selector (EUR/USD/GBP/CHF), Help, Settings.

Home
- Add Balance Transaction: Expense/Income/Transfer — Category — Amount.
- Transfer specifics: Wallet — Amount — Currency (default: display currency).

Balance
- Month switcher.
- Manage Categories modal (Add/Edit/Remove: Name, Color).
- Add Balance Transaction (same as above).
- Monthly Balance Transactions (expandable).
- Bar Chart: category spending/income.
- Relevant stats: savings (income − spending) and % vs. monthly average; savings after transfers.

Wallets
- Add Wallet modal (name, description).
- Cards list to select/enter a wallet.

Wallet (detail)
- Transfer back to balance input (hidden behind button).
- Cash buckets (e.g., 100 USD, 130 EUR, 639.34 CHF).
- Stats: Total invested, Current value, % change, PnL.
- Add FX Operation modal (origin currency, destination currency, rate, fees).
- Add Operation modal (stock/ETF/crypto): ticker, Buy/Sell, select pie, price+currency, FX pair+rate, units, date, fees, tax.
- Add Dividend/Interest modal: type, ticker if dividend, currency, tax.
- Pie chart of holdings.
- Current Holdings table: ticker | units | DCA | DCA in display currency | current price | current value | current value in display currency | % change | allocation.
- Transaction list.

Pies
- Add Pie modal (name, description, risk 1-5).
- Pie list (selectable), showing value, % change, risk, name.

Pie (detail)
- Stats (same as wallet): total invested, current value, % change, PnL.
- Current holdings (same component as wallet).
- Pie chart of holdings.
- Chart: growth value + baseline total invested over time vs. S&P 500 performance.

General Statistics
- Various pie charts by asset type.
- Total invested.
- Portfolio current value.

---

## 5) Data Model & Entities (Planned)

Schema Types (`src/core/schema-types/`)
These types define the Redux store structure and match `data-schema.json`. The app state is normalized with entities stored as `Record<id, Entity>` for fast lookup.

Core Types
- `Currency`: `'EUR' | 'USD'` (extensible to GBP, CHF, etc.)
- `Money`: `{ value: number, currency: Currency }`
- `CategoryType`: `'income' | 'expense'`
- `AssetType`: `'stock' | 'etf' | 'crypto' | 'bond' | 'cash' | 'other'`

State Structure
```typescript
ProsperitasState {
  schemaVersion: string
  meta: Meta                                    // createdAt, updatedAt
  settings: Settings                            // currencies, locale, timezone, number format
  account: Account                              // name
  categories: Record<id, Category>              // income/expense categories with colors
  balance: Record<month, BalanceMonth>          // monthly transactions (YYYY-MM → { month, txs[] })
  assets: Record<id, Asset>                     // ticker, exchange, tradingCurrency, assetType, amount, avgCost, txIds
  wallets: Record<id, Wallet>                   // name, description, cash: Record<Currency, number>, txIds
  walletPositions: Record<walletId, Record<assetId, WalletPosition>>  // amount, avgCost
  walletTx: Record<id, WalletTx>                // deposit/withdraw/forex/buy/sell transactions
  pies: Record<id, Pie>                         // name, assetIds, description, risk
}
```

Key Relationships
- `Transaction` → `categoryId` references `categories[id]`
- `WalletTx` → `walletId` references `wallets[id]`, `assetId` references `assets[id]`, optional `pieId` references `pies[id]`
- `Asset` → `txIds[]` references `walletTx[id]`
- `Wallet` → `txIds[]` references `walletTx[id]`
- `Wallet.cash`: Record of currency balances (e.g., `{ EUR: 1000, USD: 500 }`)

Transaction Types
- Balance: income/expense/transfer with category, amount (Money), date
- Wallet: deposit/withdraw/forex/buy/sell with amounts (Money), optional fees/tax, no notes field
- All wallet transactions include `walletId`, `date`, `createdAt`, optional `pieId`

---

## 6) Calculation Rules (Key)
- Display currency: all valuation normalized to base/display currency; prioritize transaction FX for cohesion, otherwise use live/historical FX.
- DCA (cost average): maintain in holding currency and display currency; update after each transaction.
- Total invested: sum of buy values converted to display currency at transaction date FX.
- Current value: sum of holdings’ current values converted to display currency using today’s FX and prices.
- % change: `(current_value / total_invested) − 1`.
- Allocation: `holding_current_value_display / total_current_value_display`.
- PnL (realized): sum of realized profits/losses from SELL operations, adjusted for FX and fees/taxes.

---

## 7) Architecture (Current vs Planned)

Current Implementation
- Hash-based routing via React Router.
- Components and pages under `/components`, `/pages`, `/ui`.
- Tailwind via CDN; no PostCSS or config.
- Mock data only; no persistence.

Proposed Modular Architecture (future state)
```
src/
  core/                # Domain logic (no IO/React)
    schema-types/      # Redux state types matching data-schema.json
                       # Normalized structure: Record<id, Entity> for all slices
    finance/           # Pure calculations: getCurrentValue, getPnL, getAllocation, etc.

  data/                # IO: API + cache + IndexedDB
    api/               # priceApi.ts, fxApi.ts
    cache/             # priceCache.ts, fxCache.ts
    db/                # indexedDb.ts
    prices.ts          # Unified price module (live/historical, fx)

  store/               # Redux Toolkit + persist
    slices/            # balance, assets, wallets, walletPositions, walletTx, pies, settings
    selectors/         # priceSelectors, financeSelectors (use core/finance)
    index.ts           # configureStore + persist config

  hooks/               # React-friendly facade over store/data/core
    usePrices.ts, useHoldings.ts, useTransactions.ts,
    useSettings.ts, usePortfolioSummary.ts,
    usePriceHistory.ts, useClosedPositionGain.ts

  components/          # Reusable UI pieces (tables, charts, forms)
  pages/               # Screens composed from hooks + components
  utils/               # date, format, export/import utilities
```

Key Points
- `core/schema-types/`: TypeScript types mirror `data-schema.json`; normalized Records for fast lookup
- `core/finance/`: Pure functions operating on typed state
- `data/`: External data sources and caching
- `store/`: Redux state following schema structure
- Relationships tracked via IDs (e.g., `walletTx.walletId` → `wallets[id]`)

Responsibilities
- `core`: pure calculations and types.
- `data`: external IO and caching (live/historical prices, FX).
- `store`: reactive state for app entities; live prices only.
- `hooks`: single entry for UI to read/update state and fetch data.
- `components/pages`: UI composition.
- `utils`: generic helpers (formatting, date, import/export).

## Type File Guidelines

When to create a dedicated `*.ts` types file and where to put it. Follow these rules so future contributors keep the codebase consistent and avoid unnecessary files.

- **Central schema (required):** keep the Redux/data schema in `src/core/schema-types/index.ts`. This file defines the canonical store slices (entities, Records, relationships) and matches `data-schema.json`.
- **Create domain type files only when reused:** add a `core/<domain>/types.ts` (for example `core/finance/types.ts`) only when two or more modules need the same domain shapes or when the domain contains pure logic (calculations, selectors) that operates on shared types.
- **API response types:** put provider/API response types in `src/data/api/types.ts` only when multiple data modules or caches consume the same provider responses.
- **UI types:** colocate small UI-specific types with the component or in `src/ui/types.ts` when multiple UI components share them. Do NOT create UI type files for single-component-only shapes.
- **Page-level types:** create `src/pages/<page>/types.ts` only when the page exposes shared payloads or props used by child components (e.g., `AddTransactionPayload`). Otherwise keep interfaces local to the page component.
- **Prefer inline types for one-off shapes:** if a shape is used only in one function or component, prefer an inline type or anonymous interface — avoid creating a file for single-use shapes.
- **Use `Record` for normalized entities:** store entities as `Record<string, Entity>` in the schema-types for fast lookup and serializability (this is already applied across the schema).
- **Barrels (optional):** add `index.ts` barrels only for folders that are actually reused by multiple modules to keep imports tidy; avoid barrels for very small or single-file folders.
- **Naming:** suffix domain files with `types.ts` (e.g., `finance/types.ts`, `api/types.ts`) when they hold only types; if they also hold pure helpers, put them in a `core/finance` module alongside `types.ts`.

Checklist before adding a new types file:
- Is the shape used in 2+ consumers? If yes, extract.
- Is it a public boundary (store slice, API contract, component prop)? If yes, extract.
- Will the shape evolve independently (API changes, domain complexity)? If yes, extract.
- Otherwise: keep it inline or colocated.


---

## 8) Styling System
- Tailwind via CDN (no PostCSS or tailwind.config.js).
- Design tokens in `index.html`:
  - `bg-app-bg`, `bg-app-card`, `border-app-border`.
  - Primary, accent, success, danger colors.
- Use `Card` and `Button` components; consistent spacing/typography; interactive states.

---

## 9) Prices & FX Strategy
- Live prices: unified module (`data/prices.ts`) aggregating APIs + cache.
- Historical prices/FX: cached (IndexedDB) and fetched on demand.
- Priority: use FX rate saved on transaction if present; otherwise fallback to live/historical.

---

## 10) Mobile-First & Navigation
- Fixed sidebar on desktop; slide-out on mobile.
- All pages accept `onMenuClick` for mobile menu toggle.

---

## 11) Open Questions / Considerations
- Changing the standard currency mid-life: migration and recalculation strategy.
- Performance considerations for historical FX conversions and DCA recomputation.
- Scope of persistence: when to introduce IndexedDB and which slices to persist.
- Price sources and update cadence; rate limiting and caching policies.

---

## 12) Implementation Notes
- In early stages, mock-only; later, introduce `data/` + `store/` layers.
- All input forms should write to the store (persisted when available) and update `holdings` accordingly.
- Views render by combining `selectors` + pure `core/finance` functions.
