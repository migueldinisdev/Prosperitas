export interface Money {
    value: number;
    currency: string;
}

export interface NumberFormatSettings {
    useGrouping: boolean;
    maxFractionDigits: number;
}

export interface Settings {
    balanceCurrency: string;
    visualCurrency: string;
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
    tradingCurrency: string;
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
    cash: Record<string, number>;
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
    notes?: string;
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
}

export interface BuyWalletTx extends WalletTxBase {
    type: "buy";
    assetId: string;
    quantity: number;
    price: Money;
    fees?: Money;
    tax?: Money;
}

export interface SellWalletTx extends WalletTxBase {
    type: "sell";
    assetId: string;
    quantity: number;
    price: Money;
    fees?: Money;
    tax?: Money;
}

export type WalletTx =
    | DepositWalletTx
    | WithdrawWalletTx
    | ForexWalletTx
    | BuyWalletTx
    | SellWalletTx;

export type WalletTxState = Record<string, WalletTx>;

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
}

export type RootState = ProsperitasState;
