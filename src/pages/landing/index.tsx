import React, { useState } from "react";
import { ThemeToggle } from "../../components/ThemeToggle";
import importSaveImage from "../../assets/landing/import-save.svg";
import googleLoginImage from "../../assets/landing/google-login.svg";
import guestStartImage from "../../assets/landing/guest-start.svg";

const landingOptions = [
    {
        title: "Import save file",
        description: "Restore your wallets and charts from an existing backup.",
        buttonLabel: "Upload file",
        image: importSaveImage,
    },
    {
        title: "Log-in with Google",
        description: "Sync your data and continue across any device instantly.",
        buttonLabel: "Continue with Google",
        image: googleLoginImage,
    },
    {
        title: "Start as Guest",
        description: "Jump in quickly and explore without signing in.",
        buttonLabel: "Start now",
        image: guestStartImage,
    },
];

export const LandingPage: React.FC = () => {
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
                                        Launch from a backup, sign in with
                                        Google, or explore as a guest.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <button
                                    type="button"
                                    className="rounded-xl bg-app-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-primary/90"
                                >
                                    Upload file
                                </button>

                                <button
                                    type="button"
                                    className="rounded-xl border border-app-border bg-app-card px-4 py-2 text-sm font-semibold hover:bg-app-surface"
                                >
                                    Continue with Google
                                </button>

                                <button
                                    type="button"
                                    className="rounded-xl border border-app-border bg-app-card px-4 py-2 text-sm font-semibold hover:bg-app-surface"
                                >
                                    Start now
                                </button>
                            </div>
                        </article>
                    </section>
                </main>
            </div>
        </div>
    );
};
