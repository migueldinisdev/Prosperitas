import React, { useState } from "react";
import {
    HashRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";
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
import { useSyncStatus } from "./store/syncStatus";
import { Notifications } from "./components/Notifications";
import { FullPageLoader } from "./components/FullPageLoader";

const AppRoutes: React.FC<{
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (value: boolean) => void;
}> = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const location = useLocation();
    const { mode, isRestoring, status } = useSyncStatus();
    const isLoggedIn = mode !== null;
    const isLanding = location.pathname === "/";

    // Warn user before closing tab if in cloud mode with unsaved changes
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (mode === "cloud" && status === "unsaved") {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [mode, status]);

    // Show full-page loader while restoring cloud session
    if (isRestoring) {
        return (
            <FullPageLoader message="Loading your data from Google Drive..." />
        );
    }

    return (
        <div className="flex min-h-screen bg-app-bg text-app-foreground font-sans selection:bg-app-primary/20">
            <Notifications />
            {!isLanding && (
                <LateralMenu
                    isMobileOpen={isMobileMenuOpen}
                    setIsMobileOpen={setIsMobileMenuOpen}
                />
            )}

            <div
                className={
                    isLanding
                        ? "flex-1"
                        : "flex-1 lg:ml-64 min-h-screen flex flex-col"
                }
            >
                <Routes>
                    <Route
                        path="/"
                        element={
                            isLoggedIn ? (
                                <Navigate to="/home" replace />
                            ) : (
                                <LandingPage />
                            )
                        }
                    />
                    <Route
                        path="/home"
                        element={
                            isLoggedIn ? (
                                <HomePage
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/balance"
                        element={
                            isLoggedIn ? (
                                <BalancePage
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />

                    <Route
                        path="/wallets"
                        element={
                            isLoggedIn ? (
                                <WalletsPage
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/wallets/:id"
                        element={
                            isLoggedIn ? (
                                <WalletDetail
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />

                    <Route
                        path="/pies"
                        element={
                            isLoggedIn ? (
                                <PiesPage
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/pies/:id"
                        element={
                            isLoggedIn ? (
                                <PieDetail
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />

                    <Route
                        path="/statistics"
                        element={
                            isLoggedIn ? (
                                <StatisticsPage
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/help"
                        element={
                            isLoggedIn ? (
                                <HelpPage
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            isLoggedIn ? (
                                <SettingsPage
                                    onMenuClick={() =>
                                        setIsMobileMenuOpen(true)
                                    }
                                />
                            ) : (
                                <Navigate to="/" replace />
                            )
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
        <HashRouter>
            <AppRoutes
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
        </HashRouter>
    );
};

export default App;
