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
                            <p className="text-sm uppercase tracking-[0.2em] text-app-muted">
                                Prosperitas
                            </p>
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
                    <section className="w-full max-w-xl">
                        <article className="bg-app-card border border-app-border rounded-3xl p-6 shadow-[var(--shadow-card)]">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-violet-500 text-lg font-semibold text-white">
                                    P
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold">
                                        Choose how you want to begin
                                    </h1>
                                    <p className="mt-1 text-sm text-app-muted">
                                        Pick an offline workspace or connect to
                                        Google Drive to sync across devices.
                                    </p>
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
                                        Google Drive
                                    </p>
                                    <p className="mt-1 text-sm text-app-muted">
                                        Sign in to load your Drive save and keep
                                        it updated.
                                    </p>
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            onClick={handleContinueWithGoogle}
                                            className="w-full rounded-xl border border-app-border bg-app-card px-4 py-2 text-sm font-semibold hover:bg-app-surface"
                                        >
                                            Continue with Google
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
