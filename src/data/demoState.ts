import { CURRENT_SCHEMA_VERSION } from "../store/initialState";
import {
    BalanceState,
    BalanceTransaction,
    Category,
    PersistedState,
    WalletTx,
} from "../core/schema-types";

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatMonth = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = pad2(date.getUTCMonth() + 1);
    return `${year}-${month}`;
};

const formatDate = (year: number, monthIndex: number, day: number) =>
    `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

const createIsoTimestamp = (year: number, monthIndex: number, day: number) =>
    new Date(Date.UTC(year, monthIndex, day, 12, 0, 0)).toISOString();

const randomBetween = (min: number, max: number) =>
    Math.round((min + Math.random() * (max - min)) * 100) / 100;

const daysInMonth = (year: number, monthIndex: number) =>
    new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const randomDay = (
    year: number,
    monthIndex: number,
    minDay: number,
    maxDay: number
) => {
    const lastDay = daysInMonth(year, monthIndex);
    const safeMin = Math.min(minDay, lastDay);
    const safeMax = Math.min(maxDay, lastDay);
    return (
        Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
    );
};

const createBalanceTx = (
    year: number,
    monthIndex: number,
    day: number,
    type: "income" | "expense",
    categoryId: string,
    amountValue: number,
    description: string
): BalanceTransaction => {
    const date = formatDate(year, monthIndex, day);
    return {
        date,
        type,
        categoryId,
        amount: { value: amountValue, currency: "EUR" },
        description,
        createdAt: createIsoTimestamp(year, monthIndex, day),
    };
};

const buildBalanceForMonth = (
    year: number,
    monthIndex: number
): BalanceTransaction[] => {
    const salaryDay = Math.min(25, daysInMonth(year, monthIndex));
    const rentDay = Math.min(2, daysInMonth(year, monthIndex));

    const txs = [
        createBalanceTx(
            year,
            monthIndex,
            salaryDay,
            "income",
            "cat_salary",
            randomBetween(3800, 4600),
            "Monthly salary"
        ),
        createBalanceTx(
            year,
            monthIndex,
            randomDay(year, monthIndex, 8, 18),
            "income",
            "cat_freelance",
            randomBetween(450, 900),
            "Freelance project"
        ),
        createBalanceTx(
            year,
            monthIndex,
            rentDay,
            "expense",
            "cat_rent",
            randomBetween(1200, 1500),
            "Rent"
        ),
        createBalanceTx(
            year,
            monthIndex,
            randomDay(year, monthIndex, 5, 22),
            "expense",
            "cat_groceries",
            randomBetween(160, 320),
            "Groceries"
        ),
        createBalanceTx(
            year,
            monthIndex,
            randomDay(year, monthIndex, 9, 24),
            "expense",
            "cat_utilities",
            randomBetween(90, 180),
            "Utilities"
        ),
        createBalanceTx(
            year,
            monthIndex,
            randomDay(year, monthIndex, 7, 20),
            "expense",
            "cat_transport",
            randomBetween(40, 110),
            "Transport pass"
        ),
        createBalanceTx(
            year,
            monthIndex,
            randomDay(year, monthIndex, 12, 26),
            "expense",
            "cat_dining",
            randomBetween(60, 180),
            "Dining out"
        ),
        createBalanceTx(
            year,
            monthIndex,
            randomDay(year, monthIndex, 3, 16),
            "expense",
            "cat_subscriptions",
            randomBetween(18, 45),
            "Subscriptions"
        ),
    ];

    return txs.sort((a, b) => a.date.localeCompare(b.date));
};

const buildBalanceState = (referenceDate: Date): BalanceState => {
    const currentMonthKey = formatMonth(referenceDate);
    const previousMonthDate = new Date(
        Date.UTC(
            referenceDate.getUTCFullYear(),
            referenceDate.getUTCMonth() - 1,
            1
        )
    );
    const previousMonthKey = formatMonth(previousMonthDate);

    const currentMonthTxs = buildBalanceForMonth(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth()
    );
    const previousMonthTxs = buildBalanceForMonth(
        previousMonthDate.getUTCFullYear(),
        previousMonthDate.getUTCMonth()
    );

    return {
        [previousMonthKey]: {
            month: previousMonthKey,
            txs: previousMonthTxs,
        },
        [currentMonthKey]: {
            month: currentMonthKey,
            txs: currentMonthTxs,
        },
    };
};

export const createDemoState = (): PersistedState => {
    const now = new Date();
    const timestamp = now.toISOString();

    const categories: Record<string, Category> = {
        cat_salary: {
            id: "cat_salary",
            name: "Salary",
            type: "income",
            color: "#2ECC71",
            description: "Monthly salary deposits.",
        },
        cat_freelance: {
            id: "cat_freelance",
            name: "Freelance",
            type: "income",
            color: "#1ABC9C",
            description: "Client invoices and project work.",
        },
        cat_rent: {
            id: "cat_rent",
            name: "Rent",
            type: "expense",
            color: "#E74C3C",
            description: "Housing and rent payments.",
        },
        cat_groceries: {
            id: "cat_groceries",
            name: "Groceries",
            type: "expense",
            color: "#F39C12",
            description: "Supermarket and grocery runs.",
        },
        cat_utilities: {
            id: "cat_utilities",
            name: "Utilities",
            type: "expense",
            color: "#9B59B6",
            description: "Electricity, water, and internet.",
        },
        cat_transport: {
            id: "cat_transport",
            name: "Transport",
            type: "expense",
            color: "#3498DB",
            description: "Commutes, fuel, and transit fares.",
        },
        cat_dining: {
            id: "cat_dining",
            name: "Dining",
            type: "expense",
            color: "#E67E22",
            description: "Meals out and coffee breaks.",
        },
        cat_subscriptions: {
            id: "cat_subscriptions",
            name: "Subscriptions",
            type: "expense",
            color: "#16A085",
            description: "Recurring app and media subscriptions.",
        },
    };

    const walletTx: WalletTx[] = [
        {
            id: "w1_tx_0",
            walletId: "wallet_crypto",
            type: "deposit",
            date: "2024-01-05",
            amount: { value: 30000, currency: "EUR" },
            createdAt: "2024-01-05T12:00:00.000Z",
        },
        {
            id: "w1_tx_1",
            walletId: "wallet_crypto",
            type: "buy",
            date: "2024-01-10",
            assetId: "asset_btc",
            quantity: 0.3,
            price: { value: 60000, currency: "EUR" },
            createdAt: "2024-01-10T12:00:00.000Z",
        },
        {
            id: "w1_tx_2",
            walletId: "wallet_crypto",
            type: "buy",
            date: "2024-03-15",
            assetId: "asset_btc",
            quantity: 0.1,
            price: { value: 70000, currency: "EUR" },
            createdAt: "2024-03-15T12:00:00.000Z",
        },
        {
            id: "w1_tx_3",
            walletId: "wallet_crypto",
            type: "withdraw",
            date: "2024-04-01",
            amount: { value: 2000, currency: "EUR" },
            createdAt: "2024-04-01T12:00:00.000Z",
        },
        {
            id: "w1_tx_4",
            walletId: "wallet_crypto",
            type: "sell",
            date: "2024-07-20",
            assetId: "asset_btc",
            quantity: 0.15,
            price: { value: 90000, currency: "EUR" },
            createdAt: "2024-07-20T12:00:00.000Z",
        },
        {
            id: "w1_tx_5",
            walletId: "wallet_crypto",
            type: "sell",
            date: "2024-11-10",
            assetId: "asset_btc",
            quantity: 0.25,
            price: { value: 100000, currency: "EUR" },
            createdAt: "2024-11-10T12:00:00.000Z",
        },
        {
            id: "w1_tx_6",
            walletId: "wallet_crypto",
            type: "buy",
            date: "2025-04-12",
            assetId: "asset_btc",
            quantity: 0.05,
            price: { value: 103000, currency: "EUR" },
            createdAt: "2025-04-12T12:00:00.000Z",
        },
        {
            id: "w2_tx_0",
            walletId: "wallet_stocks",
            type: "deposit",
            date: "2024-01-03",
            amount: { value: 15000, currency: "EUR" },
            createdAt: "2024-01-03T12:00:00.000Z",
        },
        {
            id: "w2_tx_1",
            walletId: "wallet_stocks",
            type: "forex",
            date: "2024-01-04",
            from: { value: 10000, currency: "EUR" },
            to: { value: 11000, currency: "USD" },
            fxRate: 1.1,
            createdAt: "2024-01-04T12:00:00.000Z",
        },
        {
            id: "w2_tx_2",
            walletId: "wallet_stocks",
            type: "buy",
            date: "2024-01-10",
            assetId: "asset_googl",
            quantity: 30,
            price: { value: 200, currency: "USD" },
            createdAt: "2024-01-10T12:00:00.000Z",
        },
        {
            id: "w2_tx_3",
            walletId: "wallet_stocks",
            type: "buy",
            date: "2024-03-05",
            assetId: "asset_googl",
            quantity: 10,
            price: { value: 230, currency: "USD" },
            createdAt: "2024-03-05T12:00:00.000Z",
        },
        {
            id: "w2_tx_4",
            walletId: "wallet_stocks",
            type: "sell",
            date: "2024-06-18",
            assetId: "asset_googl",
            quantity: 15,
            price: { value: 260, currency: "USD" },
            createdAt: "2024-06-18T12:00:00.000Z",
        },
        {
            id: "w2_tx_5",
            walletId: "wallet_stocks",
            type: "forex",
            date: "2024-06-20",
            from: { value: 4000, currency: "USD" },
            to: { value: 3703.7, currency: "EUR" },
            fxRate: 1.08,
            createdAt: "2024-06-20T12:00:00.000Z",
        },
        {
            id: "w2_tx_6",
            walletId: "wallet_stocks",
            type: "sell",
            date: "2024-10-02",
            assetId: "asset_googl",
            quantity: 20,
            price: { value: 300, currency: "USD" },
            createdAt: "2024-10-02T12:00:00.000Z",
        },
        {
            id: "w2_tx_7",
            walletId: "wallet_stocks",
            type: "withdraw",
            date: "2024-10-05",
            amount: { value: 3000, currency: "EUR" },
            createdAt: "2024-10-05T12:00:00.000Z",
        },
        {
            id: "w2_tx_8",
            walletId: "wallet_stocks",
            type: "buy",
            date: "2024-10-10",
            assetId: "asset_aapl",
            quantity: 20,
            price: { value: 180, currency: "USD" },
            createdAt: "2024-10-10T12:00:00.000Z",
        },
        {
            id: "w2_tx_9",
            walletId: "wallet_stocks",
            type: "buy",
            date: "2024-11-12",
            assetId: "asset_aapl",
            quantity: 10,
            price: { value: 195, currency: "USD" },
            createdAt: "2024-11-12T12:00:00.000Z",
        },
        {
            id: "w2_tx_10",
            walletId: "wallet_stocks",
            type: "sell",
            date: "2025-02-05",
            assetId: "asset_aapl",
            quantity: 15,
            price: { value: 220, currency: "USD" },
            createdAt: "2025-02-05T12:00:00.000Z",
        },
        {
            id: "w2_tx_11",
            walletId: "wallet_stocks",
            type: "buy",
            date: "2024-10-15",
            assetId: "asset_vuaa",
            quantity: 30,
            price: { value: 92, currency: "EUR" },
            createdAt: "2024-10-15T12:00:00.000Z",
        },
        {
            id: "w2_tx_12",
            walletId: "wallet_stocks",
            type: "buy",
            date: "2024-12-20",
            assetId: "asset_vuaa",
            quantity: 10,
            price: { value: 98, currency: "EUR" },
            createdAt: "2024-12-20T12:00:00.000Z",
        },
        {
            id: "w2_tx_13",
            walletId: "wallet_stocks",
            type: "sell",
            date: "2025-03-18",
            assetId: "asset_vuaa",
            quantity: 15,
            price: { value: 105, currency: "EUR" },
            createdAt: "2025-03-18T12:00:00.000Z",
        },
        {
            id: "w2_tx_14",
            walletId: "wallet_stocks",
            type: "deposit",
            date: "2025-04-01",
            amount: { value: 2000, currency: "EUR" },
            createdAt: "2025-04-01T12:00:00.000Z",
        },
        {
            id: "w2_tx_15",
            walletId: "wallet_stocks",
            type: "buy",
            date: "2025-04-10",
            assetId: "asset_vuaa",
            quantity: 5,
            price: { value: 102, currency: "EUR" },
            createdAt: "2025-04-10T12:00:00.000Z",
        },
    ];

    return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        meta: {
            createdAt: timestamp,
            updatedAt: timestamp,
        },
        settings: {
            balanceCurrency: "EUR",
            visualCurrency: "EUR",
            locale: "en",
            timezone: "UTC",
            numberFormat: {
                useGrouping: true,
                maxFractionDigits: 2,
            },
        },
        account: {
            name: "Demo Portfolio",
        },
        categories,
        balance: buildBalanceState(now),
        assets: {
            asset_btc: {
                id: "asset_btc",
                ticker: "BTC",
                stooqTicker: null,
                tradingCurrency: "EUR",
                name: "Bitcoin",
                assetType: "crypto",
                decimals: 8,
                amount: 0.05,
                avgCost: { value: 103000, currency: "EUR" },
                txIds: ["w1_tx_1", "w1_tx_2", "w1_tx_4", "w1_tx_5", "w1_tx_6"],
                createdAt: timestamp,
                updatedAt: timestamp,
            },
            asset_googl: {
                id: "asset_googl",
                ticker: "GOOGL",
                stooqTicker: "GOOGL.US",
                tradingCurrency: "USD",
                name: "Alphabet Inc.",
                assetType: "stock",
                decimals: 2,
                amount: 5,
                avgCost: { value: 207.5, currency: "USD" },
                txIds: ["w2_tx_2", "w2_tx_3", "w2_tx_4", "w2_tx_6"],
                createdAt: timestamp,
                updatedAt: timestamp,
            },
            asset_aapl: {
                id: "asset_aapl",
                ticker: "AAPL",
                stooqTicker: "AAPL.US",
                tradingCurrency: "USD",
                name: "Apple Inc.",
                assetType: "stock",
                decimals: 2,
                amount: 15,
                avgCost: { value: 185, currency: "USD" },
                txIds: ["w2_tx_8", "w2_tx_9", "w2_tx_10"],
                createdAt: timestamp,
                updatedAt: timestamp,
            },
            asset_vuaa: {
                id: "asset_vuaa",
                ticker: "VUAA",
                stooqTicker: "VUAA.DE",
                tradingCurrency: "EUR",
                name: "Vanguard S&P 500 UCITS ETF",
                assetType: "etf",
                decimals: 2,
                amount: 30,
                avgCost: { value: 94.92, currency: "EUR" },
                txIds: ["w2_tx_11", "w2_tx_12", "w2_tx_13", "w2_tx_15"],
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        },
        wallets: {
            wallet_crypto: {
                id: "wallet_crypto",
                name: "Wallet 1 — Crypto",
                description: "EUR crypto trading account",
                cash: [{ value: 36350, currency: "EUR" }],
                txIds: [
                    "w1_tx_0",
                    "w1_tx_1",
                    "w1_tx_2",
                    "w1_tx_3",
                    "w1_tx_4",
                    "w1_tx_5",
                    "w1_tx_6",
                ],
            },
            wallet_stocks: {
                id: "wallet_stocks",
                name: "Wallet 2 — Stocks",
                description: "EUR + USD brokerage account",
                cash: [
                    { value: 5028.7, currency: "EUR" },
                    { value: 9350, currency: "USD" },
                ],
                txIds: [
                    "w2_tx_0",
                    "w2_tx_1",
                    "w2_tx_2",
                    "w2_tx_3",
                    "w2_tx_4",
                    "w2_tx_5",
                    "w2_tx_6",
                    "w2_tx_7",
                    "w2_tx_8",
                    "w2_tx_9",
                    "w2_tx_10",
                    "w2_tx_11",
                    "w2_tx_12",
                    "w2_tx_13",
                    "w2_tx_14",
                    "w2_tx_15",
                ],
            },
        },
        walletPositions: {
            wallet_crypto: {
                asset_btc: {
                    amount: 0.05,
                    avgCost: { value: 103000, currency: "EUR" },
                },
            },
            wallet_stocks: {
                asset_googl: {
                    amount: 5,
                    avgCost: { value: 207.5, currency: "USD" },
                },
                asset_aapl: {
                    amount: 15,
                    avgCost: { value: 185, currency: "USD" },
                },
                asset_vuaa: {
                    amount: 30,
                    avgCost: { value: 94.92, currency: "EUR" },
                },
            },
        },
        walletTx: walletTx.reduce<Record<string, WalletTx>>((acc, tx) => {
            acc[tx.id] = tx;
            return acc;
        }, {}),
        pies: {
            pie_crypto: {
                id: "pie_crypto",
                name: "Crypto",
                assetIds: ["asset_btc"],
                description: "Digital assets",
            },
            pie_stocks: {
                id: "pie_stocks",
                name: "Equities",
                assetIds: ["asset_googl", "asset_aapl", "asset_vuaa"],
                description: "Stocks & ETFs",
            },
        },
        livePrices: {
            "crypto:BTCEUR": {
                key: "crypto:BTCEUR",
                type: "crypto",
                ticker: "BTCEUR",
                value: 108000,
                updatedAt: timestamp,
                source: "demo",
            },
            "stock:GOOGL.US": {
                key: "stock:GOOGL.US",
                type: "stock",
                ticker: "GOOGL.US",
                value: 315,
                updatedAt: timestamp,
                source: "demo",
            },
            "stock:AAPL.US": {
                key: "stock:AAPL.US",
                type: "stock",
                ticker: "AAPL.US",
                value: 210,
                updatedAt: timestamp,
                source: "demo",
            },
            "stock:VUAA.DE": {
                key: "stock:VUAA.DE",
                type: "stock",
                ticker: "VUAA.DE",
                value: 110,
                updatedAt: timestamp,
                source: "demo",
            },
        },
    };
};
