import React, { useRef } from "react";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SyncStatusPills } from "../../components/SyncStatusPills";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { replaceState } from "../../store/actions";
import { defaultState } from "../../store/initialState";
import { importFromFile, importFromGoogleDrive } from "../../store/sync";
import { NoGoogleDriveSaveError } from "../../data/api/google/errors";
import { useSyncStatus } from "../../store/syncStatus";

export const LandingPage: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { setModeAndClean, markUnsaved, suppressNextDirty } = useSyncStatus();
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            suppressNextDirty();
            await importFromFile(file);
            setModeAndClean("offline");
            navigate("/home");
        } catch (err) {
            window.alert("Failed to read file — ensure it's valid JSON.");
        }
    };

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleStartOffline = () => {
        suppressNextDirty();
        dispatch(replaceState(defaultState));
        setModeAndClean("offline");
        navigate("/home");
    };
    const handleContinueWithGoogle = async () => {
        setIsGoogleLoading(true);
        suppressNextDirty();
        try {
            await importFromGoogleDrive();
            setModeAndClean("cloud");
            navigate("/home");
        } catch (error) {
            if (error instanceof NoGoogleDriveSaveError) {
                dispatch(replaceState(defaultState));
                setModeAndClean("cloud");
                markUnsaved();
                navigate("/home");
                return;
            }

            console.error(error);
            window.alert("Failed to connect to Google Drive.");
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-app-bg text-app-foreground">
            <div className="flex min-h-screen flex-col">
                <header className="flex items-center justify-between px-4 pt-4 sm:px-10 sm:pt-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-violet-500 text-lg font-semibold text-white">
                            P
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm uppercase tracking-[0.2em] text-app-muted">
                                    Prosperitas
                                </p>
                                <span className="inline-flex items-center rounded-md bg-app-accent/20 px-2 py-1 text-xs font-medium text-app-accent">
                                    BETA
                                </span>
                            </div>
                            <p className="text-lg font-semibold">
                                Smart personal finance
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <SyncStatusPills />
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-10">
                    <section className="w-full max-w-2xl">
                        <article className="bg-app-card border border-app-border rounded-3xl p-6 shadow-[var(--shadow-card)]">
                            <div className="flex items-start gap-4 mb-4">
                                <div>
                                    <h1 className="text-2xl font-semibold">
                                        Choose how you want to begin
                                    </h1>
                                    {/* <p className="mt-1 text-sm text-app-muted">
                                        Pick an offline workspace or connect to
                                        your cloud provider to sync across
                                        devices.
                                    </p> */}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/json"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <div className="rounded-2xl border border-app-border bg-app-card p-4">
                                    <p className="text-sm font-semibold text-app-foreground">
                                        Offline
                                    </p>
                                    <p className="mt-1 text-sm text-app-muted">
                                        Work locally with manual exports.
                                    </p>
                                    <div className="mt-4 grid gap-2">
                                        <button
                                            type="button"
                                            onClick={handleUploadClick}
                                            className="rounded-xl bg-app-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-primary/90"
                                        >
                                            Upload file
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleStartOffline}
                                            className="rounded-xl border border-app-border bg-app-card px-4 py-2 text-sm font-semibold hover:bg-app-surface"
                                        >
                                            New empty
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-app-border bg-app-card p-4">
                                    <p className="text-sm font-semibold text-app-foreground">
                                        Cloud
                                    </p>
                                    <p className="mt-1 text-sm text-app-muted">
                                        Sign in to sync your data.
                                    </p>
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            onClick={handleContinueWithGoogle}
                                            disabled={isGoogleLoading}
                                            className="w-full rounded-xl border border-app-border bg-app-card px-4 py-2 text-sm font-semibold hover:bg-app-surface flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGoogleLoading ? (
                                                <>
                                                    <svg
                                                        className="animate-spin h-5 w-5"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        ></circle>
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        ></path>
                                                    </svg>
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <svg
                                                        className="h-5 w-5"
                                                        viewBox="0 0 87.3 78"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                                                            fill="#0066da"
                                                        />
                                                        <path
                                                            d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
                                                            fill="#00ac47"
                                                        />
                                                        <path
                                                            d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
                                                            fill="#ea4335"
                                                        />
                                                        <path
                                                            d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
                                                            fill="#00832d"
                                                        />
                                                        <path
                                                            d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                                                            fill="#2684fc"
                                                        />
                                                        <path
                                                            d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
                                                            fill="#ffba00"
                                                        />
                                                    </svg>
                                                    Google Drive
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </section>
                </main>
            </div>
        </div>
    );
};
