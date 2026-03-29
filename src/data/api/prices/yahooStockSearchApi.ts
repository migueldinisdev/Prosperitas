import { PriceApiError } from "./errors";
import { fetchWithTimeout } from "./request";

export interface YahooStockSearchResult {
    symbol: string;
    name: string;
    quoteType: string;
    exchDisp: string;
    score: number;
}

interface YahooSearchPayload {
    quotes?: Array<{
        symbol?: string;
        longname?: string;
        shortname?: string;
        quoteType?: string;
        exchDisp?: string;
        score?: number;
    }>;
}

export const fetchYahooStockSearch = async (
    query: string,
    signal?: AbortSignal
) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return [] as YahooStockSearchResult[];
    }

    const response = await fetchWithTimeout(
        `/api/proxy/stooq/search-yahoo?q=${encodeURIComponent(trimmedQuery)}`,
        { signal }
    );

    if (!response.ok) {
        throw new PriceApiError("Yahoo Finance search request failed.");
    }

    const payload = (await response.json()) as YahooSearchPayload;
    return (payload.quotes ?? [])
        .map((quote) => ({
            symbol: quote.symbol?.trim() ?? "",
            name: (quote.longname ?? quote.shortname ?? "").trim(),
            quoteType: quote.quoteType?.trim() ?? "",
            exchDisp: quote.exchDisp?.trim() ?? "",
            score: typeof quote.score === "number" ? quote.score : 0,
        }))
        .filter((entry) => entry.symbol.length > 0);
};
