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
    data: StockCandle[];
    source: string;
}

interface StockErrorResponse {
    error: string;
    status: number;
}

export interface StockSymbols {
    symbol?: string;
    symbolYF?: string | null;
    symbolStooq?: string | null;
}

const STQ_BASE_PATH = "/api/proxy/stock";

const parseStockResponse = async <T>(response: Response): Promise<T> => {
    const payload = (await response.json()) as T | StockErrorResponse;
    if (!response.ok) {
        const error = payload as StockErrorResponse;
        throw new PriceApiError(error.error || "Stock request failed.");
    }
    return payload as T;
};

const buildStockQuery = (symbols: StockSymbols) => {
    const params = new URLSearchParams();
    if (symbols.symbolYF?.trim()) {
        params.set("symbolYF", symbols.symbolYF.trim());
    }
    if (symbols.symbolStooq?.trim()) {
        params.set("symbolStooq", symbols.symbolStooq.trim());
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
    const response = await fetchWithTimeout(`${STQ_BASE_PATH}/live?${query.toString()}`);
    const payload = await parseStockResponse<StockLiveResponse>(response);
    if (!payload.data || payload.data.length === 0) {
        throw new TickerNotFoundError(
            symbolRequest.symbolYF || symbolRequest.symbolStooq || symbolRequest.symbol || "",
            "stock"
        );
    }
    const [candle] = payload.data;
    if (candle.close == null) {
        throw new TickerNotFoundError(
            symbolRequest.symbolYF || symbolRequest.symbolStooq || symbolRequest.symbol || "",
            "stock",
            "ticker not found"
        );
    }
    return {
        date: candle.date,
        close: candle.close,
        source: payload.source,
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
        `${STQ_BASE_PATH}/historical?${query.toString()}`
    );
    const payload = await parseStockResponse<StockHistoricalResponse>(response);
    if (!payload.data || payload.data.length === 0) {
        throw new TickerNotFoundError(
            symbolRequest.symbolYF || symbolRequest.symbolStooq || symbolRequest.symbol || "",
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
            symbolRequest.symbolYF || symbolRequest.symbolStooq || symbolRequest.symbol || "",
            "stock",
            "ticker not found"
        );
    }
    return entries;
};
