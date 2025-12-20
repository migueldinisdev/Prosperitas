export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
  CHF = 'CHF'
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense' | 'transfer';
}

export interface Wallet {
  id: string;
  name: string;
  platform: 'Coinbase' | 'Binance' | 'Trading212' | 'Kraken' | 'Bank';
  balance: number;
  invested: number;
  currency: Currency;
  pnl: number;
  pnlPercent: number;
}

export interface Pie {
  id: string;
  name: string;
  description: string;
  riskScore: number; // 1-5
  value: number;
  growth: number;
}

export interface Asset {
  ticker: string;
  name: string;
  amount: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  allocation: number;
}
