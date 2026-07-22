import React, { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNotifications } from '../../hooks/useNotifications';
import { selectSettings } from '../../store/selectors';
import { updateSettings } from '../../store/slices/settingsSlice';
import { Currency } from '../../core/schema-types';
import {
  clearAllCachedPrices,
  clearCachedPricesForTicker,
} from '../../data/prices';

interface Props {
  onMenuClick: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onMenuClick }) => {
  const dispatch = useAppDispatch();
  const { notify } = useNotifications();
  const settings = useAppSelector(selectSettings);
  const currencyOptions: Currency[] = ["EUR", "USD", "GBP"];
  const [clearTarget, setClearTarget] = useState<"benchmark" | "all" | null>(null);
  const [isClearingPrices, setIsClearingPrices] = useState(false);
  const benchmarkTicker = settings.sp500AccSymbol.trim().toUpperCase();

  const handleClearPrices = async () => {
    if (!clearTarget || isClearingPrices) return;

    setIsClearingPrices(true);
    try {
      const deletedCount = clearTarget === "benchmark"
        ? await clearCachedPricesForTicker({
            type: "stock",
            ticker: benchmarkTicker,
          })
        : await clearAllCachedPrices();
      notify({
        type: "success",
        title: "Price cache cleared",
        message: `${deletedCount} cached price ${deletedCount === 1 ? "entry was" : "entries were"} removed.`,
      });
      setClearTarget(null);
    } catch (error) {
      notify({
        type: "error",
        title: "Unable to clear price cache",
        message: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsClearingPrices(false);
    }
  };

  return (
    <div>
       <PageHeader title="Settings" onMenuClick={onMenuClick} />
       <main className="p-6 max-w-4xl mx-auto space-y-6">
          <Card title="Appearance">
             <div className="flex items-center justify-between py-2">
                <span className="text-app-foreground">Theme</span>
                <ThemeToggle />
             </div>
          </Card>

          <Card title="Localization">
             <div>
                <label className="block text-xs font-medium text-app-muted mb-1">
                   Visualization Currency
                </label>
                <select
                   value={settings.visualCurrency}
                   onChange={(event) =>
                      dispatch(
                         updateSettings({
                            visualCurrency: event.target.value as Currency,
                         })
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
          </Card>

          <Card title="Price Requests">
             <div>
                <label className="block text-xs font-medium text-app-muted mb-1">
                   Requests per second
                </label>
                <input
                   type="number"
                   min={1}
                   max={1000}
                   step={1}
                   value={settings.priceRequestsPerSecond}
                   onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isFinite(value)) return;
                      dispatch(
                         updateSettings({
                            priceRequestsPerSecond: Math.min(
                               1000,
                               Math.max(1, Math.round(value)),
                            ),
                         })
                      );
                   }}
                   className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                />
                <p className="text-xs text-app-muted mt-1">
                   Requests above this one-second limit wait in the queue.
                </p>
             </div>
          </Card>

          <Card title="Benchmark">
             <div className="space-y-4">
                <div>
                   <label className="block text-xs font-medium text-app-muted mb-1">
                      S&P 500 Acc Symbol
                   </label>
                   <input
                      type="text"
                      value={settings.sp500AccSymbol}
                      onChange={(event) =>
                         dispatch(
                            updateSettings({
                               sp500AccSymbol: event.target.value.toUpperCase(),
                            })
                         )
                      }
                      className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary"
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-app-muted mb-1">
                      Symbol Currency
                   </label>
                   <select
                      value={settings.sp500AccCurrency}
                      onChange={(event) =>
                         dispatch(
                            updateSettings({
                               sp500AccCurrency: event.target.value as Currency,
                            })
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
                <div className="border-t border-app-border pt-4 space-y-3">
                   <div>
                      <p className="text-sm font-medium text-app-foreground">
                         Historical price cache
                      </p>
                      <p className="text-xs text-app-muted mt-1">
                         Cleared prices will be downloaded again when they are needed.
                      </p>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                         variant="secondary"
                         onClick={() => setClearTarget("benchmark")}
                         disabled={!benchmarkTicker || isClearingPrices}
                      >
                         Clear {benchmarkTicker || "benchmark"} prices
                      </Button>
                      <Button
                         variant="danger"
                         onClick={() => setClearTarget("all")}
                         disabled={isClearingPrices}
                      >
                         Clear all prices
                      </Button>
                   </div>
                </div>
             </div>
          </Card>
          
          <Card title="Data Management">
             <div className="space-y-4">
                <Button variant="secondary" className="w-full justify-start">Export Data (CSV)</Button>
                <Button variant="danger" className="w-full justify-start">Delete Account</Button>
             </div>
          </Card>
       </main>
       <ConfirmModal
          isOpen={clearTarget !== null}
          onClose={() => {
             if (!isClearingPrices) setClearTarget(null);
          }}
          onConfirm={() => {
             void handleClearPrices();
          }}
          title={clearTarget === "all" ? "Clear all cached prices?" : `Clear ${benchmarkTicker} prices?`}
          description={
             clearTarget === "all"
                ? "This removes every cached stock, cryptocurrency, and foreign-exchange price. Values will be downloaded again when needed."
                : `This removes every cached stock price for ${benchmarkTicker}. Values will be downloaded again when needed.`
          }
          confirmLabel={isClearingPrices ? "Clearing…" : "Clear prices"}
       />
    </div>
  );
};
