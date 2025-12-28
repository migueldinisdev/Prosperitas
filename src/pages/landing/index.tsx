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
    const [language, setLanguage] = useState<"PT" | "EN">("EN");

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
                            <p className="text-lg font-semibold">Smart personal finance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 rounded-full border border-app-border bg-app-card p-1 text-xs font-semibold">
                            {(["PT", "EN"] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setLanguage(option)}
                                    aria-pressed={language === option}
                                    className={`rounded-full px-3 py-1 transition-colors ${
                                        language === option
                                            ? "bg-app-primary text-white"
                                            : "text-app-muted hover:text-app-foreground"
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex flex-1 flex-col gap-4 px-4 pb-5 pt-4 sm:px-10 sm:pb-10">
                    <section className="max-w-2xl">
                        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                            Choose how you want to begin
                        </h1>
                        <p className="mt-2 text-sm text-app-muted sm:text-base">
                            Launch instantly from a backup, sign in with Google, or
                            explore as a guest. Everything you need fits comfortably on
                            one screen.
                        </p>
                    </section>

                    <section className="grid flex-1 grid-rows-3 gap-4 sm:grid-cols-2 sm:grid-rows-2 lg:grid-cols-3 lg:grid-rows-1">
                        {landingOptions.map((option) => (
                            <article
                                key={option.title}
                                className="flex h-full flex-col justify-between rounded-3xl border border-app-border bg-app-card p-4 shadow-[var(--shadow-card)]"
                            >
                                <div className="space-y-3">
                                    <img
                                        src={option.image}
                                        alt={option.title}
                                        className="h-32 w-full rounded-2xl object-cover sm:h-36"
                                    />
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            {option.title}
                                        </h2>
                                        <p className="mt-1 text-sm text-app-muted">
                                            {option.description}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="mt-4 inline-flex items-center justify-center rounded-xl border border-transparent bg-app-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-primary/90"
                                >
                                    {option.buttonLabel}
                                </button>
                            </article>
                        ))}
                    </section>
                </main>
            </div>
        </div>
    );
};
