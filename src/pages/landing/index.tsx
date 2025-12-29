import React, { useRef } from "react";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { replaceState } from "../../store/actions";
import { defaultState } from "../../store/initialState";

const landingOptions = [
    {
        title: "Import save file",
        description: "Restore your wallets and charts from an existing backup.",
        buttonLabel: "Upload file",
        //image: importSaveImage,
    },
    {
        title: "Log-in with Google",
        description: "Sync your data and continue across any device instantly.",
        buttonLabel: "Continue with Google",
        //image: googleLoginImage,
    },
    {
        title: "Start as Guest",
        description: "Jump in quickly and explore without signing in.",
        buttonLabel: "Start now",
        //image: guestStartImage,
    },
];

export const LandingPage: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            dispatch(replaceState(parsed));
            navigate("/home");
        } catch (err) {
            window.alert("Failed to read file — ensure it's valid JSON.");
        }
    };

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleStartNow = () => {
        dispatch(replaceState(defaultState));
        navigate("/home");
    };
    const handleContinueWithGoogle = () => {
        // Placeholder: initialize empty store and continue to app
        dispatch(replaceState(defaultState));
        navigate("/home");
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
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/json"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />

                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    className="rounded-xl bg-app-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-primary/90"
                                >
                                    Upload file
                                </button>

                                <button
                                    type="button"
                                    onClick={handleContinueWithGoogle}
                                    className="rounded-xl border border-app-border bg-app-card px-4 py-2 text-sm font-semibold hover:bg-app-surface"
                                >
                                    Continue with Google
                                </button>

                                <button
                                    type="button"
                                    onClick={handleStartNow}
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
