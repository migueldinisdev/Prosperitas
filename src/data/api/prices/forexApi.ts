import { PriceApiError, TickerNotFoundError } from "./errors";
import { fetchWithTimeout } from "./request";

interface FrankfurterResponse {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
}

const parseForexPair = (pair: string) => {
    const normalized = pair.toUpperCase().replace("/", "");
    if (normalized.length !== 6) {
        throw new TickerNotFoundError(pair, "forex", "Invalid forex pair.");
    }
    return {
        base: normalized.slice(0, 3),
        quote: normalized.slice(3),
    };
};

const fetchFrankfurter = async (path: string) => {
    const response = await fetchWithTimeout(
        `https://api.frankfurter.app${path}`
    );
    if (!response.ok) {
        throw new PriceApiError("Frankfurter request failed.");
    }
    return (await response.json()) as FrankfurterResponse;
};

export const fetchForexLive = async (pair: string) => {
    const { base, quote } = parseForexPair(pair);
    const payload = await fetchFrankfurter(`/latest?from=${base}&to=${quote}`);
    const rate = payload.rates[quote];
    if (!rate) {
        throw new TickerNotFoundError(pair, "forex");
    }
    return {
        date: payload.date,
        close: rate,
        source: "frankfurter",
    };
};

export const fetchForexHistorical = async (pair: string, date: string) => {
    const { base, quote } = parseForexPair(pair);
    const payload = await fetchFrankfurter(`/${date}?from=${base}&to=${quote}`);
    const rate = payload.rates[quote];
    if (!rate) {
        throw new TickerNotFoundError(pair, "forex");
    }
    return [{
        date: payload.date,
        close: rate,
        source: "frankfurter",
    }];
};
