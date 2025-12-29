import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LateralMenu } from "./components/LateralMenu";
import { HomePage } from "./pages/home";
import { LandingPage } from "./pages/landing";
import { BalancePage } from "./pages/balance";
import { WalletsPage } from "./pages/wallets";
import { WalletDetail } from "./pages/wallets/Wallet";
import { PiesPage } from "./pages/pies";
import { PieDetail } from "./pages/pies/PieDetail";
import { StatisticsPage } from "./pages/statistics";
import { HelpPage } from "./pages/help";
import { SettingsPage } from "./pages/settings";
import {
    GoogleDriveSyncProvider,
    useGoogleDriveSync,
} from "./hooks/useGoogleDriveSync";

const GoogleDriveInitializer: React.FC = () => {
    const { trySilentSignIn, loadFromDrive } = useGoogleDriveSync();

    useEffect(() => {
        const initialize = async () => {
            const authenticated = await trySilentSignIn();
            if (authenticated) {
                await loadFromDrive();
            }
        };

        initialize();
    }, [trySilentSignIn, loadFromDrive]);

    return null;
};

const AppRoutes: React.FC<{
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (value: boolean) => void;
}> = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const location = useLocation();
    const isLanding = location.pathname === "/";
    const { isAuthenticated, hasAttemptedSilentSignIn } =
        useGoogleDriveSync();
    const shouldForceLanding =
        hasAttemptedSilentSignIn && !isAuthenticated && !isLanding;
    const showLanding = isLanding || shouldForceLanding;

    return (
        <div className="flex min-h-screen bg-app-bg text-app-foreground font-sans selection:bg-app-primary/20">
            {shouldForceLanding && <Navigate to="/" replace />}
            {!showLanding && (
                <LateralMenu
                    isMobileOpen={isMobileMenuOpen}
                    setIsMobileOpen={setIsMobileMenuOpen}
                />
            )}

            <div className={showLanding ? "flex-1" : "flex-1 lg:ml-64 min-h-screen flex flex-col"}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route
                        path="/home"
                        element={
                            <HomePage
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />
                    <Route
                        path="/balance"
                        element={
                            <BalancePage
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />

                    <Route
                        path="/wallets"
                        element={
                            <WalletsPage
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />
                    <Route
                        path="/wallets/:id"
                        element={
                            <WalletDetail
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />

                    <Route
                        path="/pies"
                        element={
                            <PiesPage
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />
                    <Route
                        path="/pies/:id"
                        element={
                            <PieDetail
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />

                    <Route
                        path="/statistics"
                        element={
                            <StatisticsPage
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />
                    <Route
                        path="/help"
                        element={
                            <HelpPage
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <SettingsPage
                                onMenuClick={() =>
                                    setIsMobileMenuOpen(true)
                                }
                            />
                        }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <GoogleDriveSyncProvider>
            <GoogleDriveInitializer />
            <HashRouter>
                <AppRoutes
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
            </HashRouter>
        </GoogleDriveSyncProvider>
    );
};

export default App;
