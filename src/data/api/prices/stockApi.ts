import { PriceApiError, TickerNotFoundError } from "./errors";

interface StooqCandle {
    date: string;
    time: string | null;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface StooqLiveResponse {
    symbol: string;
    type: "live";
    data: StooqCandle[];
    source: string;
}

interface StooqHistoricalResponse {
    symbol: string;
    type: "historical";
    range?: {
        from: string;
        to: string;
    };
    data: StooqCandle[];
    source: string;
}

interface StooqErrorResponse {
    error: string;
    status: number;
}

const STQ_BASE_PATH = "/api/proxy/stooq";

const parseStooqResponse = async <T>(response: Response): Promise<T> => {
    const payload = (await response.json()) as T | StooqErrorResponse;
    if (!response.ok) {
        const error = payload as StooqErrorResponse;
        throw new PriceApiError(error.error || "Stooq request failed.");
    }
    return payload as T;
};

export const fetchStockLive = async (symbol: string) => {
    const response = await fetch(
        `${STQ_BASE_PATH}/live?symbol=${encodeURIComponent(symbol)}`
    );
    const payload = await parseStooqResponse<StooqLiveResponse>(response);
    if (!payload.data || payload.data.length === 0) {
        throw new TickerNotFoundError(symbol, "stock");
    }
    const [candle] = payload.data;
    if (candle.close == null) {
        throw new TickerNotFoundError(symbol, "stock", "ticker not found");
    }
    return {
        date: candle.date,
        close: candle.close,
        source: payload.source,
    };
};

export const fetchStockHistorical = async (symbol: string, date: string) => {
    const formattedDate = date.replace(/-/g, "");
    const response = await fetch(
        `${STQ_BASE_PATH}/historical?symbol=${encodeURIComponent(
            symbol
        )}&from=${formattedDate}`
    );
    const payload = await parseStooqResponse<StooqHistoricalResponse>(response);
    if (!payload.data || payload.data.length === 0) {
        throw new TickerNotFoundError(symbol, "stock");
    }
    const entries = payload.data
        .filter((candle) => candle.close != null)
        .map((candle) => ({
            date: candle.date,
            close: candle.close,
            source: payload.source,
        }));
    if (entries.length === 0) {
        throw new TickerNotFoundError(symbol, "stock", "ticker not found");
    }
    return entries;
};
