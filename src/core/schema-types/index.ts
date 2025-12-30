/**
 * Schema Types
 * 
 * These types define the Redux store structure and match data-schema.json.
 * The app state is normalized with entities stored as Records keyed by ID.
 * 
 * Structure:
 * - State slices: balance, assets, wallets, walletPositions, walletTx, pies
 * - Each slice uses Record<id, Entity> for fast lookup
 * - Relationships tracked via IDs (e.g., walletTx.walletId → wallets[id])
 */

// ! IMPORTANT: ANY CHANGE TO THESE `schema-types` WILL AFFECT THE SERIALIZED
// !  DATA SCHEMA (e.g. saved store files) and how Redux state is structured.
// ! Changing types here requires a migration plan for persisted data.


export type Currency = 'EUR' | 'USD';

export interface Money {
    value: number;
    currency: Currency;
}

export interface NumberFormatSettings {
    useGrouping: boolean;
    maxFractionDigits: number;
}

export interface Settings {
    balanceCurrency: Currency;
    visualCurrency: Currency;
    locale: string;
    timezone: string;
    numberFormat: NumberFormatSettings;
}

export interface Meta {
    createdAt: string;
    updatedAt: string;
}

export interface Account {
    name: string;
}

export type CategoryType = "income" | "expense";

export interface Category {
    id: string;
    name: string;
    type: CategoryType;
    color: string;
}

export interface BalanceTransaction {
    date: string;
    type: CategoryType | "transfer";
    categoryId: string;
    amount: Money;
    description?: string;
    createdAt: string;
}

export interface BalanceMonth {
    month: string;
    txs: BalanceTransaction[];
}

export type BalanceState = Record<string, BalanceMonth>;

export type AssetType =
    | "stock"
    | "etf"
    | "crypto"
    | "bond"
    | "cash"
    | "other";

export interface Asset {
    id: string;
    ticker: string;
    exchange: string | null;
    tradingCurrency: Currency;
    name: string;
    assetType: AssetType;
    decimals: number;
    amount: number;
    avgCost: Money;
    txIds: string[];
    createdAt: string;
    updatedAt: string;
}

export type AssetsState = Record<string, Asset>;



export interface Wallet {
    id: string;
    name: string;
    description?: string;
    /**
     * Cash balances as a list of Money entries. Use `Money.value` to hold
     * the amount (major units) and `Money.currency` for the 3-char currency.
     * Example: [{ value: 1000, currency: 'EUR' }, { value: 500, currency: 'USD' }]
     */
    cash: Money[];
    txIds: string[];
}

export type WalletsState = Record<string, Wallet>;

export interface WalletPosition {
    amount: number;
    avgCost: Money;
}

export type WalletPositionsState = Record<string, Record<string, WalletPosition>>;

export interface WalletTxBase {
    id: string;
    walletId: string;
    date: string;
    createdAt: string;
    pieId?: string;
}

export interface DepositWalletTx extends WalletTxBase {
    type: "deposit";
    amount: Money;
}

export interface WithdrawWalletTx extends WalletTxBase {
    type: "withdraw";
    amount: Money;
}

export interface ForexWalletTx extends WalletTxBase {
    type: "forex";
    from: Money;
    to: Money;
    fees?: Money;
    fxRate?: number;
}

export interface BuyWalletTx extends WalletTxBase {
    type: "buy";
    assetId: string;
    quantity: number;
    price: Money;
    fxPair?: string;
    fxRate?: number;
    fees?: Money;
}

export interface SellWalletTx extends WalletTxBase {
    type: "sell";
    assetId: string;
    quantity: number;
    price: Money;
    fxPair?: string;
    fxRate?: number;
    fees?: Money;
}

export interface DividendWalletTx extends WalletTxBase {
    type: "dividend";
    amount: Money;
    assetId?: string;
}

export type WalletTx =
    | DepositWalletTx
    | WithdrawWalletTx
    | ForexWalletTx
    | BuyWalletTx
    | SellWalletTx
    | DividendWalletTx;

export type WalletTxState = Record<string, WalletTx>;

export type NotificationType = "info" | "warning" | "error" | "success";

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    title?: string;
    createdAt: string;
    timeout?: number;
}

export type NotificationPayload = Omit<Notification, "id" | "createdAt">;

export type NotificationState = Notification[];

export interface Pie {
    id: string;
    name: string;
    assetIds: string[];
    description?: string;
    risk?: number;
}

export type PiesState = Record<string, Pie>;

export interface ProsperitasState {
    schemaVersion: string;
    meta: Meta;
    settings: Settings;
    account: Account;
    categories: Record<string, Category>;
    balance: BalanceState;
    assets: AssetsState;
    wallets: WalletsState;
    walletPositions: WalletPositionsState;
    walletTx: WalletTxState;
    pies: PiesState;
    notifications: NotificationState;
}

export type RootState = ProsperitasState;
