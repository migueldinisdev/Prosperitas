export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const assertGoogleClientId = (): void => {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error(
            "Missing Google OAuth client ID. Set VITE_GOOGLE_CLIENT_ID in your environment."
        );
    }
};
