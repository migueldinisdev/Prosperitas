import { PricePoint } from "./types";

const BINANCE_BASE_URL = "https://api.binance.com/api/v3";

interface BinanceTickerResponse {
    symbol: string;
    price: string;
}

type BinanceKline = [
    number,
    string,
    string,
    string,
    string,
    string,
    number,
    string,
    number,
    string,
    string,
    string
];

const parseCryptoSymbol = (ticker: string) =>
    ticker.replace("/", "").trim().toUpperCase();

const toUtcDateString = (timestamp: number) =>
    new Date(timestamp).toISOString().slice(0, 10);

const assertOk = async (response: Response) => {
    if (response.ok) {
        return;
    }

    let message = response.statusText || "Crypto price request failed.";
    try {
        const payload = (await response.json()) as { msg?: string };
        if (payload.msg) {
            message = payload.msg;
        }
    } catch {
        const text = await response.text();
        if (text) {
            message = text;
        }
    }

    throw new Error(message);
};

export const fetchCryptoLive = async (ticker: string): Promise<PricePoint> => {
    const symbol = parseCryptoSymbol(ticker);
    const params = new URLSearchParams({ symbol });
    const url = `${BINANCE_BASE_URL}/ticker/price?${params.toString()}`;
    const response = await fetch(url);

    await assertOk(response);
    const payload = (await response.json()) as BinanceTickerResponse;

    return {
        date: toUtcDateString(Date.now()),
        close: Number(payload.price),
        source: "binance",
    };
};

export const fetchCryptoHistorical = async (
    ticker: string,
    from: string,
    to?: string
): Promise<PricePoint[]> => {
    const symbol = parseCryptoSymbol(ticker);
    const params = new URLSearchParams({
        symbol,
        interval: "1d",
    });
    const startTime = new Date(`${from}T00:00:00Z`).getTime();

    if (Number.isNaN(startTime)) {
        throw new Error(`Invalid from date: ${from}`);
    }

    params.set("startTime", String(startTime));

    if (to) {
        const endTime = new Date(`${to}T00:00:00Z`).getTime();
        if (Number.isNaN(endTime)) {
            throw new Error(`Invalid to date: ${to}`);
        }
        params.set("endTime", String(endTime));
    }

    const url = `${BINANCE_BASE_URL}/klines?${params.toString()}`;
    const response = await fetch(url);

    await assertOk(response);
    const payload = (await response.json()) as BinanceKline[];

    if (!payload.length) {
        throw new Error(`No historical data returned for ${symbol}.`);
    }

    return payload.map((kline) => ({
        date: toUtcDateString(kline[0]),
        close: Number(kline[4]),
        source: "binance",
    }));
};
