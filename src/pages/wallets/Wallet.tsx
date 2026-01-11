import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "../../ui/Card";
import { AreaChart } from "../../components/AreaChart";
import { Button } from "../../ui/Button";
import { PieChart } from "../../components/PieChart";
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    DollarSign,
    Info,
    Menu,
    Wallet as WalletIcon,
} from "lucide-react";
import { HoldingRow, HoldingsTable } from "../../components/HoldingsTable";
import { WalletTransactionsTable } from "../../components/WalletTransactionsTable";
import { StooqAPIStockSelect } from "../../components/StooqAPIStockSelect";
import { SyncStatusPills } from "../../components/SyncStatusPills";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useWalletData } from "../../hooks/useWalletData";
import { useAssetLivePrices } from "../../hooks/useAssetLivePrices";
import { useForexLivePrices } from "../../hooks/useForexLivePrices";
import { Modal } from "../../ui/Modal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addWalletTransaction } from "../../store/thunks/walletThunks";
import { addAsset } from "../../store/slices/assetsSlice";
import { updatePie } from "../../store/slices/piesSlice";
import { selectPies, selectSettings } from "../../store/selectors";
import {
    Asset,
    AssetType,
    Currency,
    AssetsState,
    WalletTx,
} from "../../core/schema-types";
import {
    getAllocationPercent,
    getConvertedValue,
    getPnL,
    getPnLPercent,
    getPositionCurrentValue,
    getPositionInvestedValue,
    getTotalValue,
} from "../../core/finance";
import { formatCurrency } from "../../utils/formatters";

// Mock data strictly for UI demoß
const chartData = [
    { name: "Jan", value: 40000 },
    { name: "Feb", value: 42000 },
    { name: "Mar", value: 41500 },
    { name: "Apr", value: 43000 },
    { name: "May", value: 45230 },
];

const currencyOptions: Currency[] = ["EUR", "USD"];

interface Props {
    onMenuClick: () => void;
}

const roundToTwo = (value: number) => Math.round(value * 100) / 100;
const formatFundingAmount = (value: number) => roundToTwo(value).toFixed(2);

interface WalletAllocationSectionProps {
    pieData: { name: string; value: number; color: string }[];
    holdings: HoldingRow[];
}

const WalletPerformanceSection = React.memo(() => (
    <Card title="Performance History">
        <AreaChart data={chartData} dataKey="value" height={300} />
    </Card>
));

const WalletAllocationSection = React.memo(
    ({ pieData, holdings }: WalletAllocationSectionProps) => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Allocation" className="lg:col-span-1">
                <PieChart data={pieData} height={250} />
            </Card>

            <Card title="Holdings" className="lg:col-span-2">
                <HoldingsTable holdings={holdings} />
            </Card>
        </div>
    )
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
    )
);

export const WalletDetail: React.FC<Props> = ({ onMenuClick }) => {
    const { id } = useParams();
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectSettings);
    const pies = useAppSelector(selectPies);

    const { wallet, walletCash, walletTransactions, walletPositions, assets } =
        useWalletData(id);

    const [isDepositOpen, setDepositOpen] = useState(false);
    const [isWithdrawOpen, setWithdrawOpen] = useState(false);
    const [isDividendOpen, setDividendOpen] = useState(false);
    const [isTradeOpen, setTradeOpen] = useState(false);

    const [cashAmount, setCashAmount] = useState("");
    const [cashCurrency, setCashCurrency] = useState<Currency>(
        settings.balanceCurrency
    );

    const [dividendAmount, setDividendAmount] = useState("");
    const [dividendCurrency, setDividendCurrency] = useState<Currency>(
        settings.balanceCurrency
    );
    const [dividendAssetId, setDividendAssetId] = useState<string>("");

    const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
    const [tradeAssetId, setTradeAssetId] = useState("");
    const [tradeTicker, setTradeTicker] = useState("");
    const [tradeStooqSearch, setTradeStooqSearch] = useState("");
    const [tradeStooqTicker, setTradeStooqTicker] = useState("");
    const [tradeName, setTradeName] = useState("");
    const [tradeAssetType, setTradeAssetType] = useState<AssetType>("stock");
    const [tradeCurrency, setTradeCurrency] = useState<Currency>("USD");
    const [tradeFundingCurrency, setTradeFundingCurrency] = useState<Currency>(
        settings.balanceCurrency
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
        new Date().toISOString().slice(0, 10)
    );

    const [showTradeFees, setShowTradeFees] = useState(false);
    const [showFxFee, setShowFxFee] = useState(false);

    const walletName = wallet?.name ?? "Wallet";
    const tradeQuantityValue = Number(tradeQuantity);
    const tradePriceValue = Number(tradePrice);
    const tradeTotal = tradeQuantityValue * tradePriceValue;
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
    const hasFxDetails = fxEnabled ? Number(tradeFxRate) > 0 : true;
    const showTradeSummary = hasTradeBasics && hasFxDetails;
    const needsStooqWarning = tradeStooqTicker.trim().length === 0;
    const fundingCurrency = fxEnabled ? tradeFundingCurrency : tradeCurrency;
    const tradeFundingAmountValue = Number(tradeFundingAmount);
    const roundedFundingAmountValue = roundToTwo(tradeFundingAmountValue);
    const requiredFundingBase = fxEnabled
        ? roundedFundingAmountValue
        : roundToTwo(tradeTotal);

    const existingAssets = useMemo(
        () =>
            Object.values(assets).sort((a, b) =>
                a.ticker.localeCompare(b.ticker)
            ),
        [assets]
    );

    const selectedAsset = tradeAssetId ? assets[tradeAssetId] : undefined;
    const selectedAssetPieId = useMemo(() => {
        if (!tradeAssetId) return "";
        return (
            Object.values(pies).find((pie) =>
                pie.assetIds.includes(tradeAssetId)
            )?.id ?? ""
        );
    }, [pies, tradeAssetId]);

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
                tradeTotal > 0 ? formatFundingAmount(tradeTotal) : ""
            );
            return;
        }
        const rate = Number(tradeFxRate);
        if (rate <= 0) {
            setTradeFundingAmount("");
            return;
        }
        setTradeFundingAmount(
            tradeType === "sell"
                ? formatFundingAmount(tradeTotal * rate)
                : formatFundingAmount(tradeTotal / rate)
        );
    }, [fxEnabled, tradeFxRate, tradeTotal, tradeType]);

    useEffect(() => {
        if (tradeAssetType !== "stock") {
            setTradeStooqSearch("");
            setTradeStooqTicker("");
        }
    }, [tradeAssetType]);

    const positionEntries = useMemo(
        () =>
            Object.entries(walletPositions ?? {}).filter(
                ([, position]) => position.amount > 0
            ),
        [walletPositions]
    );

    const positionAssets = useMemo(
        () =>
            positionEntries
                .map(([assetId]) => assets[assetId])
                .filter((asset): asset is Asset => Boolean(asset)),
        [assets, positionEntries]
    );

    const livePricesByAsset = useAssetLivePrices(positionAssets);

    const { holdings, totals } = useMemo(() => {
        const rows = positionEntries.map(([assetId, position]) => {
            const asset = assets[assetId];
            const costAverage = position.avgCost.value;
            const currentPrice =
                livePricesByAsset[assetId] ?? position.avgCost.value;
            const value = getPositionCurrentValue(
                position.amount,
                currentPrice
            );
            const investedValue = getPositionInvestedValue(
                position.amount,
                costAverage
            );
            const pnl = getPnL(value, investedValue);
            const pnlPercent = getPnLPercent(value, investedValue);

            return {
                row: {
                    asset: asset?.name ?? assetId,
                    ticker: asset?.ticker ?? assetId,
                    units: position.amount,
                    costAverage,
                    currentPrice,
                    value,
                    pnl,
                    pnlPercent: Number(pnlPercent.toFixed(2)),
                    currency:
                        asset?.tradingCurrency ?? position.avgCost.currency,
                },
                investedValue,
            };
        });

        const totalValue = getTotalValue(rows.map((item) => item.row.value));
        const totalInvested = getTotalValue(
            rows.map((item) => item.investedValue)
        );
        const totalPnL = getTotalValue(rows.map((item) => item.row.pnl));

        return {
            holdings: rows.map(({ row }) => ({
                ...row,
                allocation: Number(
                    getAllocationPercent(row.value, totalValue).toFixed(2)
                ),
            })),
            totals: {
                currentValue: totalValue,
                invested: totalInvested,
                pnl: totalPnL,
            },
        };
    }, [assets, livePricesByAsset, positionEntries]);

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
                })
            );
        }
        return [];
    }, [walletCash]);

    const cashCurrencies = useMemo(
        () => cashBuckets.map((bucket) => bucket.currency),
        [cashBuckets]
    );
    const forexRates = useForexLivePrices(
        cashCurrencies,
        settings.visualCurrency
    );
    const cashConvertedTotal = useMemo(() => {
        return getTotalValue(
            cashBuckets.map((bucket) => {
                if (bucket.currency === settings.visualCurrency) {
                    return bucket.value;
                }
                const rate = forexRates[bucket.currency];
                if (!rate) return bucket.value;
                return getConvertedValue(bucket.value, rate);
            })
        );
    }, [cashBuckets, forexRates, settings.visualCurrency]);

    const walletValue = totals.currentValue + cashConvertedTotal;

    const pieData = useMemo(
        () =>
            holdings.map((holding) => ({
                name: holding.ticker,
                value: holding.value,
                color: "#6366f1",
            })),
        [holdings]
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
        [walletTransactions]
    );

    const handleNonNegativeChange =
        (setter: React.Dispatch<React.SetStateAction<string>>) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = event.target;
            if (value.startsWith("-")) return;
            setter(value);
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

    const getAvailableCashAfterBase = (currency: Currency) => {
        let available = getWalletCashValue(currency);
        if (tradeType === "buy") {
            if (currency === fundingCurrency) {
                available -= requiredFundingBase;
            }
        } else {
            if (currency === tradeCurrency) {
                available += tradeTotal;
            }
            if (fxEnabled && currency === tradeCurrency) {
                available -= tradeTotal;
            }
            if (fxEnabled && currency === tradeFundingCurrency) {
                available += roundedFundingAmountValue;
            }
        }
        return roundToTwo(available);
    };

    const tradeFeesValue = showTradeFees ? Number(tradeFees) : 0;
    const tradeFxFeeValue = showFxFee ? Number(tradeFxFee) : 0;
    const feeNeeds = new Map<Currency, number>();
    if (tradeFeesValue > 0) {
        feeNeeds.set(
            tradeFeesCurrency,
            (feeNeeds.get(tradeFeesCurrency) ?? 0) + tradeFeesValue
        );
    }
    if (tradeFxFeeValue > 0) {
        feeNeeds.set(
            tradeFxFeeCurrency,
            (feeNeeds.get(tradeFxFeeCurrency) ?? 0) + tradeFxFeeValue
        );
    }

    const hasSufficientFunding =
        tradeType === "buy"
            ? roundToTwo(getWalletCashValue(fundingCurrency)) >=
              requiredFundingBase
            : true;
    const hasSufficientFees = Array.from(feeNeeds.entries()).every(
        ([currency, amount]) =>
            getAvailableCashAfterBase(currency) >= roundToTwo(amount)
    );
    const hasSufficientAsset =
        tradeType === "sell"
            ? (walletPositions?.[tradeAssetId]?.amount ?? 0) >=
              tradeQuantityValue
            : true;
    const hasSufficientFunds = hasSufficientFunding && hasSufficientFees;
    const insufficientFundsMessage =
        hasTradeBasics &&
        hasFxDetails &&
        tradeType === "buy" &&
        !hasSufficientFunding
            ? `Insufficient ${fundingCurrency} funds for this purchase.`
            : hasTradeBasics && hasFxDetails && !hasSufficientFees
            ? "Insufficient funds to cover fees."
            : hasTradeBasics &&
              hasFxDetails &&
              tradeType === "sell" &&
              !hasSufficientAsset
            ? "Insufficient assets to sell."
            : "";

    const handleAddCash = (type: "deposit" | "withdraw") => {
        if (!id) return;
        const txId = `tx_${Date.now()}`;
        dispatch(
            addWalletTransaction({
                id: txId,
                walletId: id,
                type,
                date: new Date().toISOString().slice(0, 10),
                amount: { value: Number(cashAmount), currency: cashCurrency },
                createdAt: new Date().toISOString(),
            })
        );
        setCashAmount("");
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
            })
        );
        setDividendAmount("");
    };

    const handleAddTrade = () => {
        if (!id) return;
        const isExistingAsset = Boolean(tradeAssetId);
        const asset =
            tradeAssetId ||
            Object.values(assets).find(
                (existing) =>
                    existing.ticker.toLowerCase() === tradeTicker.toLowerCase()
            )?.id;

        if (fxEnabled && Number(tradeFxRate) <= 0) return;

        let assetId = asset ?? "";
        if (tradeType === "sell" && !assetId) return;
        if (!assetId && tradeTicker) {
            assetId = `a_${Date.now()}`;
            dispatch(
                addAsset({
                    id: assetId,
                    ticker: tradeTicker.toUpperCase(),
                    stooqTicker:
                        tradeAssetType === "stock"
                            ? tradeStooqTicker || null
                            : null,
                    tradingCurrency: tradeCurrency,
                    name: tradeName || tradeTicker.toUpperCase(),
                    assetType: tradeAssetType,
                    decimals: tradeAssetType === "crypto" ? 8 : 2,
                    amount: 0,
                    avgCost: { value: 0, currency: tradeCurrency },
                    txIds: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
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
                        })
                    );
                }
            }
        }
        if (!assetId || tradeQuantityValue <= 0 || tradePriceValue <= 0) return;

        if (!hasSufficientFunds) return;
        if (tradeType === "sell" && !hasSufficientAsset) return;

        const shouldForex = fxEnabled && Number(tradeFxRate) > 0;
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
                    fxRate: Number(tradeFxRate),
                    createdAt: new Date().toISOString(),
                })
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
                    fxEnabled && tradeFxRate ? Number(tradeFxRate) : undefined,
                fees:
                    tradeFeesValue > 0
                        ? { value: tradeFeesValue, currency: tradeFeesCurrency }
                        : undefined,
                pieId: isExistingAsset
                    ? selectedAssetPieId || undefined
                    : tradePieId || undefined,
                date: tradeDate,
                createdAt: new Date().toISOString(),
            })
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
                <Card title="Wallet State (Redux)">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                                Name
                            </p>
                            <p className="text-lg font-semibold text-app-foreground">
                                {wallet?.name ?? "Unknown wallet"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                                Transactions
                            </p>
                            <p className="text-lg font-semibold text-app-foreground">
                                {walletTransactions.length}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                                Cash Buckets
                            </p>
                            <div className="space-y-1">
                                {walletCash && Array.isArray(walletCash) ? (
                                    walletCash.map((m) => (
                                        <p
                                            key={m.currency}
                                            className="text-sm text-app-foreground"
                                        >
                                            {m.currency}: {m.value.toFixed(2)}
                                        </p>
                                    ))
                                ) : walletCash &&
                                  typeof walletCash === "object" ? (
                                    Object.entries(
                                        walletCash as unknown as Record<
                                            string,
                                            number
                                        >
                                    ).map(([currency, amount]) => (
                                        <p
                                            key={currency}
                                            className="text-sm text-app-foreground"
                                        >
                                            {currency}:{" "}
                                            {Number(amount).toFixed(2)}
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-sm text-app-muted">
                                        No cash data
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Wallet Value
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(
                                walletValue,
                                settings.visualCurrency
                            )}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Current Value
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(
                                totals.currentValue,
                                settings.visualCurrency
                            )}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Invested
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            {formatCurrency(
                                totals.invested,
                                settings.visualCurrency
                            )}
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Total PnL
                        </p>
                        <div
                            className={`flex items-center gap-1 mt-1 ${
                                totals.pnl > 0
                                    ? "text-app-success"
                                    : totals.pnl < 0
                                    ? "text-app-danger"
                                    : "text-app-muted"
                            }`}
                        >
                            {totals.pnl >= 0 ? (
                                <ArrowUpRight size={18} />
                            ) : (
                                <ArrowDownLeft size={18} />
                            )}
                            <span className="text-2xl font-bold">
                                {totals.pnl > 0 ? "+" : ""}
                                {formatCurrency(
                                    totals.pnl,
                                    settings.visualCurrency
                                )}
                            </span>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Cash Available
                        </p>
                        <div className="mt-1 space-y-1">
                            {cashBuckets.length > 0 ? (
                                cashBuckets.map((bucket) => (
                                    <p
                                        key={bucket.currency}
                                        className="text-lg font-semibold text-app-foreground"
                                    >
                                        {formatCurrency(
                                            bucket.value,
                                            bucket.currency
                                        )}
                                    </p>
                                ))
                            ) : (
                                <p className="text-sm text-app-muted">-</p>
                            )}
                        </div>
                    </Card>
                </div>

                <WalletPerformanceSection />

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
                />

                <WalletTransactionsSection
                    transactions={sortedTransactions}
                    assets={assets}
                />
            </main>

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
                                setDividendAmount
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
                                    event.target.value as Currency
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
                                        event.target.value as "buy" | "sell"
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
                                        event.target.value as AssetType
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
                                        event.target.value as Currency
                                    )
                                }
                                disabled={Boolean(tradeAssetId)}
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
                        {tradeAssetType === "stock" && (
                            <div className="col-span-2 space-y-1">
                                <label className="flex items-center gap-1 text-xs font-medium text-app-muted">
                                    Stooq ticker
                                    <Info
                                        size={12}
                                        className="text-app-muted"
                                        title="For real-time market pricing, put here the stooq ticker (stooq.com)"
                                    />
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
                                    setTradeQuantity
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
                                    setTradePrice
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
                                        event.target.value as Currency
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
                                <input
                                    type="number"
                                    value={tradeFxRate}
                                    onChange={(event) =>
                                        handleNonNegativeChange(setTradeFxRate)(
                                            event
                                        )
                                    }
                                    min="0"
                                    className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                                />
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
                                                setTradeFxFee
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
                                                        .value as Currency
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
                                            setTradeFees
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
                                                event.target.value as Currency
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
                                        {tradeType === "buy" ? (
                                            <p>
                                                Purchased{" "}
                                                <span className="text-app-foreground">
                                                    {tradeQuantityValue.toFixed(
                                                        2
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
                                                          2
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
                                                        2
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
                                                          2
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
                                                              2
                                                          )} ${tradeFxFeeCurrency} FX fee`
                                                        : ""}
                                                    {tradeFxFeeValue > 0 &&
                                                    tradeFeesValue > 0
                                                        ? " and "
                                                        : ""}
                                                    {tradeFeesValue > 0
                                                        ? `${tradeFeesValue.toFixed(
                                                              2
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
                            !hasSufficientFunds ||
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
