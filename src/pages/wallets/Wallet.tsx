import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "../../ui/Card";
import { NetWorthHistoryChart } from "../../components/NetWorthHistoryChart";
import { Button } from "../../ui/Button";
import { PieChart } from "../../components/PieChart";
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowLeftRight,
    ArrowUpRight,
    DollarSign,
    Info,
    Menu,
    Pencil,
    Wallet as WalletIcon,
} from "lucide-react";
import { HoldingRow, HoldingsTable } from "../../components/HoldingsTable";
import { WalletTransactionsTable } from "../../components/WalletTransactionsTable";
import { StooqAPIStockSelect } from "../../components/StooqAPIStockSelect";
import { SyncStatusPills } from "../../components/SyncStatusPills";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Tooltip } from "../../ui/Tooltip";
import { useWalletData } from "../../hooks/useWalletData";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import { useForexHistoricalRates } from "../../hooks/useForexHistoricalRates";
import { useNetWorthHistory } from "../../hooks/useNetWorthHistory";
import { Modal } from "../../ui/Modal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addWalletTransaction } from "../../store/thunks/walletThunks";
import { addAsset, updateAsset } from "../../store/slices/assetsSlice";
import { updatePie } from "../../store/slices/piesSlice";
import { updateWallet } from "../../store/slices/walletsSlice";
import {
    selectPies,
    selectSettings,
    selectWallets,
} from "../../store/selectors";
import {
    Asset,
    AssetType,
    Currency,
    AssetsState,
    WalletTx,
} from "../../core/schema-types";
import {
    calculatePositionCostBasis,
    calculatePositionCostBasisFx,
    calculateRealizedPnlBreakdown,
    calculateRealizedPnl,
    getAllocationPercent,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
    toVisualMoney,
    toVisualValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";

const currencyOptions: Currency[] = ["EUR", "USD", "GBP"];

interface Props {
    onMenuClick: () => void;
}

const roundToTwo = (value: number) => Math.round(value * 100) / 100;
const normalizeDecimalInput = (value: string) =>
    value.replace(/,/g, ".").trim();
const getInputDecimals = (value: string) => {
    const trimmed = normalizeDecimalInput(value);
    if (!trimmed.includes(".")) return 0;
    return trimmed.split(".")[1].length;
};
const roundToInputPrecision = (value: string) => {
    const parsed = Number(normalizeDecimalInput(value));
    if (!Number.isFinite(parsed)) return parsed;
    const decimals = getInputDecimals(value);
    if (decimals <= 0) return parsed;
    const factor = 10 ** decimals;
    return Math.round(parsed * factor) / factor;
};
const formatFundingAmount = (value: number) => roundToTwo(value).toFixed(2);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
const shiftMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
};
const shiftYears = (date: Date, years: number) => {
    const next = new Date(date);
    next.setUTCFullYear(next.getUTCFullYear() + years);
    return next;
};
type PortfolioValuePoint = { date: string; value: number };
type CashFlowPoint = { date: string; amount: number };
type ReturnPoint = { label: string; hasValue: boolean; value: number };

const calculateTimeWeightedReturn = (
    portfolioValues: PortfolioValuePoint[],
    cashFlows: CashFlowPoint[],
) => {
    if (portfolioValues.length < 2) return null;
    const orderedValues = [...portfolioValues].sort((a, b) =>
        a.date.localeCompare(b.date),
    );
    const cashFlowByDate = cashFlows.reduce<Map<string, number>>((map, flow) => {
        map.set(flow.date, (map.get(flow.date) ?? 0) + flow.amount);
        return map;
    }, new Map());

    let twrFactor = 1;
    let hasValidPeriod = false;

    for (let index = 1; index < orderedValues.length; index += 1) {
        const previousValue = orderedValues[index - 1].value;
        if (previousValue === 0) continue;
        const currentPoint = orderedValues[index];
        const periodCashFlow = cashFlowByDate.get(currentPoint.date) ?? 0;
        const periodReturn = (currentPoint.value - periodCashFlow) / previousValue - 1;
        twrFactor *= 1 + periodReturn;
        hasValidPeriod = true;
    }

    if (!hasValidPeriod) return null;
    return twrFactor - 1;
};

const toYearFraction = (startDate: string, endDate: string) => {
    const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
    const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
    return Math.max(0, (end - start) / MS_PER_DAY / 365.25);
};

const calculateMoneyWeightedReturn = (
    cashFlows: CashFlowPoint[],
    startDate: string,
) => {
    if (!cashFlows.length) return null;
    const orderedFlows = [...cashFlows]
        .map((flow) => ({
            ...flow,
            t: toYearFraction(startDate, flow.date),
        }))
        .sort((a, b) => a.t - b.t);

    const hasPositive = orderedFlows.some((flow) => flow.amount > 0);
    const hasNegative = orderedFlows.some((flow) => flow.amount < 0);
    if (!hasPositive || !hasNegative) return null;

    const npv = (rate: number) =>
        orderedFlows.reduce(
            (sum, flow) => sum + flow.amount / Math.pow(1 + rate, flow.t),
            0,
        );

    let low = -0.9999;
    let high = 1;
    let npvLow = npv(low);
    let npvHigh = npv(high);
    let guard = 0;

    while (npvLow * npvHigh > 0 && guard < 50) {
        high *= 2;
        npvHigh = npv(high);
        guard += 1;
    }
    if (npvLow * npvHigh > 0) return null;

    for (let iteration = 0; iteration < 200; iteration += 1) {
        const mid = (low + high) / 2;
        const npvMid = npv(mid);
        if (Math.abs(npvMid) < 1e-9) return mid;
        if (npvLow * npvMid <= 0) {
            high = mid;
            npvHigh = npvMid;
        } else {
            low = mid;
            npvLow = npvMid;
        }
    }

    return (low + high) / 2;
};

interface WalletAllocationSectionProps {
    pieData: { name: string; value: number; color: string }[];
    holdings: HoldingRow[];
}

interface WalletPerformanceSectionProps {
    currency: string;
    locale?: string;
    baseCurrency: string;
    transactions: WalletTx[];
    assets: AssetsState;
    forexRates: Record<string, number>;
    getForexRate: (currency: string, date: string) => number | null;
    twrReturns: ReturnPoint[];
    mwrReturns: ReturnPoint[];
    apyStartYear: number | null;
    apyYearOptions: number[];
    onApyStartYearChange: (year: number) => void;
}

const WalletPerformanceSection = React.memo(
    ({
        currency,
        locale,
        baseCurrency,
        transactions,
        assets,
        forexRates,
        getForexRate,
        twrReturns,
        mwrReturns,
        apyStartYear,
        apyYearOptions,
        onApyStartYearChange,
    }: WalletPerformanceSectionProps) => (
        <Card title="Performance History">
            {transactions.length > 0 ? (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-app-muted">
                                TWR
                                <Tooltip content="TWR measures how the portfolio itself performed, ignoring deposits and withdrawals. Think: 'If this portfolio had €1 invested from day 1, how would it grow?' It captures stock picking, allocation, and rebalancing. Example: bad stocks drop -40%, then you deposit a lot -> TWR stays about -40% because strategy was bad regardless of cash-flow timing. Use TWR to compare with S&P500, evaluate investing skill, and compare strategies fairly.">
                                    <Info size={12} />
                                </Tooltip>
                            </span>
                            {twrReturns.map((periodReturn) => (
                                <span
                                    key={`twr-${periodReturn.label}`}
                                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                                        periodReturn.hasValue
                                            ? periodReturn.value >= 0
                                                ? "text-app-success bg-emerald-500/10"
                                                : "text-app-danger bg-rose-500/10"
                                            : "text-app-muted bg-app-surface"
                                    }`}
                                >
                                    <span>{periodReturn.label}</span>
                                    <span>
                                        {periodReturn.hasValue
                                            ? `${periodReturn.value >= 0 ? "+" : ""}${periodReturn.value.toFixed(2)}%`
                                            : "n/a"}
                                    </span>
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-app-muted">
                                MWR (IRR)
                                <Tooltip content="MWR (IRR) measures how your actual money performed, including when you invested. It answers: 'How well did my capital do over time?' It captures timing of deposits, size of investments, and real-life outcome. Example: portfolio drops -40% early, but you invest most money later -> MWR may be around -10% because most capital avoided early losses. Use MWR to understand your real return, evaluate timing decisions, and compare with a benchmark using the same cash flows.">
                                    <Info size={12} />
                                </Tooltip>
                            </span>
                            {mwrReturns.map((periodReturn) => (
                                <span
                                    key={`mwr-${periodReturn.label}`}
                                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                                        periodReturn.hasValue
                                            ? periodReturn.value >= 0
                                                ? "text-app-success bg-emerald-500/10"
                                                : "text-app-danger bg-rose-500/10"
                                            : "text-app-muted bg-app-surface"
                                    }`}
                                >
                                    <span>{periodReturn.label}</span>
                                    <span>
                                        {periodReturn.hasValue
                                            ? `${periodReturn.value >= 0 ? "+" : ""}${periodReturn.value.toFixed(2)}%`
                                            : "n/a"}
                                    </span>
                                </span>
                            ))}
                            {apyStartYear !== null && apyYearOptions.length > 0 ? (
                                <label className="ml-auto inline-flex items-center gap-2 text-xs text-app-muted">
                                    APY start
                                    <select
                                        value={apyStartYear}
                                        onChange={(event) =>
                                            onApyStartYearChange(Number(event.target.value))
                                        }
                                        className="bg-app-surface border border-app-border rounded px-2 py-1 text-app-foreground"
                                    >
                                        {apyYearOptions.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : null}
                        </div>
                    </div>
                    <NetWorthHistoryChart
                        transactions={transactions}
                        assets={assets}
                        baseCurrency={baseCurrency}
                        height={300}
                        currency={currency}
                        locale={locale}
                        showNetInvestedLine
                        forexRates={forexRates}
                        getForexRate={getForexRate}
                    />
                </div>
            ) : (
                <p className="text-sm text-app-muted">
                    Add transactions to see net worth history.
                </p>
            )}
        </Card>
    ),
);

const WalletAllocationSection = React.memo(
    ({
        pieData,
        holdings,
        onEditAsset,
    }: WalletAllocationSectionProps & {
        onEditAsset?: (assetId: string) => void;
    }) => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Allocation" className="lg:col-span-1">
                <PieChart data={pieData} height={250} />
            </Card>

            <Card title="Holdings" className="lg:col-span-2">
                <HoldingsTable holdings={holdings} onEditAsset={onEditAsset} />
            </Card>
        </div>
    ),
);

interface WalletTransactionsSectionProps {
    transactions: WalletTx[];
    assets: AssetsState;
}

const WalletTransactionsSection = React.memo(
    ({ transactions, assets }: WalletTransactionsSectionProps) => (
        <Card title="Transactions">
            <WalletTransactionsTable
                transactions={transactions}
                assets={assets}
            />
        </Card>
    ),
);

export const WalletDetail: React.FC<Props> = ({ onMenuClick }) => {
    const { id } = useParams();
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectSettings);
    const pies = useAppSelector(selectPies);
    const wallets = useAppSelector(selectWallets);

    const { wallet, walletCash, walletTransactions, walletPositions, assets } =
        useWalletData(id);

    const [isDepositOpen, setDepositOpen] = useState(false);
    const [isWithdrawOpen, setWithdrawOpen] = useState(false);
    const [isDividendOpen, setDividendOpen] = useState(false);
    const [isTradeOpen, setTradeOpen] = useState(false);
    const [isFxOpen, setFxOpen] = useState(false);
    const [isEditAssetOpen, setEditAssetOpen] = useState(false);
    const [isEditWalletOpen, setEditWalletOpen] = useState(false);
    const [isCashBreakdownOpen, setCashBreakdownOpen] = useState(false);
    const [isPerformanceBreakdownOpen, setPerformanceBreakdownOpen] =
        useState(false);

    const [editWalletName, setEditWalletName] = useState("");
    const [editWalletDescription, setEditWalletDescription] = useState("");

    const [cashAmount, setCashAmount] = useState("");
    const [cashCurrency, setCashCurrency] = useState<Currency>(
        settings.balanceCurrency,
    );
    const [cashDate, setCashDate] = useState(
        new Date().toISOString().slice(0, 10),
    );

    const [dividendAmount, setDividendAmount] = useState("");
    const [dividendCurrency, setDividendCurrency] = useState<Currency>(
        settings.balanceCurrency,
    );
    const [dividendAssetId, setDividendAssetId] = useState<string>("");
    const [editAssetId, setEditAssetId] = useState<string | null>(null);
    const [editAssetType, setEditAssetType] = useState<AssetType>("stock");
    const [editAssetTicker, setEditAssetTicker] = useState("");
    const [editAssetName, setEditAssetName] = useState("");
    const [editAssetStooq, setEditAssetStooq] = useState("");
    const [editAssetCurrency, setEditAssetCurrency] = useState<Currency>("USD");
    const [editAssetQuoteAlias, setEditAssetQuoteAlias] = useState("USDT");
    const [editAssetPieId, setEditAssetPieId] = useState("");
    const [fxFromAmount, setFxFromAmount] = useState("");
    const [fxFromCurrency, setFxFromCurrency] = useState<Currency>(
        settings.balanceCurrency,
    );
    const [fxToCurrency, setFxToCurrency] = useState<Currency>(
        settings.balanceCurrency === "EUR" ? "USD" : "EUR",
    );
    const [fxRate, setFxRate] = useState("");
    const [fxFees, setFxFees] = useState("");
    const [fxFeeCurrency, setFxFeeCurrency] = useState<Currency>(
        settings.balanceCurrency,
    );
    const [fxDate, setFxDate] = useState(new Date().toISOString().slice(0, 10));
    const [showFxOperationFees, setShowFxOperationFees] = useState(false);

    const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
    const [tradeAssetId, setTradeAssetId] = useState("");
    const [tradeTicker, setTradeTicker] = useState("");
    const [tradeStooqSearch, setTradeStooqSearch] = useState("");
    const [tradeStooqTicker, setTradeStooqTicker] = useState("");
    const [tradeName, setTradeName] = useState("");
    const [tradeAssetType, setTradeAssetType] = useState<AssetType>("stock");
    const [tradeCurrency, setTradeCurrency] = useState<Currency>("USD");
    const [tradeFundingCurrency, setTradeFundingCurrency] = useState<Currency>(
        settings.balanceCurrency,
    );
    const [tradeFundingAmount, setTradeFundingAmount] = useState("");
    const [tradeQuantity, setTradeQuantity] = useState("");
    const [tradePrice, setTradePrice] = useState("");
    const [tradeFees, setTradeFees] = useState("");
    const [tradeFeesCurrency, setTradeFeesCurrency] = useState<Currency>("USD");
    const [tradeFxFee, setTradeFxFee] = useState("");
    const [tradeFxFeeCurrency, setTradeFxFeeCurrency] =
        useState<Currency>("USD");
    const [tradeFxRate, setTradeFxRate] = useState("");
    const [tradePieId, setTradePieId] = useState("");
    const [tradeDate, setTradeDate] = useState(
        new Date().toISOString().slice(0, 10),
    );

    const [showTradeFees, setShowTradeFees] = useState(false);
    const [showFxFee, setShowFxFee] = useState(false);

    const walletName = wallet?.name ?? "Wallet";
    const walletDescription =
        wallet?.description || "No description added yet.";
    const editWalletNameTrimmed = editWalletName.trim();
    const existingWalletNamesLower = useMemo(
        () =>
            new Set(
                Object.values(wallets).map((entry) =>
                    entry.name.trim().toLowerCase(),
                ),
            ),
        [wallets],
    );
    const currentWalletNameLower = wallet?.name?.trim().toLowerCase() ?? "";
    const isDuplicateWalletName =
        editWalletNameTrimmed.length > 0 &&
        existingWalletNamesLower.has(editWalletNameTrimmed.toLowerCase()) &&
        editWalletNameTrimmed.toLowerCase() !== currentWalletNameLower;
    const tradeQuantityValue = roundToInputPrecision(tradeQuantity);
    const tradePriceValue = roundToInputPrecision(tradePrice);
    const tradeTotal = tradeQuantityValue * tradePriceValue;
    const fxFromAmountValue = Number(fxFromAmount);
    const fxRateValue = Number(fxRate);
    const fxToAmountValue =
        fxFromAmountValue > 0 && fxRateValue > 0
            ? roundToTwo(fxFromAmountValue * fxRateValue)
            : 0;
    const fxPairLabel = `${fxFromCurrency}/${fxToCurrency}`;
    const fxEnabled = tradeFundingCurrency !== tradeCurrency;
    const fxPair = fxEnabled
        ? tradeType === "sell"
            ? `${tradeCurrency}/${tradeFundingCurrency}`
            : `${tradeFundingCurrency}/${tradeCurrency}`
        : "";
    const hasAssetRequirement =
        tradeType === "sell"
            ? Boolean(tradeAssetId)
            : Boolean(tradeName || tradeTicker);
    const hasTradeBasics =
        tradeQuantityValue > 0 && tradePriceValue > 0 && hasAssetRequirement;
    const tradeFxRateValue = Number(tradeFxRate);
    const hasValidTradeFxRate =
        Number.isFinite(tradeFxRateValue) && tradeFxRateValue > 0;
    const hasFxDetails = fxEnabled ? hasValidTradeFxRate : true;
    const showTradeSummary = hasTradeBasics && hasFxDetails;
    const needsStooqWarning =
        (tradeAssetType === "stock" || tradeAssetType === "etf") &&
        tradeStooqTicker.trim().length === 0;
    const fundingCurrency = fxEnabled ? tradeFundingCurrency : tradeCurrency;
    const tradeFundingAmountValue = Number(tradeFundingAmount);
    const roundedFundingAmountValue = roundToTwo(tradeFundingAmountValue);
    const requiredFundingBase = fxEnabled
        ? roundedFundingAmountValue
        : roundToTwo(tradeTotal);

    const existingAssets = useMemo(
        () =>
            Object.values(assets).sort((a, b) =>
                a.ticker.localeCompare(b.ticker),
            ),
        [assets],
    );

    const selectedAsset = tradeAssetId ? assets[tradeAssetId] : undefined;
    const canEditTradeCurrency = !tradeAssetId || selectedAsset?.amount === 0;
    const selectedAssetPieId = useMemo(() => {
        if (!tradeAssetId) return "";
        return (
            Object.values(pies).find((pie) =>
                pie.assetIds.includes(tradeAssetId),
            )?.id ?? ""
        );
    }, [pies, tradeAssetId]);

    useEffect(() => {
        if (!wallet) return;
        setEditWalletName(wallet.name ?? "");
        setEditWalletDescription(wallet.description ?? "");
    }, [wallet]);

    useEffect(() => {
        if (selectedAsset) {
            setTradeTicker(selectedAsset.ticker);
            setTradeStooqSearch(selectedAsset.stooqTicker ?? "");
            setTradeStooqTicker(selectedAsset.stooqTicker ?? "");
            setTradeName(selectedAsset.name);
            setTradeAssetType(selectedAsset.assetType);
            setTradeCurrency(selectedAsset.tradingCurrency);
            setTradeFundingCurrency(selectedAsset.tradingCurrency);
        }
    }, [selectedAsset]);

    useEffect(() => {
        if (!tradeAssetId) {
            setTradeTicker("");
            setTradeStooqSearch("");
            setTradeStooqTicker("");
            setTradeName("");
            setTradeAssetType("stock");
            setTradeCurrency(settings.balanceCurrency);
            setTradeFundingCurrency(settings.balanceCurrency);
        }
    }, [settings.balanceCurrency, tradeAssetId]);

    useEffect(() => {
        if (tradeAssetId) {
            setTradePieId(selectedAssetPieId);
        }
    }, [tradeAssetId, selectedAssetPieId]);

    useEffect(() => {
        setTradeFeesCurrency(tradeFundingCurrency);
    }, [tradeFundingCurrency]);

    useEffect(() => {
        setTradeFxFeeCurrency(tradeFundingCurrency);
    }, [tradeFundingCurrency]);

    useEffect(() => {
        if (!fxEnabled) {
            setTradeFundingAmount(
                tradeTotal > 0 ? formatFundingAmount(tradeTotal) : "",
            );
            return;
        }
        const rate = Number(tradeFxRate);
        if (!Number.isFinite(rate) || rate <= 0) {
            setTradeFundingAmount("");
            return;
        }
        setTradeFundingAmount(
            tradeType === "sell"
                ? formatFundingAmount(tradeTotal * rate)
                : formatFundingAmount(tradeTotal / rate),
        );
    }, [fxEnabled, tradeFxRate, tradeTotal, tradeType]);

    useEffect(() => {
        if (tradeAssetType !== "stock" && tradeAssetType !== "etf") {
            setTradeStooqSearch("");
            setTradeStooqTicker("");
        }
    }, [tradeAssetType]);

    const positionEntries = useMemo(
        () => Object.entries(walletPositions ?? {}),
        [walletPositions],
    );

    const positionAssets = useMemo(
        () =>
            positionEntries
                .map(([assetId]) => assets[assetId])
                .filter((asset): asset is Asset => Boolean(asset)),
        [assets, positionEntries],
    );

    const livePricesByAsset = useAssetLivePrices(positionAssets);

    const cashBuckets = useMemo(() => {
        if (!walletCash) return [];
        if (Array.isArray(walletCash)) {
            return walletCash;
        }
        if (typeof walletCash === "object") {
            return Object.entries(walletCash as Record<string, number>).map(
                ([currency, value]) => ({
                    currency: currency as Currency,
                    value: Number(value),
                }),
            );
        }
        return [];
    }, [walletCash]);
    const hasNegativeCash = useMemo(
        () => cashBuckets.some((bucket) => bucket.value < 0),
        [cashBuckets],
    );

    const transactionCurrencies = useMemo(() => {
        const currencies = new Set<Currency>();
        walletTransactions.forEach((tx) => {
            switch (tx.type) {
                case "deposit":
                case "withdraw":
                case "dividend":
                    currencies.add(tx.amount.currency);
                    break;
                case "forex":
                    currencies.add(tx.from.currency);
                    currencies.add(tx.to.currency);
                    if (tx.fees) currencies.add(tx.fees.currency);
                    break;
                case "buy":
                case "sell":
                    currencies.add(tx.price.currency);
                    if (tx.fees) currencies.add(tx.fees.currency);
                    break;
            }
        });
        return Array.from(currencies);
    }, [walletTransactions]);

    const forexCurrencies = useMemo(() => {
        const currencies = new Set<Currency>();
        cashBuckets.forEach((bucket) => currencies.add(bucket.currency));
        transactionCurrencies.forEach((currency) => currencies.add(currency));
        positionAssets.forEach((asset) =>
            currencies.add(asset.tradingCurrency),
        );
        return Array.from(currencies);
    }, [cashBuckets, positionAssets, transactionCurrencies]);
    const forexRates = useForexLivePrices(
        forexCurrencies,
        settings.visualCurrency,
    );

    const transactionDates = useMemo(
        () => walletTransactions.map((tx) => tx.date),
        [walletTransactions],
    );

    const { getForexRate } = useForexHistoricalRates(
        forexCurrencies,
        transactionDates,
        settings.visualCurrency,
    );

    const toBaseValue = useCallback(
        (amount: number, currency: Currency, date: string) => {
            if (currency === settings.visualCurrency) return amount;
            const rate = getForexRate(currency, date) ?? forexRates[currency];
            return rate ? amount * rate : amount;
        },
        [forexRates, getForexRate, settings.visualCurrency],
    );

    const netInvested = useMemo(
        () =>
            walletTransactions.reduce((total, tx) => {
                if (tx.type === "deposit") {
                    return (
                        total +
                        toBaseValue(tx.amount.value, tx.amount.currency, tx.date)
                    );
                }
                if (tx.type === "withdraw") {
                    return (
                        total -
                        toBaseValue(tx.amount.value, tx.amount.currency, tx.date)
                    );
                }
                return total;
            }, 0),
        [walletTransactions, toBaseValue],
    );

    const { holdings, totals } = useMemo(() => {
        const costBasisByAsset = calculatePositionCostBasis(
            walletTransactions,
            settings.visualCurrency,
            forexRates,
        );
        const costBasisFxByAsset = calculatePositionCostBasisFx(
            walletTransactions,
            settings.visualCurrency,
            forexRates,
            getForexRate,
        );
        const rows = positionEntries.map(([assetId, position]) => {
            const asset = assets[assetId];
            const fxEntryData = costBasisFxByAsset.get(assetId);
            const costAverage =
                position.amount > 0 && fxEntryData
                    ? fxEntryData.costBasisQuote / position.amount
                    : position.avgCost.value;
            const currentPrice = livePricesByAsset[assetId] ?? costAverage;
            const value = getPositionCurrentValue(
                position.amount,
                currentPrice,
            );
            const tradingCurrency =
                asset?.tradingCurrency ?? position.avgCost.currency;
            const valueVisual = toVisualValue(
                value,
                tradingCurrency,
                settings.visualCurrency,
                forexRates,
            );
            const investedValueVisual =
                costBasisByAsset.get(assetId)?.costBasisVisual ??
                toVisualValue(
                    getPositionInvestedValue(position.amount, costAverage),
                    tradingCurrency,
                    settings.visualCurrency,
                    forexRates,
                );
            const pnl = getPnL(valueVisual, investedValueVisual);
            const pnlPercent = getPnLPercent(valueVisual, investedValueVisual);
            const baseCurrency = settings.visualCurrency;
            const quoteCurrency = tradingCurrency ?? baseCurrency;
            const entryFx =
                quoteCurrency === baseCurrency
                    ? 1
                    : fxEntryData &&
                        !fxEntryData.hasMissingFx &&
                        fxEntryData.costBasisQuote > 0
                      ? fxEntryData.costBasisBase / fxEntryData.costBasisQuote
                      : null;
            const currentFx =
                quoteCurrency === baseCurrency
                    ? 1
                    : (forexRates[quoteCurrency] ?? null);
            const assetPnlBase =
                entryFx === null || currentFx === null
                    ? null
                    : position.amount *
                      (currentPrice - costAverage) *
                      currentFx;
            const fxPnlBase =
                entryFx === null || currentFx === null
                    ? null
                    : position.amount * costAverage * (currentFx - entryFx);

            return {
                row: {
                    assetId,
                    asset: asset?.name ?? assetId,
                    ticker: asset?.ticker ?? assetId,
                    units: position.amount,
                    costAverage,
                    costCurrency: position.avgCost.currency ?? tradingCurrency,
                    currentPrice,
                    currentPriceCurrency: tradingCurrency,
                    value: valueVisual,
                    valueCurrency: settings.visualCurrency,
                    pnl,
                    pnlCurrency: settings.visualCurrency,
                    pnlPercent: Number(pnlPercent.toFixed(2)),
                    assetPnlBase,
                    fxPnlBase,
                    entryFx,
                    currentFx,
                    baseCurrency,
                    quoteCurrency,
                    currency: settings.visualCurrency,
                },
                investedValue: investedValueVisual,
            };
        });

        const totalValue = getTotalValue(rows.map((item) => item.row.value));
        const totalInvested = getTotalValue(
            rows.map((item) => item.investedValue),
        );
        const totalPnL = getTotalValue(rows.map((item) => item.row.pnl));

        return {
            holdings: rows.map(({ row }) => ({
                ...row,
                allocation: Number(
                    getAllocationPercent(row.value, totalValue).toFixed(2),
                ),
            })),
            totals: {
                currentValue: totalValue,
                invested: totalInvested,
                pnl: totalPnL,
            },
        };
    }, [
        assets,
        forexRates,
        getForexRate,
        livePricesByAsset,
        positionEntries,
        settings.visualCurrency,
        walletTransactions,
    ]);

    const cashConvertedTotal = useMemo(() => {
        return getTotalValue(
            cashBuckets.map((bucket) =>
                toVisualMoney(bucket, settings.visualCurrency, forexRates),
            ),
        );
    }, [cashBuckets, forexRates, settings.visualCurrency]);

    const walletValue = totals.currentValue + cashConvertedTotal;
    const realizedPnl = useMemo(
        () =>
            calculateRealizedPnl(
                walletTransactions,
                settings.visualCurrency,
                forexRates,
                getForexRate,
            ),
        [forexRates, getForexRate, settings.visualCurrency, walletTransactions],
    );
    const realizedBreakdown = useMemo(
        () =>
            calculateRealizedPnlBreakdown(
                walletTransactions,
                settings.visualCurrency,
                forexRates,
                getForexRate,
            ),
        [forexRates, getForexRate, settings.visualCurrency, walletTransactions],
    );

    const unrealizedPositive = Math.max(totals.pnl, 0);
    const unrealizedNegative = Math.min(totals.pnl, 0);
    const totalPnl = totals.pnl + realizedPnl;
    const totalReturnPercent =
        netInvested > 0 ? (Math.abs(totalPnl) / netInvested) * 100 : 0;
    const unrealizedPercent =
        totals.invested > 0 ? (totals.pnl / totals.invested) * 100 : 0;
    const unrealizedIsPositive = totals.pnl >= 0;
    const realizedIsPositive = realizedPnl >= 0;

    const pieData = useMemo(
        () =>
            holdings.map((holding) => ({
                name: holding.ticker,
                value: holding.value,
                color: "#6366f1",
            })),
        [holdings],
    );

    const sortedTransactions = useMemo(
        () =>
            [...walletTransactions].sort((a, b) => {
                const dateDiff =
                    new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateDiff !== 0) return dateDiff;
                return (
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                );
            }),
        [walletTransactions],
    );

    const apyYearOptions = useMemo(() => {
        const currentYear = new Date().getUTCFullYear();
        const txYears = sortedTransactions
            .map((tx) => new Date(tx.date).getUTCFullYear())
            .filter((year) => Number.isFinite(year));
        const earliestTxYear =
            txYears.length > 0 ? Math.min(...txYears) : currentYear;
        const startYear = Math.max(earliestTxYear - 1, 2000);
        const years: number[] = [];
        for (let year = startYear; year <= currentYear; year += 1) {
            years.push(year);
        }
        return years;
    }, [sortedTransactions]);
    const [apyStartYear, setApyStartYear] = useState<number | null>(null);

    useEffect(() => {
        if (!apyYearOptions.length) {
            setApyStartYear(null);
            return;
        }
        setApyStartYear((previous) =>
            previous && apyYearOptions.includes(previous)
                ? previous
                : apyYearOptions[0],
        );
    }, [apyYearOptions]);

    const performancePeriods = useMemo(() => {
        const today = new Date();
        const apyStartDate = apyStartYear
            ? `${apyStartYear.toString().padStart(4, "0")}-01-01`
            : null;
        return [
            { key: "6M", label: "6M", startDate: toDateKey(shiftMonths(today, -6)) },
            { key: "1Y", label: "1Y", startDate: toDateKey(shiftYears(today, -1)) },
            { key: "2Y", label: "2Y", startDate: toDateKey(shiftYears(today, -2)) },
            { key: "3Y", label: "3Y", startDate: toDateKey(shiftYears(today, -3)) },
            { key: "4Y", label: "4Y", startDate: toDateKey(shiftYears(today, -4)) },
            { key: "5Y", label: "5Y", startDate: toDateKey(shiftYears(today, -5)) },
            { key: "ALL", label: "All Time (APY)", startDate: apyStartDate },
        ] as const;
    }, [apyStartYear]);

    const performanceSnapshotDates = useMemo(() => {
        if (!walletTransactions.length) return [];
        const uniqueDates = new Set<string>(walletTransactions.map((tx) => tx.date));
        const endDate = toDateKey(new Date());
        uniqueDates.add(endDate);
        performancePeriods.forEach((period) => {
            if (period.startDate) uniqueDates.add(period.startDate);
        });
        return Array.from(uniqueDates).sort((a, b) => a.localeCompare(b));
    }, [performancePeriods, walletTransactions]);

    const { data: performanceSnapshots } = useNetWorthHistory({
        transactions: walletTransactions,
        assets,
        baseCurrency: settings.visualCurrency,
        locale: settings.locale,
        snapshotDates: performanceSnapshotDates,
    });

    const performanceMetrics = useMemo(() => {
        if (!performanceSnapshots.length) return { twrReturns: [], mwrReturns: [] };
        const snapshotMap = new Map(
            performanceSnapshots.map((point) => [point.date, point.value]),
        );
        const externalCashFlows = walletTransactions
            .filter((tx) => tx.type === "deposit" || tx.type === "withdraw")
            .map((tx) => ({
                date: tx.date,
                amount:
                    tx.type === "deposit"
                        ? toBaseValue(tx.amount.value, tx.amount.currency, tx.date)
                        : -toBaseValue(tx.amount.value, tx.amount.currency, tx.date),
            }));
        const endDate = toDateKey(new Date());

        const twrReturns: ReturnPoint[] = [];
        const mwrReturns: ReturnPoint[] = [];

        performancePeriods.forEach((period) => {
            const rawStartDate = period.startDate;
            if (!rawStartDate) {
                twrReturns.push({ label: period.label, hasValue: false, value: 0 });
                mwrReturns.push({ label: period.label, hasValue: false, value: 0 });
                return;
            }
            const startDate = rawStartDate > endDate ? endDate : rawStartDate;
            const datesInRange = performanceSnapshotDates.filter(
                (date) => date >= startDate && date <= endDate,
            );
            if (datesInRange.length < 2) {
                twrReturns.push({ label: period.label, hasValue: false, value: 0 });
                mwrReturns.push({ label: period.label, hasValue: false, value: 0 });
                return;
            }

            const periodPortfolioValues = datesInRange.map((date) => ({
                date,
                value: snapshotMap.get(date) ?? 0,
            }));
            const startValue = periodPortfolioValues[0].value;
            const endValue =
                periodPortfolioValues[periodPortfolioValues.length - 1].value;
            if (startValue <= 0) {
                twrReturns.push({ label: period.label, hasValue: false, value: 0 });
                mwrReturns.push({ label: period.label, hasValue: false, value: 0 });
                return;
            }
            const periodCashFlows = externalCashFlows.filter(
                (flow) => flow.date >= startDate && flow.date <= endDate,
            );
            const twrDecimal = calculateTimeWeightedReturn(
                periodPortfolioValues,
                periodCashFlows,
            );
            const mwrDecimal = calculateMoneyWeightedReturn(
                [
                    { date: startDate, amount: -startValue },
                    ...periodCashFlows.map((flow) => ({
                        date: flow.date,
                        amount: -flow.amount,
                    })),
                    { date: endDate, amount: endValue },
                ],
                startDate,
            );

            console.log("[WalletReturns][TWR]", {
                period: period.label,
                startDate,
                endDate,
                portfolioValues: periodPortfolioValues,
                cashFlows: periodCashFlows,
                twrDecimal,
            });
            console.log("[WalletReturns][MWR]", {
                period: period.label,
                startDate,
                endDate,
                startValue,
                endValue,
                externalCashFlows: periodCashFlows,
                mwrDecimal,
            });

            if (twrDecimal === null) {
                twrReturns.push({ label: period.label, hasValue: false, value: 0 });
            } else if (period.key === "ALL") {
                const startTime = new Date(startDate).getTime();
                const endTime = new Date(endDate).getTime();
                const days = Math.max(1, (endTime - startTime) / MS_PER_DAY);
                const apy = Math.pow(1 + twrDecimal, 365 / days) - 1;
                twrReturns.push({ label: period.label, hasValue: true, value: apy * 100 });
            } else {
                twrReturns.push({
                    label: period.label,
                    hasValue: true,
                    value: twrDecimal * 100,
                });
            }

            if (mwrDecimal === null) {
                mwrReturns.push({ label: period.label, hasValue: false, value: 0 });
            } else {
                mwrReturns.push({
                    label: period.label,
                    hasValue: true,
                    value: mwrDecimal * 100,
                });
            }
        });

        return { twrReturns, mwrReturns };
    }, [
        performancePeriods,
        performanceSnapshotDates,
        performanceSnapshots,
        walletTransactions,
        toBaseValue,
    ]);

    const handleNonNegativeChange =
        (setter: React.Dispatch<React.SetStateAction<string>>) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = normalizeDecimalInput(event.target.value);
            if (value.startsWith("-")) return;
            setter(value);
        };

    const handleInvertTradeFxRate = () => {
        if (!hasValidTradeFxRate) return;
        const invertedRate = 1 / tradeFxRateValue;
        if (!Number.isFinite(invertedRate) || invertedRate <= 0) return;
        setTradeFxRate(invertedRate.toString());
    };

    const getWalletCashValue = (currency: Currency) => {
        if (!walletCash) return 0;
        if (Array.isArray(walletCash)) {
            return walletCash.find((m) => m.currency === currency)?.value ?? 0;
        }
        if (typeof walletCash === "object") {
            const value = (walletCash as Record<string, number>)[currency];
            return typeof value === "number" ? value : 0;
        }
        return 0;
    };

    const tradeFeesValue = showTradeFees ? roundToInputPrecision(tradeFees) : 0;
    const tradeFxFeeValue = showFxFee ? roundToInputPrecision(tradeFxFee) : 0;
    const fxFeesValue = showFxOperationFees ? roundToInputPrecision(fxFees) : 0;

    const hasSufficientAsset =
        tradeType === "sell"
            ? (walletPositions?.[tradeAssetId]?.amount ?? 0) >=
              tradeQuantityValue
            : true;
    const remainingAssetAfterSell =
        tradeType === "sell"
            ? (walletPositions?.[tradeAssetId]?.amount ?? 0) -
              tradeQuantityValue
            : 0;
    const insufficientFundsMessage =
        hasTradeBasics &&
        hasFxDetails &&
        tradeType === "sell" &&
        !hasSufficientAsset
            ? "Insufficient assets to sell."
            : "";
    const lowRemainingMessage =
        hasTradeBasics &&
        hasFxDetails &&
        tradeType === "sell" &&
        hasSufficientAsset &&
        remainingAssetAfterSell > 0 &&
        remainingAssetAfterSell < 0.01
            ? "Warning: this sale leaves less than 0.01 units."
            : "";

    const handleAddCash = (type: "deposit" | "withdraw") => {
        if (!id) return;
        const txId = `tx_${Date.now()}`;
        dispatch(
            addWalletTransaction({
                id: txId,
                walletId: id,
                type,
                date: cashDate || new Date().toISOString().slice(0, 10),
                amount: { value: Number(cashAmount), currency: cashCurrency },
                createdAt: new Date().toISOString(),
            }),
        );
        setCashAmount("");
        setCashDate(new Date().toISOString().slice(0, 10));
    };

    const handleAddDividend = () => {
        if (!id) return;
        const txId = `tx_${Date.now()}`;
        dispatch(
            addWalletTransaction({
                id: txId,
                walletId: id,
                type: "dividend",
                date: new Date().toISOString().slice(0, 10),
                amount: {
                    value: Number(dividendAmount),
                    currency: dividendCurrency,
                },
                assetId: dividendAssetId || undefined,
                createdAt: new Date().toISOString(),
            }),
        );
        setDividendAmount("");
    };

    const handleEditAssetOpen = (assetId: string) => {
        const asset = assets[assetId];
        if (!asset) return;
        const currentPieId =
            Object.values(pies).find((pie) => pie.assetIds.includes(assetId))
                ?.id ?? "";
        setEditAssetId(assetId);
        setEditAssetType(asset.assetType);
        setEditAssetTicker(asset.ticker);
        setEditAssetName(asset.name);
        setEditAssetStooq(asset.stooqTicker ?? "");
        setEditAssetCurrency(asset.tradingCurrency);
        setEditAssetQuoteAlias(
            asset.assetType === "crypto"
                ? (asset.cryptoQuoteAlias ??
                      (asset.tradingCurrency === "USD"
                          ? "USDT"
                          : asset.tradingCurrency))
                : "",
        );
        setEditAssetPieId(currentPieId);
        setEditAssetOpen(true);
    };

    const handleEditAssetSave = () => {
        if (!editAssetId) return;
        const stooqValue =
            editAssetType === "stock" || editAssetType === "etf"
                ? editAssetStooq.trim() || null
                : null;
        dispatch(
            updateAsset({
                id: editAssetId,
                changes: {
                    assetType: editAssetType,
                    ticker: editAssetTicker.trim().toUpperCase(),
                    name: editAssetName.trim() || editAssetTicker.trim(),
                    stooqTicker: stooqValue,
                    cryptoQuoteAlias:
                        editAssetType === "crypto"
                            ? editAssetQuoteAlias.trim().toUpperCase() || null
                            : null,
                    updatedAt: new Date().toISOString(),
                },
            }),
        );
        const nextPieId = editAssetPieId;
        Object.values(pies).forEach((pie) => {
            if (!pie.assetIds.includes(editAssetId)) return;
            if (pie.id === nextPieId) return;
            dispatch(
                updatePie({
                    id: pie.id,
                    changes: {
                        assetIds: pie.assetIds.filter(
                            (existingId) => existingId !== editAssetId,
                        ),
                    },
                }),
            );
        });
        if (nextPieId) {
            const targetPie = pies[nextPieId];
            if (targetPie && !targetPie.assetIds.includes(editAssetId)) {
                dispatch(
                    updatePie({
                        id: targetPie.id,
                        changes: {
                            assetIds: [...targetPie.assetIds, editAssetId],
                        },
                    }),
                );
            }
        }
        setEditAssetOpen(false);
    };

    const handleWalletEditSave = () => {
        if (!wallet || !editWalletNameTrimmed || isDuplicateWalletName) return;
        dispatch(
            updateWallet({
                id: wallet.id,
                changes: {
                    name: editWalletNameTrimmed,
                    description: editWalletDescription.trim() || undefined,
                },
            }),
        );
        setEditWalletOpen(false);
    };

    const handleAddFxOperation = () => {
        if (!id) return;
        if (
            fxFromAmountValue <= 0 ||
            fxRateValue <= 0 ||
            fxFromCurrency === fxToCurrency
        ) {
            return;
        }
        const txId = `tx_${Date.now()}_fx`;
        dispatch(
            addWalletTransaction({
                id: txId,
                walletId: id,
                type: "forex",
                date: fxDate || new Date().toISOString().slice(0, 10),
                from: { value: fxFromAmountValue, currency: fxFromCurrency },
                to: { value: fxToAmountValue, currency: fxToCurrency },
                fees:
                    fxFeesValue > 0
                        ? { value: fxFeesValue, currency: fxFeeCurrency }
                        : undefined,
                fxRate: fxRateValue,
                createdAt: new Date().toISOString(),
            }),
        );
        setFxFromAmount("");
        setFxRate("");
        setFxFees("");
        setShowFxOperationFees(false);
        setFxDate(new Date().toISOString().slice(0, 10));
    };

    const handleAddTrade = () => {
        if (!id) return;
        const isExistingAsset = Boolean(tradeAssetId);
        const asset =
            tradeAssetId ||
            Object.values(assets).find(
                (existing) =>
                    existing.ticker.toLowerCase() ===
                        tradeTicker.toLowerCase() &&
                    existing.tradingCurrency === tradeCurrency,
            )?.id;

        if (fxEnabled && !hasValidTradeFxRate) return;

        let assetId = asset ?? "";
        if (tradeType === "sell" && !assetId) return;
        if (!assetId && tradeTicker) {
            assetId = `a_${Date.now()}`;
            dispatch(
                addAsset({
                    id: assetId,
                    ticker: tradeTicker.toUpperCase(),
                    stooqTicker:
                        tradeAssetType === "stock" || tradeAssetType === "etf"
                            ? tradeStooqTicker || null
                            : null,
                    tradingCurrency: tradeCurrency,
                    name: tradeName || tradeTicker.toUpperCase(),
                    assetType: tradeAssetType,
                    cryptoQuoteAlias:
                        tradeAssetType === "crypto"
                            ? tradeCurrency === "USD"
                                ? "USDT"
                                : tradeCurrency
                            : null,
                    amount: 0,
                    avgCost: { value: 0, currency: tradeCurrency },
                    txIds: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }),
            );
            if (tradePieId) {
                const pie = pies[tradePieId];
                if (pie && !pie.assetIds.includes(assetId)) {
                    dispatch(
                        updatePie({
                            id: tradePieId,
                            changes: {
                                assetIds: [...pie.assetIds, assetId],
                            },
                        }),
                    );
                }
            }
        }
        const existingAsset = assetId ? assets[assetId] : undefined;
        const shouldUpdateAssetCurrency =
            existingAsset &&
            existingAsset.amount === 0 &&
            existingAsset.tradingCurrency !== tradeCurrency;
        if (shouldUpdateAssetCurrency) {
            dispatch(
                updateAsset({
                    id: existingAsset.id,
                    changes: {
                        tradingCurrency: tradeCurrency,
                        avgCost: { value: 0, currency: tradeCurrency },
                        updatedAt: new Date().toISOString(),
                    },
                }),
            );
        }
        if (!assetId || tradeQuantityValue <= 0 || tradePriceValue <= 0) return;

        if (tradeType === "sell" && !hasSufficientAsset) return;

        const shouldForex = fxEnabled && hasValidTradeFxRate;
        const dispatchForex = () => {
            const forexId = `tx_${Date.now()}_fx`;
            dispatch(
                addWalletTransaction({
                    id: forexId,
                    walletId: id,
                    type: "forex",
                    date: tradeDate,
                    from:
                        tradeType === "sell"
                            ? { value: tradeTotal, currency: tradeCurrency }
                            : {
                                  value: roundedFundingAmountValue,
                                  currency: tradeFundingCurrency,
                              },
                    to:
                        tradeType === "sell"
                            ? {
                                  value: roundedFundingAmountValue,
                                  currency: tradeFundingCurrency,
                              }
                            : { value: tradeTotal, currency: tradeCurrency },
                    fees:
                        tradeFxFeeValue > 0
                            ? {
                                  value: tradeFxFeeValue,
                                  currency: tradeFxFeeCurrency,
                              }
                            : undefined,
                    fxRate: tradeFxRateValue,
                    createdAt: new Date().toISOString(),
                }),
            );
        };

        if (shouldForex && tradeType === "buy") {
            dispatchForex();
        }

        const txId = `tx_${Date.now()}`;
        dispatch(
            addWalletTransaction({
                id: txId,
                walletId: id,
                type: tradeType,
                assetId,
                quantity: tradeQuantityValue,
                price: { value: tradePriceValue, currency: tradeCurrency },
                fxPair: fxEnabled ? fxPair : undefined,
                fxRate:
                    fxEnabled && hasValidTradeFxRate
                        ? tradeFxRateValue
                        : undefined,
                fees:
                    tradeFeesValue > 0
                        ? { value: tradeFeesValue, currency: tradeFeesCurrency }
                        : undefined,
                pieId: isExistingAsset
                    ? selectedAssetPieId || undefined
                    : tradePieId || undefined,
                date: tradeDate,
                createdAt: new Date().toISOString(),
            }),
        );

        if (shouldForex && tradeType === "sell") {
            dispatchForex();
        }
        setTradeAssetId("");
        setTradeTicker("");
        setTradeStooqSearch("");
        setTradeStooqTicker("");
        setTradeName("");
        setTradeQuantity("");
        setTradePrice("");
        setTradeFees("");
        setTradeFxFee("");
        setTradeFundingAmount("");
        setTradeFxRate("");
    };

    return (
        <div className="pb-20">
            <header className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/wallets"
                            className="p-2 -ml-2 text-app-muted hover:text-app-foreground rounded-lg hover:bg-app-surface transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold text-app-foreground">
                            {walletName}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onMenuClick}
                            className="lg:hidden p-2 text-app-muted hover:text-app-foreground rounded-lg hover:bg-app-surface transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <SyncStatusPills />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card
                        className="p-4 cursor-pointer hover:border-app-primary/50 transition-colors"
                        onClick={() => setCashBreakdownOpen(true)}
                    >
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Wallet Value
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(
                                walletValue,
                                settings.visualCurrency,
                            )}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-app-muted">
                            <p>
                                Assets{" "}
                                {formatCurrency(
                                    totals.currentValue,
                                    settings.visualCurrency,
                                )}
                            </p>
                            <p>
                                Cash{" "}
                                {formatCurrency(
                                    cashConvertedTotal,
                                    settings.visualCurrency,
                                )}
                            </p>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Open Positions
                        </p>
                        <div className="mt-2 space-y-2">
                            <p className="text-2xl font-bold text-app-foreground">
                                {formatCurrency(
                                    totals.currentValue,
                                    settings.visualCurrency,
                                )}
                            </p>
                            <p className="text-sm text-app-muted">
                                Unrealized
                                <span
                                    className={`ml-2 font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        totals.pnl,
                                        settings.visualCurrency,
                                    )}
                                </span>
                                <span
                                    className={`ml-2 text-xs font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    ({unrealizedIsPositive ? "+" : ""}
                                    {unrealizedPercent.toFixed(1)}%)
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Cost Basis
                                <span className="ml-2 text-app-foreground font-semibold">
                                    {formatCurrency(
                                        totals.invested,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                        </div>
                    </Card>

                    <Card
                        className="p-4 cursor-pointer hover:border-app-primary/50 transition-colors"
                        onClick={() => setPerformanceBreakdownOpen(true)}
                    >
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Performance
                        </p>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-app-muted">
                                    Realized
                                    <span
                                        className={`ml-2 font-semibold ${
                                            realizedIsPositive
                                                ? "text-app-success"
                                                : "text-app-danger"
                                        }`}
                                    >
                                        {realizedIsPositive ? "+" : ""}
                                        {formatCurrency(
                                            realizedPnl,
                                            settings.visualCurrency,
                                        )}
                                    </span>
                                </span>
                                <Tooltip content="Realized PnL from completed trades using FIFO lot matching, converted using FX rates on the trade dates. Later FX moves show up in cash, so this can differ from today's reality.">
                                    <Info
                                        size={14}
                                        className="text-app-muted"
                                    />
                                </Tooltip>
                            </div>
                            <p className="text-sm text-app-muted">
                                Unrealized
                                <span
                                    className={`ml-2 font-semibold ${
                                        unrealizedIsPositive
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {unrealizedIsPositive ? "+" : ""}
                                    {formatCurrency(
                                        totals.pnl,
                                        settings.visualCurrency,
                                    )}
                                </span>
                            </p>
                            <p className="text-sm text-app-muted">
                                Total Return
                                <span
                                    className={`ml-2 font-semibold ${
                                        totalPnl >= 0
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    {totalPnl >= 0 ? "+" : ""}
                                    {formatCurrency(
                                        totalPnl,
                                        settings.visualCurrency,
                                    )}
                                </span>
                                <span
                                    className={`ml-2 text-xs font-semibold ${
                                        totalPnl >= 0
                                            ? "text-app-success"
                                            : "text-app-danger"
                                    }`}
                                >
                                    ({totalPnl >= 0 ? "+" : "-"}
                                    {totalReturnPercent.toFixed(1)}%)
                                </span>
                            </p>
                        </div>
                    </Card>
                </div>

                <Card className="p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                                Description
                            </p>
                            <p className="text-sm text-app-foreground mt-1">
                                {walletDescription}
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditWalletOpen(true)}
                            icon={<Pencil size={16} />}
                        >
                            Edit Wallet
                        </Button>
                    </div>
                </Card>

                <WalletPerformanceSection
                    currency={settings.visualCurrency}
                    locale={settings.locale}
                    baseCurrency={settings.visualCurrency}
                    transactions={walletTransactions}
                    assets={assets}
                    forexRates={forexRates}
                    getForexRate={getForexRate}
                    twrReturns={performanceMetrics.twrReturns}
                    mwrReturns={performanceMetrics.mwrReturns}
                    apyStartYear={apyStartYear}
                    apyYearOptions={apyYearOptions}
                    onApyStartYearChange={setApyStartYear}
                />

                <div className="flex flex-wrap gap-4">
                    <Button
                        variant="secondary"
                        icon={<ArrowDownLeft size={16} />}
                        onClick={() => setDepositOpen(true)}
                    >
                        Deposit Cash
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<ArrowUpRight size={16} />}
                        onClick={() => setWithdrawOpen(true)}
                    >
                        Withdraw Cash
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<WalletIcon size={16} />}
                        onClick={() => setDividendOpen(true)}
                    >
                        Add Dividend
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<ArrowLeftRight size={16} />}
                        onClick={() => setFxOpen(true)}
                    >
                        FX Operation
                    </Button>
                    <Button
                        variant="primary"
                        icon={<DollarSign size={16} />}
                        onClick={() => setTradeOpen(true)}
                    >
                        Add Trade
                    </Button>
                </div>

                <WalletAllocationSection
                    pieData={pieData}
                    holdings={holdings}
                    onEditAsset={handleEditAssetOpen}
                />

                <WalletTransactionsSection
                    transactions={sortedTransactions}
                    assets={assets}
                />
            </main>

            <Modal
                isOpen={isCashBreakdownOpen}
                onClose={() => setCashBreakdownOpen(false)}
                title="Cash by Currency"
            >
                <div className="space-y-3">
                    {cashBuckets.length > 0 ? (
                        cashBuckets.map((bucket) => (
                            <div
                                key={bucket.currency}
                                className="flex items-center justify-between rounded-lg border border-app-border px-3 py-2"
                            >
                                <span className="text-sm text-app-muted">
                                    {bucket.currency}
                                </span>
                                <span className="text-sm font-semibold text-app-foreground">
                                    {formatCurrency(
                                        bucket.value,
                                        bucket.currency,
                                    )}
                                    <span className="text-app-muted ml-2">
                                        (~
                                        {formatCurrency(
                                            toVisualMoney(
                                                bucket,
                                                settings.visualCurrency,
                                                forexRates,
                                            ),
                                            settings.visualCurrency,
                                        )}
                                        )
                                    </span>
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-app-muted">
                            No cash balances.
                        </p>
                    )}
                    {hasNegativeCash && (
                        <p className="text-xs text-app-warning">
                            Cash is negative because there aren't sufficient
                            funds for asset purchases.
                        </p>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={isPerformanceBreakdownOpen}
                onClose={() => setPerformanceBreakdownOpen(false)}
                title="Performance Breakdown"
            >
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-lg border border-app-border px-3 py-2">
                        <span className="text-app-muted">
                            Realized positive
                        </span>
                        <span className="text-app-success font-semibold">
                            {formatCurrency(
                                realizedBreakdown.positive,
                                settings.visualCurrency,
                            )}
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-app-border px-3 py-2">
                        <span className="text-app-muted">
                            Realized negative
                        </span>
                        <span className="text-app-danger font-semibold">
                            {formatCurrency(
                                realizedBreakdown.negative,
                                settings.visualCurrency,
                            )}
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-app-border px-3 py-2">
                        <span className="text-app-muted">
                            Unrealized positive
                        </span>
                        <span className="text-app-success font-semibold">
                            {formatCurrency(
                                unrealizedPositive,
                                settings.visualCurrency,
                            )}
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-app-border px-3 py-2">
                        <span className="text-app-muted">
                            Unrealized negative
                        </span>
                        <span className="text-app-danger font-semibold">
                            {formatCurrency(
                                unrealizedNegative,
                                settings.visualCurrency,
                            )}
                        </span>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isEditWalletOpen}
                onClose={() => setEditWalletOpen(false)}
                title="Edit Wallet"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Platform Name
                        </label>
                        <input
                            type="text"
                            value={editWalletName}
                            onChange={(event) =>
                                setEditWalletName(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                        {isDuplicateWalletName && (
                            <p className="mt-2 text-sm text-app-warning">
                                A wallet with this name already exists.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            value={editWalletDescription}
                            onChange={(event) =>
                                setEditWalletDescription(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleWalletEditSave}
                        disabled={
                            !editWalletNameTrimmed || isDuplicateWalletName
                        }
                    >
                        Save Changes
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={isDepositOpen}
                onClose={() => setDepositOpen(false)}
                title="Deposit Cash"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Amount
                        </label>
                        <input
                            type="number"
                            value={cashAmount}
                            onChange={handleNonNegativeChange(setCashAmount)}
                            min="0"
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            value={cashDate}
                            onChange={(event) =>
                                setCashDate(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Currency
                        </label>
                        <select
                            value={cashCurrency}
                            onChange={(event) =>
                                setCashCurrency(event.target.value as Currency)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        >
                            {currencyOptions.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => {
                            handleAddCash("deposit");
                            setDepositOpen(false);
                        }}
                        disabled={!cashAmount || Number(cashAmount) <= 0} // Disable button if amount is zero or empty
                    >
                        Add Deposit
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={isWithdrawOpen}
                onClose={() => setWithdrawOpen(false)}
                title="Withdraw Cash"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Amount
                        </label>
                        <input
                            type="number"
                            value={cashAmount}
                            onChange={handleNonNegativeChange(setCashAmount)}
                            min="0"
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            value={cashDate}
                            onChange={(event) =>
                                setCashDate(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Currency
                        </label>
                        <select
                            value={cashCurrency}
                            onChange={(event) =>
                                setCashCurrency(event.target.value as Currency)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        >
                            {currencyOptions.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => {
                            handleAddCash("withdraw");
                            setWithdrawOpen(false);
                        }}
                        disabled={!cashAmount || Number(cashAmount) <= 0} // Disable button if amount is zero or empty
                    >
                        Add Withdrawal
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={isDividendOpen}
                onClose={() => setDividendOpen(false)}
                title="Add Dividend"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Amount
                        </label>
                        <input
                            type="number"
                            value={dividendAmount}
                            onChange={handleNonNegativeChange(
                                setDividendAmount,
                            )}
                            min="0"
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Currency
                        </label>
                        <select
                            value={dividendCurrency}
                            onChange={(event) =>
                                setDividendCurrency(
                                    event.target.value as Currency,
                                )
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        >
                            {currencyOptions.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Asset (optional)
                        </label>
                        <select
                            value={dividendAssetId}
                            onChange={(event) =>
                                setDividendAssetId(event.target.value)
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        >
                            <option value="">No asset</option>
                            {Object.values(assets).map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                    {asset.ticker} • {asset.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => {
                            handleAddDividend();
                            setDividendOpen(false);
                        }}
                    >
                        Add Dividend
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={isFxOpen}
                onClose={() => setFxOpen(false)}
                title="FX Operation"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                From Amount
                            </label>
                            <input
                                type="number"
                                value={fxFromAmount}
                                onChange={handleNonNegativeChange(
                                    setFxFromAmount,
                                )}
                                min="0"
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                From Currency
                            </label>
                            <select
                                value={fxFromCurrency}
                                onChange={(event) =>
                                    setFxFromCurrency(
                                        event.target.value as Currency,
                                    )
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                {currencyOptions.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                To Currency
                            </label>
                            <select
                                value={fxToCurrency}
                                onChange={(event) =>
                                    setFxToCurrency(
                                        event.target.value as Currency,
                                    )
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                {currencyOptions.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                FX Rate ({fxPairLabel})
                            </label>
                            <input
                                type="number"
                                value={fxRate}
                                onChange={handleNonNegativeChange(setFxRate)}
                                min="0"
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            To Amount
                        </label>
                        <input
                            type="number"
                            value={
                                fxFromAmountValue > 0 && fxRateValue > 0
                                    ? fxToAmountValue.toFixed(2)
                                    : ""
                            }
                            min="0"
                            disabled
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs text-app-muted">
                            <input
                                type="checkbox"
                                checked={showFxOperationFees}
                                onChange={(event) => {
                                    const checked = event.target.checked;
                                    setShowFxOperationFees(checked);
                                    if (!checked) {
                                        setFxFees("");
                                    }
                                }}
                                className="h-4 w-4"
                            />
                            Add FX fee
                        </label>
                        {showFxOperationFees && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        FX Fee
                                    </label>
                                    <input
                                        type="number"
                                        value={fxFees}
                                        onChange={handleNonNegativeChange(
                                            setFxFees,
                                        )}
                                        min="0"
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        FX Fee Currency
                                    </label>
                                    <select
                                        value={fxFeeCurrency}
                                        onChange={(event) =>
                                            setFxFeeCurrency(
                                                event.target.value as Currency,
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((currency) => (
                                            <option
                                                key={currency}
                                                value={currency}
                                            >
                                                {currency}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            value={fxDate}
                            onChange={(event) => setFxDate(event.target.value)}
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => {
                            handleAddFxOperation();
                            setFxOpen(false);
                        }}
                        disabled={
                            fxFromAmountValue <= 0 ||
                            fxRateValue <= 0 ||
                            fxFromCurrency === fxToCurrency
                        }
                    >
                        Add FX Operation
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={isEditAssetOpen}
                onClose={() => setEditAssetOpen(false)}
                title="Edit Asset"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Ticker
                            </label>
                            <input
                                type="text"
                                value={editAssetTicker}
                                onChange={(event) =>
                                    setEditAssetTicker(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={editAssetName}
                                onChange={(event) =>
                                    setEditAssetName(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Asset Type
                            </label>
                            <select
                                value={editAssetType}
                                onChange={(event) =>
                                    setEditAssetType(
                                        event.target.value as AssetType,
                                    )
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                <option value="stock">Stock</option>
                                <option value="etf">ETF</option>
                                <option value="crypto">Crypto</option>
                                <option value="bond">Bond</option>
                                <option value="cash">Cash</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Trading Currency
                            </label>
                            <select
                                value={editAssetCurrency}
                                disabled
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            >
                                {currencyOptions.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {editAssetType === "crypto" && (
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Crypto Quote Alias
                            </label>
                            <input
                                type="text"
                                value={editAssetQuoteAlias}
                                onChange={(event) =>
                                    setEditAssetQuoteAlias(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                placeholder="USDT"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Pie
                            </label>
                            <select
                                value={editAssetPieId}
                                onChange={(event) =>
                                    setEditAssetPieId(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                <option value="">No pie</option>
                                {Object.values(pies).map((pie) => (
                                    <option key={pie.id} value={pie.id}>
                                        {pie.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">
                            Stooq Ticker
                        </label>
                        <input
                            type="text"
                            value={editAssetStooq}
                            onChange={(event) =>
                                setEditAssetStooq(event.target.value)
                            }
                            disabled={
                                editAssetType !== "stock" &&
                                editAssetType !== "etf"
                            }
                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleEditAssetSave}
                        disabled={
                            !editAssetTicker.trim() || !editAssetName.trim()
                        }
                    >
                        Update Asset
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={isTradeOpen}
                onClose={() => setTradeOpen(false)}
                title="Add Trade"
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Side
                            </label>
                            <select
                                value={tradeType}
                                onChange={(event) =>
                                    setTradeType(
                                        event.target.value as "buy" | "sell",
                                    )
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Asset (existing or new)
                            </label>
                            <select
                                value={tradeAssetId}
                                onChange={(event) =>
                                    setTradeAssetId(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                <option value="">New asset</option>
                                {existingAssets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.ticker} • {asset.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Asset Type
                            </label>
                            <select
                                value={tradeAssetType}
                                onChange={(event) =>
                                    setTradeAssetType(
                                        event.target.value as AssetType,
                                    )
                                }
                                disabled={Boolean(tradeAssetId)}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            >
                                <option value="stock">Stock</option>
                                <option value="etf">ETF</option>
                                <option value="crypto">Crypto</option>
                                <option value="bond">Bond</option>
                                <option value="cash">Cash</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Asset Currency
                            </label>
                            <select
                                value={tradeCurrency}
                                onChange={(event) =>
                                    setTradeCurrency(
                                        event.target.value as Currency,
                                    )
                                }
                                disabled={!canEditTradeCurrency}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            >
                                {currencyOptions.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Ticker
                            </label>
                            <input
                                type="text"
                                value={tradeTicker}
                                onChange={(event) =>
                                    setTradeTicker(event.target.value)
                                }
                                disabled={Boolean(tradeAssetId)}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Asset Name
                            </label>
                            <input
                                type="text"
                                value={tradeName}
                                onChange={(event) =>
                                    setTradeName(event.target.value)
                                }
                                disabled={Boolean(tradeAssetId)}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            />
                        </div>
                        {(tradeAssetType === "stock" ||
                            tradeAssetType === "etf") && (
                            <div className="col-span-2 space-y-1">
                                <label className="flex items-center gap-1 text-xs font-medium text-app-muted">
                                    Stooq ticker
                                    <Tooltip content="Stooq ticker for live pricing (stooq.com). Example: AAPL.US">
                                        <Info
                                            size={12}
                                            className="text-app-muted"
                                        />
                                    </Tooltip>
                                </label>
                                <StooqAPIStockSelect
                                    searchValue={tradeStooqSearch}
                                    onSearchChange={setTradeStooqSearch}
                                    selectedValue={tradeStooqTicker}
                                    onSelect={setTradeStooqTicker}
                                    placeholder="Search stooq ticker"
                                    disabled={Boolean(tradeAssetId)}
                                />
                                {needsStooqWarning && (
                                    <p className="text-xs text-yellow-500">
                                        Select a Stooq ticker to enable
                                        real-time price lookups.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Quantity
                            </label>
                            <input
                                type="number"
                                value={tradeQuantity}
                                onChange={handleNonNegativeChange(
                                    setTradeQuantity,
                                )}
                                min="0"
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Price (per unit)
                            </label>
                            <input
                                type="number"
                                value={tradePrice}
                                onChange={handleNonNegativeChange(
                                    setTradePrice,
                                )}
                                min="0"
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Funding Currency
                            </label>
                            <select
                                value={tradeFundingCurrency}
                                onChange={(event) =>
                                    setTradeFundingCurrency(
                                        event.target.value as Currency,
                                    )
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            >
                                {currencyOptions.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Funding Amount
                            </label>
                            <input
                                type="number"
                                value={tradeFundingAmount}
                                min="0"
                                disabled
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            />
                        </div>
                    </div>
                    {fxEnabled && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-app-muted mb-1">
                                    FX Pair
                                </label>
                                <input
                                    type="text"
                                    value={fxPair}
                                    disabled
                                    className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-app-muted mb-1">
                                    FX Rate
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={tradeFxRate}
                                        onChange={(event) =>
                                            handleNonNegativeChange(
                                                setTradeFxRate,
                                            )(event)
                                        }
                                        min="0"
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleInvertTradeFxRate}
                                        disabled={!hasValidTradeFxRate}
                                    >
                                        Invert
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    {fxEnabled && (
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs text-app-muted">
                                <input
                                    type="checkbox"
                                    checked={showFxFee}
                                    onChange={(event) => {
                                        const checked = event.target.checked;
                                        setShowFxFee(checked);
                                        if (!checked) {
                                            setTradeFxFee("");
                                        }
                                    }}
                                    className="h-4 w-4"
                                />
                                Add FX fee
                            </label>
                            {showFxFee && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-app-muted mb-1">
                                            FX Fee
                                        </label>
                                        <input
                                            type="number"
                                            value={tradeFxFee}
                                            onChange={handleNonNegativeChange(
                                                setTradeFxFee,
                                            )}
                                            min="0"
                                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-app-muted mb-1">
                                            FX Fee Currency
                                        </label>
                                        <select
                                            value={tradeFxFeeCurrency}
                                            onChange={(event) =>
                                                setTradeFxFeeCurrency(
                                                    event.target
                                                        .value as Currency,
                                                )
                                            }
                                            className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                        >
                                            {currencyOptions.map((currency) => (
                                                <option
                                                    key={currency}
                                                    value={currency}
                                                >
                                                    {currency}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs text-app-muted">
                            <input
                                type="checkbox"
                                checked={showTradeFees}
                                onChange={(event) => {
                                    const checked = event.target.checked;
                                    setShowTradeFees(checked);
                                    if (!checked) {
                                        setTradeFees("");
                                    }
                                }}
                                className="h-4 w-4"
                            />
                            Add transaction fee
                        </label>
                        {showTradeFees && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Transaction Fee
                                    </label>
                                    <input
                                        type="number"
                                        value={tradeFees}
                                        onChange={handleNonNegativeChange(
                                            setTradeFees,
                                        )}
                                        min="0"
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-muted mb-1">
                                        Fee Currency
                                    </label>
                                    <select
                                        value={tradeFeesCurrency}
                                        onChange={(event) =>
                                            setTradeFeesCurrency(
                                                event.target.value as Currency,
                                            )
                                        }
                                        className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                    >
                                        {currencyOptions.map((currency) => (
                                            <option
                                                key={currency}
                                                value={currency}
                                            >
                                                {currency}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Pie (optional)
                            </label>
                            <select
                                value={tradePieId}
                                onChange={(event) =>
                                    setTradePieId(event.target.value)
                                }
                                disabled={Boolean(tradeAssetId)}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary disabled:opacity-60"
                            >
                                <option value="">No pie</option>
                                {Object.values(pies).map((pie) => (
                                    <option key={pie.id} value={pie.id}>
                                        {pie.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                value={tradeDate}
                                onChange={(event) =>
                                    setTradeDate(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                    </div>
                    <div
                        className={`rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-muted space-y-1 transition-all duration-200 overflow-hidden ${
                            showTradeSummary
                                ? "max-h-48 opacity-100"
                                : "max-h-0 opacity-0"
                        }`}
                    >
                        {showTradeSummary && (
                            <>
                                {insufficientFundsMessage ? (
                                    <p className="text-app-warning">
                                        {insufficientFundsMessage}
                                    </p>
                                ) : (
                                    <>
                                        {lowRemainingMessage && (
                                            <p className="text-app-warning">
                                                {lowRemainingMessage}
                                            </p>
                                        )}
                                        {tradeType === "buy" ? (
                                            <p>
                                                Purchased{" "}
                                                <span className="text-app-foreground">
                                                    {tradeQuantityValue.toFixed(
                                                        2,
                                                    )}
                                                </span>{" "}
                                                units of{" "}
                                                <span className="text-app-foreground">
                                                    {tradeName ||
                                                        tradeTicker ||
                                                        "this asset"}
                                                </span>{" "}
                                                at{" "}
                                                <span className="text-app-foreground">
                                                    {tradePriceValue.toFixed(2)}{" "}
                                                    {tradeCurrency}
                                                </span>{" "}
                                                per unit
                                                {fxEnabled
                                                    ? `, using ${roundedFundingAmountValue.toFixed(
                                                          2,
                                                      )} ${tradeFundingCurrency} converted at an FX rate of ${
                                                          tradeFxRate || "-"
                                                      }`
                                                    : "."}
                                            </p>
                                        ) : (
                                            <p>
                                                Sold{" "}
                                                <span className="text-app-foreground">
                                                    {tradeQuantityValue.toFixed(
                                                        2,
                                                    )}
                                                </span>{" "}
                                                units of{" "}
                                                <span className="text-app-foreground">
                                                    {tradeName ||
                                                        tradeTicker ||
                                                        "this asset"}
                                                </span>{" "}
                                                at{" "}
                                                <span className="text-app-foreground">
                                                    {tradePriceValue.toFixed(2)}{" "}
                                                    {tradeCurrency}
                                                </span>{" "}
                                                per unit
                                                {fxEnabled
                                                    ? `, with proceeds converted to ${roundedFundingAmountValue.toFixed(
                                                          2,
                                                      )} ${tradeFundingCurrency} at an FX rate of ${
                                                          tradeFxRate || "-"
                                                      }`
                                                    : "."}
                                            </p>
                                        )}
                                        {(tradeFxFeeValue > 0 ||
                                            tradeFeesValue > 0) && (
                                            <p>
                                                Fees applied:{" "}
                                                <span className="text-app-foreground">
                                                    {tradeFxFeeValue > 0
                                                        ? `${tradeFxFeeValue.toFixed(
                                                              2,
                                                          )} ${tradeFxFeeCurrency} FX fee`
                                                        : ""}
                                                    {tradeFxFeeValue > 0 &&
                                                    tradeFeesValue > 0
                                                        ? " and "
                                                        : ""}
                                                    {tradeFeesValue > 0
                                                        ? `${tradeFeesValue.toFixed(
                                                              2,
                                                          )} ${tradeFeesCurrency} transaction fee`
                                                        : ""}
                                                    .
                                                </span>
                                            </p>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    <Button
                        className="w-full"
                        disabled={
                            !hasTradeBasics ||
                            !hasFxDetails ||
                            !hasSufficientAsset
                        }
                        onClick={() => {
                            handleAddTrade();
                            setTradeOpen(false);
                        }}
                    >
                        Add Trade
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
