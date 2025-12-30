import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Wallet,
    PieChart,
    BarChart3,
    Settings,
    HelpCircle,
    Landmark,
    ChevronRight,
    Download,
    X,
    LogOut,
} from "lucide-react";
import { exportToFile } from "../store/sync";
import { useDispatch } from "react-redux";
import { replaceState } from "../store/actions";
import { defaultState } from "../store/initialState";
import { persistor } from "../store";
import { useSyncStatus } from "../store/syncStatus";

interface LateralMenuProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (v: boolean) => void;
}

interface NavLinkProps {
    item: any;
    isActive: boolean;
    onClick: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ item, isActive, onClick }) => {
    return (
        <Link
            to={item.path}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                    ? "bg-app-primary/15 text-app-foreground"
                    : "text-app-muted hover:text-app-foreground hover:bg-app-surface"
            }`}
        >
            <item.icon
                size={20}
                className={
                    isActive
                        ? "text-app-primary"
                        : "text-app-muted group-hover:text-app-foreground"
                }
            />
            <span>{item.name}</span>
            {isActive && (
                <ChevronRight size={14} className="ml-auto text-app-muted" />
            )}
        </Link>
    );
};

export const LateralMenu: React.FC<LateralMenuProps> = ({
    isMobileOpen,
    setIsMobileOpen,
}) => {
    const location = useLocation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { resetSession, suppressNextDirty } = useSyncStatus();
    const runAction = async (action: () => Promise<void>) => {
        try {
            await action();
        } catch (error) {
            console.error(error);
        } finally {
            setIsMobileOpen(false);
        }
    };

    const navItems = [
        { name: "Home", path: "/home", icon: LayoutDashboard },
        { name: "Balance", path: "/balance", icon: Landmark },
        { name: "Wallets", path: "/wallets", icon: Wallet },
        { name: "Pies", path: "/pies", icon: PieChart },
        { name: "Statistics", path: "/statistics", icon: BarChart3 },
    ];

    const bottomItems = [
        { name: "Help", path: "/help", icon: HelpCircle },
        { name: "Settings", path: "/settings", icon: Settings },
    ];

    const getIsActive = (path: string) => {
        return (
            location.pathname === path ||
            (path !== "/" && location.pathname.startsWith(path))
        );
    };

    const handleSignOut = async () => {
        suppressNextDirty();
        dispatch(replaceState(defaultState));
        await persistor.purge();
        resetSession();
        navigate("/");
        setIsMobileOpen(false);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
        fixed top-0 left-0 h-full w-64 bg-app-bg border-r border-app-border p-6 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
            >
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            P
                        </div>
                        <span className="text-xl font-bold tracking-tight text-app-foreground">
                            Prosperitas
                        </span>
                    </div>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden text-app-muted hover:text-app-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            item={item}
                            isActive={getIsActive(item.path)}
                            onClick={() => setIsMobileOpen(false)}
                        />
                    ))}
                </nav>

                <div className="pt-6 border-t border-app-border space-y-1">
                    <button
                        type="button"
                        onClick={() => runAction(exportToFile)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full"
                    >
                        <Download
                            size={20}
                            className="text-app-muted group-hover:text-app-foreground"
                        />
                        <span>Export to File</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full"
                    >
                        <LogOut
                            size={20}
                            className="text-app-muted group-hover:text-app-foreground"
                        />
                        <span>Sign out</span>
                    </button>
                    {bottomItems.map((item) => (
                        <NavLink
                            key={item.path}
                            item={item}
                            isActive={getIsActive(item.path)}
                            onClick={() => setIsMobileOpen(false)}
                        />
                    ))}
                </div>
            </aside>
        </>
    );
};
