import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
    Upload,
    CloudUpload,
    X,
    UserRound,
    LogIn,
    LogOut,
} from "lucide-react";
import {
    exportToFile,
    exportToGoogleDrive,
    importFromFile,
    importFromGoogleDrive,
} from "../store/sync";
import {
    GOOGLE_DRIVE_APPDATA_SCOPE,
    GOOGLE_PROFILE_SCOPE,
} from "../data/api/google/constants";
import { ensureValidAccessToken, invalidateToken } from "../data/api/google/oauth";
import { getStoredAccessToken } from "../data/api/google/oauth/storage";
import { fetchGoogleProfile, GoogleProfile } from "../data/api/google/profile";

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
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(
        null
    );
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const googleScopes = useMemo(
        () => [GOOGLE_DRIVE_APPDATA_SCOPE, GOOGLE_PROFILE_SCOPE],
        []
    );

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

    const loadGoogleProfile = async (accessToken: string) => {
        const profile = await fetchGoogleProfile(accessToken);
        setGoogleProfile(profile);
    };

    useEffect(() => {
        const storedToken = getStoredAccessToken(googleScopes);
        if (!storedToken) {
            setGoogleProfile(null);
            return;
        }

        if (googleProfile) {
            return;
        }

        setIsGoogleLoading(true);
        loadGoogleProfile(storedToken)
            .catch((error) => console.error(error))
            .finally(() => setIsGoogleLoading(false));
    }, [googleProfile, googleScopes]);

    const getIsActive = (path: string) => {
        return (
            location.pathname === path ||
            (path !== "/" && location.pathname.startsWith(path))
        );
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
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                                return;
                            }

                            await runAction(async () => {
                                await importFromFile(file);
                            });
                            event.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full"
                    >
                        <Upload
                            size={20}
                            className="text-app-muted group-hover:text-app-foreground"
                        />
                        <span>Import from File</span>
                    </button>
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
                    {googleProfile ? (
                        <>
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-app-foreground bg-app-surface/70">
                                {googleProfile.picture ? (
                                    <img
                                        src={googleProfile.picture}
                                        alt={googleProfile.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-app-primary/20 text-app-primary flex items-center justify-center">
                                        <UserRound size={16} />
                                    </div>
                                )}
                                <span className="truncate">
                                    {googleProfile.name}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => runAction(exportToGoogleDrive)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full"
                            >
                                <CloudUpload
                                    size={20}
                                    className="text-app-muted group-hover:text-app-foreground"
                                />
                                <span>Save to Drive</span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    runAction(async () => {
                                        invalidateToken(googleScopes);
                                        setGoogleProfile(null);
                                    })
                                }
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full"
                            >
                                <LogOut
                                    size={20}
                                    className="text-app-muted group-hover:text-app-foreground"
                                />
                                <span>Sign out</span>
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                runAction(async () => {
                                    setIsGoogleLoading(true);
                                    try {
                                        const accessToken =
                                            await ensureValidAccessToken(
                                                googleScopes
                                            );
                                        await loadGoogleProfile(accessToken);
                                        await importFromGoogleDrive();
                                    } finally {
                                        setIsGoogleLoading(false);
                                    }
                                })
                            }
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-app-muted hover:text-app-foreground hover:bg-app-surface w-full"
                            disabled={isGoogleLoading}
                        >
                            <LogIn
                                size={20}
                                className="text-app-muted group-hover:text-app-foreground"
                            />
                            <span>
                                {isGoogleLoading
                                    ? "Logging in..."
                                    : "Log-in with Google"}
                            </span>
                        </button>
                    )}
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
