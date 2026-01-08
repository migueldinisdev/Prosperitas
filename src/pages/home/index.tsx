import React, { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { HomeSummarySection } from "./HomeSummarySection";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Plus } from "lucide-react";
import { AddBalanceTransactionModal } from "../../components/AddBalanceTransactionModal";
import { StateSnapshotCard } from "../../components/StateSnapshotCard";
import { getMonthKey } from "../../utils/dates";
import { useNotifications } from "../../hooks/useNotifications";
import { getPrice, PriceResult } from "../../data/prices";

interface Props {
    onMenuClick: () => void;
}

export const HomePage: React.FC<Props> = ({ onMenuClick }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { notify } = useNotifications();
    const [liveStockTicker, setLiveStockTicker] = useState("GOOGL.US");
    const [liveCryptoTicker, setLiveCryptoTicker] = useState("BTCUSD");
    const [liveForexTicker, setLiveForexTicker] = useState("EURUSD");
    const [historicalStockTicker, setHistoricalStockTicker] =
        useState("GOOGL.US");
    const [historicalCryptoTicker, setHistoricalCryptoTicker] =
        useState("BTCUSD");
    const [historicalForexTicker, setHistoricalForexTicker] =
        useState("EURUSD");
    const [historicalStockDate, setHistoricalStockDate] =
        useState("2020-01-02");
    const [historicalCryptoDate, setHistoricalCryptoDate] =
        useState("2020-01-02");
    const [historicalForexDate, setHistoricalForexDate] =
        useState("2020-01-02");
    const [liveStockResult, setLiveStockResult] = useState<PriceResult | null>(
        null
    );
    const [liveCryptoResult, setLiveCryptoResult] =
        useState<PriceResult | null>(null);
    const [liveForexResult, setLiveForexResult] =
        useState<PriceResult | null>(null);
    const [historicalStockResult, setHistoricalStockResult] =
        useState<PriceResult | null>(null);
    const [historicalCryptoResult, setHistoricalCryptoResult] =
        useState<PriceResult | null>(null);
    const [historicalForexResult, setHistoricalForexResult] =
        useState<PriceResult | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const runLookup = async (payload: {
        ticker: string;
        type: "stock" | "crypto" | "forex";
        date?: string;
        onResult: (result: PriceResult) => void;
    }) => {
        setLookupError(null);
        setIsLoading(true);
        try {
            const result = await getPrice({
                ticker: payload.ticker,
                type: payload.type,
                date: payload.date,
            });
            payload.onResult(result);
        } catch (error) {
            setLookupError(
                error instanceof Error ? error.message : "Lookup failed."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pb-20">
            <PageHeader
                title="Home"
                onMenuClick={onMenuClick}
            />

            <main className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Card title="Quick Actions">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={() => setIsModalOpen(true)}
                            icon={<Plus size={16} />}
                        >
                            Add Transaction
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "info",
                                    title: "Info notification",
                                    message: "This is an info message.",
                                })
                            }
                        >
                            Test Info
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "success",
                                    title: "Success notification",
                                    message: "Everything completed successfully.",
                                })
                            }
                        >
                            Test Success
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "warning",
                                    title: "Warning notification",
                                    message: "Please double-check the details.",
                                })
                            }
                        >
                            Test Warning
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() =>
                                notify({
                                    type: "error",
                                    title: "Error notification",
                                    message: "Something went wrong.",
                                })
                            }
                        >
                            Test Error
                        </Button>
                    </div>
                </Card>
                <Card title="TEST: Price lookups">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-sm text-app-text/70">
                                Live prices (stock, crypto, forex)
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wide text-app-text/60">
                                        Stock ticker
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        value={liveStockTicker}
                                        onChange={(event) =>
                                            setLiveStockTicker(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={() =>
                                            runLookup({
                                                ticker: liveStockTicker,
                                                type: "stock",
                                                onResult: setLiveStockResult,
                                            })
                                        }
                                    >
                                        Fetch live stock
                                    </Button>
                                    {liveStockResult && (
                                        <p className="text-xs text-app-text/70">
                                            {liveStockResult.ticker} ·{" "}
                                            {liveStockResult.date} ·{" "}
                                            {liveStockResult.close.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wide text-app-text/60">
                                        Crypto ticker
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        value={liveCryptoTicker}
                                        onChange={(event) =>
                                            setLiveCryptoTicker(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={() =>
                                            runLookup({
                                                ticker: liveCryptoTicker,
                                                type: "crypto",
                                                onResult: setLiveCryptoResult,
                                            })
                                        }
                                    >
                                        Fetch live crypto
                                    </Button>
                                    {liveCryptoResult && (
                                        <p className="text-xs text-app-text/70">
                                            {liveCryptoResult.ticker} ·{" "}
                                            {liveCryptoResult.date} ·{" "}
                                            {liveCryptoResult.close.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wide text-app-text/60">
                                        Forex ticker
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        value={liveForexTicker}
                                        onChange={(event) =>
                                            setLiveForexTicker(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={() =>
                                            runLookup({
                                                ticker: liveForexTicker,
                                                type: "forex",
                                                onResult: setLiveForexResult,
                                            })
                                        }
                                    >
                                        Fetch live forex
                                    </Button>
                                    {liveForexResult && (
                                        <p className="text-xs text-app-text/70">
                                            {liveForexResult.ticker} ·{" "}
                                            {liveForexResult.date} ·{" "}
                                            {liveForexResult.close.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm text-app-text/70">
                                Historical prices
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wide text-app-text/60">
                                        Stock + date
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        value={historicalStockTicker}
                                        onChange={(event) =>
                                            setHistoricalStockTicker(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        type="date"
                                        value={historicalStockDate}
                                        onChange={(event) =>
                                            setHistoricalStockDate(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={() =>
                                            runLookup({
                                                ticker: historicalStockTicker,
                                                type: "stock",
                                                date: historicalStockDate,
                                                onResult:
                                                    setHistoricalStockResult,
                                            })
                                        }
                                    >
                                        Fetch historical stock
                                    </Button>
                                    {historicalStockResult && (
                                        <p className="text-xs text-app-text/70">
                                            {historicalStockResult.ticker} ·{" "}
                                            {historicalStockResult.date} ·{" "}
                                            {historicalStockResult.close.toFixed(
                                                4
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wide text-app-text/60">
                                        Crypto + date
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        value={historicalCryptoTicker}
                                        onChange={(event) =>
                                            setHistoricalCryptoTicker(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        type="date"
                                        value={historicalCryptoDate}
                                        onChange={(event) =>
                                            setHistoricalCryptoDate(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={() =>
                                            runLookup({
                                                ticker:
                                                    historicalCryptoTicker,
                                                type: "crypto",
                                                date: historicalCryptoDate,
                                                onResult:
                                                    setHistoricalCryptoResult,
                                            })
                                        }
                                    >
                                        Fetch historical crypto
                                    </Button>
                                    {historicalCryptoResult && (
                                        <p className="text-xs text-app-text/70">
                                            {historicalCryptoResult.ticker} ·{" "}
                                            {historicalCryptoResult.date} ·{" "}
                                            {historicalCryptoResult.close.toFixed(
                                                4
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wide text-app-text/60">
                                        Forex + date
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        value={historicalForexTicker}
                                        onChange={(event) =>
                                            setHistoricalForexTicker(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <input
                                        className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm"
                                        type="date"
                                        value={historicalForexDate}
                                        onChange={(event) =>
                                            setHistoricalForexDate(
                                                event.target.value
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={() =>
                                            runLookup({
                                                ticker: historicalForexTicker,
                                                type: "forex",
                                                date: historicalForexDate,
                                                onResult:
                                                    setHistoricalForexResult,
                                            })
                                        }
                                    >
                                        Fetch historical forex
                                    </Button>
                                    {historicalForexResult && (
                                        <p className="text-xs text-app-text/70">
                                            {historicalForexResult.ticker} ·{" "}
                                            {historicalForexResult.date} ·{" "}
                                            {historicalForexResult.close.toFixed(
                                                4
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {lookupError && (
                            <p className="text-sm text-app-danger">
                                {lookupError}
                            </p>
                        )}
                    </div>
                </Card>
                <StateSnapshotCard />

                <HomeSummarySection />
            </main>

            <AddBalanceTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                monthKey={getMonthKey(new Date())}
            />
        </div>
    );
};
