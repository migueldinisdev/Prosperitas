import { PriceApiError, TickerNotFoundError } from "./errors";
import { fetchWithTimeout } from "./request";

const normalizeCryptoSymbol = (pair: string) => {
    const normalized = pair.toUpperCase().replace("/", "");
    if (normalized.length < 6) {
        throw new TickerNotFoundError(pair, "crypto", "Invalid crypto pair.");
    }
    return normalized;
};

export const fetchCryptoLive = async (pair: string) => {
    const symbol = normalizeCryptoSymbol(pair);
    const response = await fetchWithTimeout(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );
    if (!response.ok) {
        throw new PriceApiError("Binance request failed.");
    }
    const payload = (await response.json()) as { symbol: string; price: string };
    if (!payload.price) {
        throw new TickerNotFoundError(pair, "crypto");
    }
    return {
        date: new Date().toISOString().slice(0, 10),
        close: Number(payload.price),
        source: "binance",
    };
};

export const fetchCryptoHistorical = async (pair: string, date: string) => {
    const symbol = normalizeCryptoSymbol(pair);
    const start = new Date(`${date}T00:00:00.000Z`).getTime();
    const end = new Date(`${date}T23:59:59.999Z`).getTime();
    const response = await fetchWithTimeout(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${start}&endTime=${end}`
    );
    if (!response.ok) {
        throw new PriceApiError("Binance request failed.");
    }
    const payload = (await response.json()) as Array<
        [number, string, string, string, string]
    >;
    if (!Array.isArray(payload) || payload.length === 0) {
        throw new TickerNotFoundError(pair, "crypto");
    }
    const close = Number(payload[0][4]);
    if (!Number.isFinite(close)) {
        throw new TickerNotFoundError(pair, "crypto");
    }
    return [{
        date,
        close,
        source: "binance",
    }];
};
