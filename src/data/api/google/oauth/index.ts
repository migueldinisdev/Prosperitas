import { GOOGLE_CLIENT_ID } from "../constants";
import { GoogleAuthError } from "../errors";
import {
    clearStoredAccessToken,
    getStoredAccessToken,
    setStoredAccessToken,
} from "./storage";
import { requestAccessTokenInteractive } from "./gis";

export const ensureValidAccessToken = async (
    scopes: string[]
): Promise<string> => {
    const cachedToken = getStoredAccessToken(scopes);
    if (cachedToken) {
        return cachedToken;
    }

    const token = await requestAccessTokenInteractive(GOOGLE_CLIENT_ID, scopes);
    if (!token) {
        throw new GoogleAuthError("Google OAuth did not return an access token.");
    }

    setStoredAccessToken(scopes, token);
    return token;
};

export const invalidateToken = (scopes: string[]): void => {
    clearStoredAccessToken(scopes);
};
