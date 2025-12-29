import { GOOGLE_CLIENT_ID } from "./googleConfig";

export type GoogleOAuthTokenClient = {
    requestAccessToken: (options: { prompt?: string }) => void;
    callback: (response: { access_token?: string; error?: string }) => void;
};

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (options: {
                        client_id: string;
                        scope: string;
                        callback: () => void;
                    }) => GoogleOAuthTokenClient;
                    revoke?: (
                        accessToken: string,
                        done: () => void
                    ) => void;
                };
            };
        };
    }
}

let gisScriptPromise: Promise<void> | null = null;

export const loadGoogleIdentityServices = (): Promise<void> => {
    if (typeof window === "undefined") {
        return Promise.reject(
            new Error("Google Identity Services requires a browser")
        );
    }

    if (window.google?.accounts?.oauth2) {
        return Promise.resolve();
    }

    if (!gisScriptPromise) {
        gisScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () =>
                reject(new Error("Failed to load Google Identity Services"));
            document.head.appendChild(script);
        });
    }

    return gisScriptPromise;
};

export const createGoogleTokenClient = async (
    scope: string
): Promise<GoogleOAuthTokenClient> => {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error(
            "Missing Google OAuth client ID. Set VITE_GOOGLE_CLIENT_ID."
        );
    }

    await loadGoogleIdentityServices();

    if (!window.google?.accounts?.oauth2) {
        throw new Error("Google Identity Services not available");
    }

    return window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope,
        callback: () => undefined,
    });
};

export const revokeGoogleToken = (accessToken: string | null): void => {
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
        window.google.accounts.oauth2.revoke(accessToken, () => undefined);
    }
};
