import { GOOGLE_TOKEN_STORAGE_PREFIX } from "../constants";

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
    return localStorage.getItem(key);
};

export const setStoredAccessToken = (scopes: string[], token: string): void => {
    const key = makeTokenStorageKey(scopes);
    localStorage.setItem(key, token);
};

export const clearStoredAccessToken = (scopes: string[]): void => {
    const key = makeTokenStorageKey(scopes);
    localStorage.removeItem(key);
};
