import React from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectSettings } from '../../store/selectors';
import { updateSettings } from '../../store/slices/settingsSlice';
import { Currency } from '../../core/schema-types';

interface Props {
  onMenuClick: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onMenuClick }) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectSettings);
  const currencyOptions: Currency[] = ["EUR", "USD", "GBP"];

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
             </div>
          </Card>
          
          <Card title="Data Management">
             <div className="space-y-4">
                <Button variant="secondary" className="w-full justify-start">Export Data (CSV)</Button>
                <Button variant="danger" className="w-full justify-start">Delete Account</Button>
             </div>
          </Card>
       </main>
    </div>
  );
};
