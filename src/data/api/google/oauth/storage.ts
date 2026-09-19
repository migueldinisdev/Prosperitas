import { GOOGLE_TOKEN_STORAGE_PREFIX } from "../constants";

const accessTokens = new Map<string, string>();

// Tokens persisted by older releases must never be reused by this release.
export const clearLegacyStoredAccessTokens = (): void => {
    if (typeof window === "undefined") return;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(`${GOOGLE_TOKEN_STORAGE_PREFIX}:`)) {
            localStorage.removeItem(key);
        }
    }
};

clearLegacyStoredAccessTokens();

const normalizeScopes = (scopes: string[]) => {
    return [...new Set(scopes.map((scope) => scope.trim()))]
        .filter(Boolean)
        .sort();
};

export const makeTokenStorageKey = (scopes: string[]): string => {
    const normalized = normalizeScopes(scopes);
    return `${GOOGLE_TOKEN_STORAGE_PREFIX}:${normalized.join(" ")}`;
};

export const getStoredAccessToken = (scopes: string[]): string | null => {
    const key = makeTokenStorageKey(scopes);
    return accessTokens.get(key) ?? null;
};

export const setStoredAccessToken = (scopes: string[], token: string): void => {
    const key = makeTokenStorageKey(scopes);
    accessTokens.set(key, token);
};

export const clearStoredAccessToken = (scopes: string[]): void => {
    const key = makeTokenStorageKey(scopes);
    accessTokens.delete(key);
};

export const clearAllAccessTokens = (): void => {
    accessTokens.clear();
    clearLegacyStoredAccessTokens();
};
