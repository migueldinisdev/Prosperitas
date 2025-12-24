import React, { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "../../ui/Card";
import { LineChart } from "../../components/LineChart";
import { Button } from "../../ui/Button";
import { PieChart } from "../../components/PieChart";
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    DollarSign,
    Wallet as WalletIcon,
} from "lucide-react";
import { HoldingsTable, HoldingRow } from "../../components/HoldingsTable";
import { WalletTransactionsTable } from "../../components/WalletTransactionsTable";
import { useWalletData } from "../../hooks/useWalletData";
import { Modal } from "../../ui/Modal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addWalletTransaction } from "../../store/thunks/walletThunks";
import { addAsset } from "../../store/slices/assetsSlice";
import { AssetType, Currency } from "../../core/schema-types";
import { selectPies, selectSettings } from "../../store/selectors";

// Mock data strictly for UI demo
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

export const WalletDetail: React.FC<Props> = () => {
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

    const [cashAmount, setCashAmount] = useState(0);
    const [cashCurrency, setCashCurrency] = useState<Currency>(
        settings.balanceCurrency
    );

    const [dividendAmount, setDividendAmount] = useState(0);
    const [dividendCurrency, setDividendCurrency] = useState<Currency>(
        settings.balanceCurrency
    );
    const [dividendAssetId, setDividendAssetId] = useState<string>("");
    const [dividendTax, setDividendTax] = useState(0);
    const [dividendTaxCurrency, setDividendTaxCurrency] =
        useState<Currency>(settings.balanceCurrency);

    const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
    const [tradeTicker, setTradeTicker] = useState("");
    const [tradeName, setTradeName] = useState("");
    const [tradeAssetType, setTradeAssetType] = useState<AssetType>("stock");
    const [tradeExchange, setTradeExchange] = useState("");
    const [tradeCurrency, setTradeCurrency] =
        useState<Currency>("USD");
    const [tradeQuantity, setTradeQuantity] = useState(0);
    const [tradePrice, setTradePrice] = useState(0);
    const [tradeFees, setTradeFees] = useState(0);
    const [tradeFeesCurrency, setTradeFeesCurrency] =
        useState<Currency>("USD");
    const [tradeTax, setTradeTax] = useState(0);
    const [tradeTaxCurrency, setTradeTaxCurrency] =
        useState<Currency>("USD");
    const [tradeFxPair, setTradeFxPair] = useState("");
    const [tradeFxRate, setTradeFxRate] = useState("");
    const [tradePieId, setTradePieId] = useState("");
    const [tradeDate, setTradeDate] = useState(
        new Date().toISOString().slice(0, 10)
    );

    const walletName = wallet?.name ?? "Wallet";

    const holdings = useMemo<HoldingRow[]>(() => {
        const entries = Object.entries(walletPositions ?? {});
        const rows = entries.map(([assetId, position]) => {
            const asset = assets[assetId];
            const price = position.avgCost.value;
            const value = position.amount * price;
            return {
                asset: asset?.name ?? assetId,
                ticker: asset?.ticker ?? assetId,
                units: position.amount,
                price,
                value,
                pnl: 0,
            };
        });
        const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
        return rows.map((row) => ({
            ...row,
            allocation: totalValue > 0 ? +(row.value / totalValue * 100).toFixed(2) : 0,
        }));
    }, [walletPositions, assets]);

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
            [...walletTransactions].sort((a, b) =>
                b.date.localeCompare(a.date)
            ),
        [walletTransactions]
    );

    const handleAddCash = (type: "deposit" | "withdraw") => {
        if (!id) return;
        const txId = `tx_${Date.now()}`;
        dispatch(
            addWalletTransaction({
                id: txId,
                walletId: id,
                type,
                date: new Date().toISOString().slice(0, 10),
                amount: { value: cashAmount, currency: cashCurrency },
                createdAt: new Date().toISOString(),
            })
        );
        setCashAmount(0);
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
                amount: { value: dividendAmount, currency: dividendCurrency },
                assetId: dividendAssetId || undefined,
                tax:
                    dividendTax > 0
                        ? { value: dividendTax, currency: dividendTaxCurrency }
                        : undefined,
                createdAt: new Date().toISOString(),
            })
        );
        setDividendAmount(0);
        setDividendTax(0);
    };

    const handleAddTrade = () => {
        if (!id || !tradeTicker) return;
        const existingAsset = Object.values(assets).find(
            (asset) => asset.ticker.toLowerCase() === tradeTicker.toLowerCase()
        );
        let assetId = existingAsset?.id;
        if (!assetId) {
            assetId = `a_${Date.now()}`;
            dispatch(
                addAsset({
                    id: assetId,
                    ticker: tradeTicker.toUpperCase(),
                    exchange: tradeExchange || null,
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
        }
        if (!assetId) return;

        const txId = `tx_${Date.now()}`;
        dispatch(
            addWalletTransaction({
                id: txId,
                walletId: id,
                type: tradeType,
                assetId,
                quantity: tradeQuantity,
                price: { value: tradePrice, currency: tradeCurrency },
                fxPair: tradeFxPair || undefined,
                fxRate: tradeFxRate ? Number(tradeFxRate) : undefined,
                fees:
                    tradeFees > 0
                        ? { value: tradeFees, currency: tradeFeesCurrency }
                        : undefined,
                tax:
                    tradeTax > 0
                        ? { value: tradeTax, currency: tradeTaxCurrency }
                        : undefined,
                pieId: tradePieId || undefined,
                date: tradeDate,
                createdAt: new Date().toISOString(),
            })
        );
        setTradeTicker("");
        setTradeName("");
        setTradeQuantity(0);
        setTradePrice(0);
        setTradeFees(0);
        setTradeTax(0);
    };

    return (
        <div className="pb-20">
            <div className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-6 py-4 flex items-center gap-4">
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
                                ) : walletCash && typeof walletCash === "object" ? (
                                    Object.entries(
                                        walletCash as unknown as Record<string, number>
                                    ).map(([currency, amount]) => (
                                        <p
                                            key={currency}
                                            className="text-sm text-app-foreground"
                                        >
                                            {currency}: {Number(amount).toFixed(2)}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Current Value
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            $45,230.50
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Invested
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            $42,030.00
                        </p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Total PnL
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-app-success">
                            <ArrowUpRight size={18} />
                            <span className="text-2xl font-bold">+$3,200.50</span>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs text-app-muted uppercase tracking-wider font-semibold">
                            Cash Available
                        </p>
                        <p className="text-2xl font-bold text-app-foreground mt-1">
                            $1,200.00
                        </p>
                    </Card>
                </div>

                <Card title="Performance History">
                    <LineChart data={chartData} dataKey="value" height={300} />
                </Card>

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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Allocation" className="lg:col-span-1">
                        <PieChart data={pieData} height={250} />
                    </Card>

                    <Card title="Holdings" className="lg:col-span-2">
                        <HoldingsTable holdings={holdings} />
                    </Card>
                </div>

                <Card title="Transactions">
                    <WalletTransactionsTable
                        transactions={sortedTransactions}
                        assets={assets}
                    />
                </Card>
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
                            onChange={(event) =>
                                setCashAmount(Number(event.target.value))
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
                            onChange={(event) =>
                                setCashAmount(Number(event.target.value))
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
                            onChange={(event) =>
                                setDividendAmount(Number(event.target.value))
                            }
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
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Tax
                            </label>
                            <input
                                type="number"
                                value={dividendTax}
                                onChange={(event) =>
                                    setDividendTax(Number(event.target.value))
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Tax Currency
                            </label>
                            <select
                                value={dividendTaxCurrency}
                                onChange={(event) =>
                                    setDividendTaxCurrency(
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
                <div className="space-y-4">
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
                                Asset Type
                            </label>
                            <select
                                value={tradeAssetType}
                                onChange={(event) =>
                                    setTradeAssetType(
                                        event.target.value as AssetType
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
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
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
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Exchange
                            </label>
                            <input
                                type="text"
                                value={tradeExchange}
                                onChange={(event) =>
                                    setTradeExchange(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Trade Currency
                            </label>
                            <select
                                value={tradeCurrency}
                                onChange={(event) =>
                                    setTradeCurrency(
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Quantity
                            </label>
                            <input
                                type="number"
                                value={tradeQuantity}
                                onChange={(event) =>
                                    setTradeQuantity(Number(event.target.value))
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Price
                            </label>
                            <input
                                type="number"
                                value={tradePrice}
                                onChange={(event) =>
                                    setTradePrice(Number(event.target.value))
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Fees
                            </label>
                            <input
                                type="number"
                                value={tradeFees}
                                onChange={(event) =>
                                    setTradeFees(Number(event.target.value))
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Fees Currency
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
                                Tax
                            </label>
                            <input
                                type="number"
                                value={tradeTax}
                                onChange={(event) =>
                                    setTradeTax(Number(event.target.value))
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Tax Currency
                            </label>
                            <select
                                value={tradeTaxCurrency}
                                onChange={(event) =>
                                    setTradeTaxCurrency(
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                FX Pair
                            </label>
                            <input
                                type="text"
                                value={tradeFxPair}
                                onChange={(event) =>
                                    setTradeFxPair(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
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
                                    setTradeFxRate(event.target.value)
                                }
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>
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
                    <Button
                        className="w-full"
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
