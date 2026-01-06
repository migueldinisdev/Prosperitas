import { PricePoint } from "./types";

const STOOQ_BASE_URL = "/api/proxy/stooq";

interface StooqCandle {
    date: string;
    time: string | null;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface StooqResponse {
    symbol: string;
    type: "live" | "historical";
    data: StooqCandle[];
    source: string;
    range?: { from: string; to: string };
    error?: string;
    status?: number;
}

const formatStockSymbol = (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    return normalized.includes(".") ? normalized : `${normalized}.US`;
};

const assertOk = async (response: Response) => {
    if (response.ok) {
        return;
    }

    let message = response.statusText || "Stock price request failed.";
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

const mapStooqPricePoints = (data: StooqCandle[], source: string): PricePoint[] =>
    data.map((candle) => ({
        date: candle.date,
        close: candle.close,
        source,
    }));

export const fetchStockLive = async (symbol: string): Promise<PricePoint> => {
    const formattedSymbol = formatStockSymbol(symbol);
    const url = `${STOOQ_BASE_URL}/live?symbol=${encodeURIComponent(
        formattedSymbol
    )}`;
    const response = await fetch(url);

    await assertOk(response);
    const payload = (await response.json()) as StooqResponse;

    if (!payload.data?.length) {
        throw new Error(`No live data returned for ${formattedSymbol}.`);
    }

    return mapStooqPricePoints(payload.data, payload.source)[0];
};

export const fetchStockHistorical = async (
    symbol: string,
    from: string,
    to?: string
): Promise<PricePoint[]> => {
    const formattedSymbol = formatStockSymbol(symbol);
    const params = new URLSearchParams({
        symbol: formattedSymbol,
        from,
    });

    if (to) {
        params.set("to", to);
    }

    const url = `${STOOQ_BASE_URL}/historical?${params.toString()}`;
    const response = await fetch(url);

    await assertOk(response);
    const payload = (await response.json()) as StooqResponse;

    if (!payload.data?.length) {
        throw new Error(`No historical data returned for ${formattedSymbol}.`);
    }

    return mapStooqPricePoints(payload.data, payload.source);
};
