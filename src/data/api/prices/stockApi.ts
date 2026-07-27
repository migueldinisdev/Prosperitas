import { PriceApiError, TickerNotFoundError } from "./errors";
import { fetchWithTimeout } from "./request";

interface StockCandle {
    date: string;
    time: string | null;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface StockLiveResponse {
    symbol: string;
    type: "live";
    availableFrom?: string | null;
    data: StockCandle[];
    source: string;
}

interface StockHistoricalResponse {
    symbol: string;
    type: "historical";
    range?: {
        from: string;
        to: string;
    };
    availableFrom?: string | null;
    data: StockCandle[];
    source: string;
}

interface StockErrorResponse {
    error: string;
    status: number;
    provider?: string;
    code?: string;
    upstreamStatus?: number;
    upstreamStatusText?: string;
}

export interface StockSymbols {
    symbol?: string;
    symbolYF?: string | null;
}

const STOCK_BASE_PATH = "/api/proxy/stock";

const compactDateToIso = (date: string) =>
    /^\d{8}$/.test(date)
        ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
        : date;

const parseStockResponse = async <T>(
    response: Response,
    ticker: string
): Promise<T> => {
    const payload = (await response.json()) as T | StockErrorResponse;
    if (!response.ok) {
        const error = payload as StockErrorResponse;
        const details = {
            status: error.upstreamStatus ?? error.status ?? response.status,
            code: error.code,
            provider: error.provider,
        };
        if (response.status === 404) {
            throw new TickerNotFoundError(
                ticker,
                "stock",
                error.error || `Ticker not found: ${ticker}`,
                details
            );
        }
        throw new PriceApiError(
            error.error || "Stock request failed.",
            details
        );
    }
    return payload as T;
};

const buildStockQuery = (symbols: StockSymbols) => {
    const params = new URLSearchParams();
    if (symbols.symbolYF?.trim()) {
        params.set("symbolYF", symbols.symbolYF.trim());
    }
    if (!params.toString() && symbols.symbol?.trim()) {
        params.set("symbol", symbols.symbol.trim());
    }
    return params;
};

export const fetchStockLive = async (symbols: string | StockSymbols) => {
    const symbolRequest =
        typeof symbols === "string" ? { symbol: symbols } : symbols;
    const query = buildStockQuery(symbolRequest);
    const response = await fetchWithTimeout(`${STOCK_BASE_PATH}/live?${query.toString()}`);
    const requestedTicker =
        symbolRequest.symbolYF || symbolRequest.symbol || "";
    const payload = await parseStockResponse<StockLiveResponse>(
        response,
        requestedTicker
    );
    if (!payload.data || payload.data.length === 0) {
        throw new TickerNotFoundError(
            symbolRequest.symbolYF || symbolRequest.symbol || "",
            "stock"
        );
    }
    const [candle] = payload.data;
    if (candle.close == null) {
        throw new TickerNotFoundError(
            symbolRequest.symbolYF || symbolRequest.symbol || "",
            "stock",
            "ticker not found"
        );
    }
    return {
        date: candle.date,
        close: candle.close,
        source: payload.source,
        availableFrom: payload.availableFrom ?? undefined,
    };
};

export const fetchStockHistorical = async (
    symbols: string | StockSymbols,
    date: string
) => {
    const symbolRequest =
        typeof symbols === "string" ? { symbol: symbols } : symbols;
    const formattedDate = date.replace(/-/g, "");
    const query = buildStockQuery(symbolRequest);
    query.set("from", formattedDate);

    const response = await fetchWithTimeout(
        `${STOCK_BASE_PATH}/historical?${query.toString()}`
    );
    const requestedTicker =
        symbolRequest.symbolYF || symbolRequest.symbol || "";
    const payload = await parseStockResponse<StockHistoricalResponse>(
        response,
        requestedTicker
    );
    if (!payload.data || payload.data.length === 0) {
        throw new TickerNotFoundError(
            symbolRequest.symbolYF || symbolRequest.symbol || "",
            "stock"
        );
    }
    const entries = payload.data
        .filter((candle) => candle.close != null)
        .map((candle) => ({
            date: candle.date,
            close: candle.close,
            source: payload.source,
        }));
    if (entries.length === 0) {
        throw new TickerNotFoundError(
            symbolRequest.symbolYF || symbolRequest.symbol || "",
            "stock",
            "ticker not found"
        );
    }
    const entryDates = entries.map((entry) => entry.date);
    const fallbackCoverageDates = [date, ...entryDates].sort((a, b) =>
        a.localeCompare(b)
    );
    const today = new Date().toISOString().slice(0, 10);
    const rangeFrom = payload.range
        ? compactDateToIso(payload.range.from)
        : fallbackCoverageDates[0];
    const rangeTo = payload.range
        ? compactDateToIso(payload.range.to)
        : fallbackCoverageDates[fallbackCoverageDates.length - 1];
    return {
        entries,
        availableFrom: payload.availableFrom ?? undefined,
        coverage: {
            from: rangeFrom,
            to: rangeTo < today ? rangeTo : today,
        },
    };
};
