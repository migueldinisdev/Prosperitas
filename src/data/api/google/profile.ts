import { GoogleProfileError } from "./errors";

export interface GoogleProfile {
    name: string;
    picture: string | null;
}

const PROFILE_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const fetchGoogleProfile = async (
    accessToken: string
): Promise<GoogleProfile> => {
    const response = await fetch(PROFILE_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const message =
            (await response.text()) ||
            response.statusText ||
            "Google profile request failed.";
        throw new GoogleProfileError(message, response.status);
    }

    const data = (await response.json()) as {
        name?: string;
        picture?: string;
    };

    return {
        name: data.name ?? "Google User",
        picture: data.picture ?? null,
    };
};
