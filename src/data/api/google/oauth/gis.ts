import { GoogleAuthError } from "../errors";

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: {
                            access_token?: string;
                            error?: string;
                            error_description?: string;
                        }) => void;
                        error_callback?: (error: { type: string }) => void;
                    }) => {
                        requestAccessToken: (options?: {
                            prompt?: string;
                        }) => void;
                    };
                };
            };
        };
    }
}

let gisScriptPromise: Promise<void> | null = null;

export const loadGisScript = (): Promise<void> => {
    if (gisScriptPromise) {
        return gisScriptPromise;
    }

    gisScriptPromise = new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () =>
            reject(new GoogleAuthError("Failed to load Google Identity Services."));
        document.head.appendChild(script);
    });

    return gisScriptPromise;
};

export const requestAccessTokenInteractive = async (
    clientId: string,
    scopes: string[]
): Promise<string> => {
    await loadGisScript();

    if (!window.google?.accounts?.oauth2) {
        throw new GoogleAuthError("Google Identity Services not available.");
    }

    return new Promise((resolve, reject) => {
        const tokenClient = window.google!.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: scopes.join(" "),
            callback: (response) => {
                if (response.access_token) {
                    resolve(response.access_token);
                    return;
                }

                reject(
                    new GoogleAuthError(
                        response.error_description ||
                            response.error ||
                            "Failed to obtain access token."
                    )
                );
            },
            error_callback: (error) => {
                reject(
                    new GoogleAuthError(
                        error?.type || "Google auth request failed."
                    )
                );
            },
        });

        tokenClient.requestAccessToken({ prompt: "consent" });
    });
};

export const requestAccessTokenSilent = async (
    clientId: string,
    scopes: string[]
): Promise<string> => {
    await loadGisScript();

    if (!window.google?.accounts?.oauth2) {
        throw new GoogleAuthError("Google Identity Services not available.");
    }

    return new Promise((resolve, reject) => {
        const tokenClient = window.google!.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: scopes.join(" "),
            callback: (response) => {
                if (response.access_token) {
                    resolve(response.access_token);
                    return;
                }

                reject(
                    new GoogleAuthError(
                        response.error_description ||
                            response.error ||
                            "Failed to obtain access token."
                    )
                );
            },
            error_callback: (error) => {
                reject(
                    new GoogleAuthError(
                        error?.type || "Google auth request failed."
                    )
                );
            },
        });

        tokenClient.requestAccessToken({ prompt: "none" });
    });
};
