import { PricePoint } from "./types";

const FRANKFURTER_BASE_URL = "https://api.frankfurter.app";

interface FrankfurterResponse {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
    error?: string;
}

const parseForexPair = (ticker: string) => {
    const normalized = ticker.replace("/", "").trim().toUpperCase();
    if (normalized.length !== 6) {
        throw new Error(`Invalid forex ticker: ${ticker}`);
    }

    return {
        base: normalized.slice(0, 3),
        quote: normalized.slice(3, 6),
    };
};

const assertOk = async (response: Response) => {
    if (response.ok) {
        return;
    }

    let message = response.statusText || "Forex price request failed.";
    try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
            message = payload.error;
        }
    } catch {
        const text = await response.text();
        if (text) {
            message = text;
        }
    }

    throw new Error(message);
};

const mapFrankfurterResponse = (
    response: FrankfurterResponse,
    quote: string
): PricePoint => {
    const rate = response.rates[quote];
    if (rate === undefined) {
        throw new Error(`No forex rate returned for ${response.base}/${quote}.`);
    }

    return {
        date: response.date,
        close: rate,
        source: "frankfurter",
    };
};

export const fetchForexLatest = async (ticker: string): Promise<PricePoint> => {
    const { base, quote } = parseForexPair(ticker);
    const params = new URLSearchParams({ from: base, to: quote });
    const url = `${FRANKFURTER_BASE_URL}/latest?${params.toString()}`;
    const response = await fetch(url);

    await assertOk(response);
    const payload = (await response.json()) as FrankfurterResponse;

    return mapFrankfurterResponse(payload, quote);
};

export const fetchForexHistorical = async (
    ticker: string,
    date: string
): Promise<PricePoint> => {
    const { base, quote } = parseForexPair(ticker);
    const params = new URLSearchParams({ from: base, to: quote });
    const url = `${FRANKFURTER_BASE_URL}/${date}?${params.toString()}`;
    const response = await fetch(url);

    await assertOk(response);
    const payload = (await response.json()) as FrankfurterResponse;

    return mapFrankfurterResponse(payload, quote);
};
