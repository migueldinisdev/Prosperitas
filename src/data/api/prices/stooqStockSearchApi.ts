import { PriceApiError } from "./errors";

export interface StooqStockSearchResult {
    symbol: string;
    name: string;
    exchange: string;
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, "");

const decodeHtmlEntities = (value: string) => {
    if (typeof window === "undefined") {
        return value;
    }

    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
};

const sanitizeField = (value: string) =>
    decodeHtmlEntities(stripHtml(value)).trim();

const extractPayload = (payload: string) => {
    const match = payload.match(/cmp_r\('([\s\S]*)'\);?/);
    if (!match) {
        return "";
    }

    return match[1].replace(/\\'/g, "'");
};

export const parseStooqSearchResponse = (payload: string) => {
    const body = extractPayload(payload);
    if (!body) {
        return [] as StooqStockSearchResult[];
    }

    return body
        .split("|")
        .map((entry) => entry.split("~"))
        .map(([symbolRaw, nameRaw, exchangeRaw]) => ({
            symbol: sanitizeField(symbolRaw || ""),
            name: sanitizeField(nameRaw || ""),
            exchange: sanitizeField(exchangeRaw || ""),
        }))
        .filter((entry) => entry.symbol.length > 0);
};

export const fetchStooqStockSearch = async (
    query: string,
    signal?: AbortSignal
) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return [] as StooqStockSearchResult[];
    }

    const response = await fetch(
        `https://stooq.com/cmp/${Date.now()}?q=${encodeURIComponent(
            trimmedQuery
        )}`,
        { signal }
    );

    if (!response.ok) {
        throw new PriceApiError("Stooq search request failed.");
    }

    const payload = await response.text();
    return parseStooqSearchResponse(payload);
};
