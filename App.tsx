import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LateralMenu } from './components/LateralMenu';
import { HomePage } from './pages/home';
import { BalancePage } from './pages/balance';
import { WalletsPage } from './pages/wallets';
import { WalletDetail } from './pages/wallets/Wallet';
import { PiesPage } from './pages/pies';
import { StatisticsPage } from './pages/statistics';
import { HelpPage } from './pages/help';
import { SettingsPage } from './pages/settings';

const App: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-app-bg text-app-text-primary font-sans selection:bg-indigo-500/30">
        <LateralMenu 
          isMobileOpen={isMobileMenuOpen} 
          setIsMobileOpen={setIsMobileMenuOpen} 
        />
        
        <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            <Route path="/balance" element={<BalancePage onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            
            <Route path="/wallets" element={<WalletsPage onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            <Route path="/wallets/:id" element={<WalletDetail onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            
            <Route path="/pies" element={<PiesPage onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            {/* Pie Detail would go here similar to WalletDetail */}
            <Route path="/pies/:id" element={<div className="p-10 text-center text-app-text-tertiary">Pie Details Mock</div>} />
            
            <Route path="/statistics" element={<StatisticsPage onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            <Route path="/help" element={<HelpPage onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            <Route path="/settings" element={<SettingsPage onMenuClick={() => setIsMobileMenuOpen(true)} />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;