// functions/api/proxy/stock/historical.ts

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface UnifiedCandle {
    [key: string]: JsonValue;
    date: string;
    time: string | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

interface YahooError {
    status: number;
    statusText: string;
    code: string;
    message: string;
}

type YahooHistoricalResult =
    | { data: UnifiedCandle[]; availableFrom: string | null }
    | { error: YahooError };

function corsHeaders(): Headers {
    return new Headers({
        "Access-Control-Allow-Origin": "https://prosperitas.migueldinis.dev",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
    });
}

function jsonResponse(body: JsonValue, status = 200): Response {
    const headers = corsHeaders();
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set(
        "Cache-Control",
        status >= 400 ? "no-store" : "public, max-age=300"
    );
    return new Response(JSON.stringify(body), { status, headers });
}

function yahooErrorResponse(error: YahooError): Response {
    return jsonResponse({
        error: error.message,
        status: error.status,
        provider: "yahoo",
        code: error.code,
        upstreamStatus: error.status,
        upstreamStatusText: error.statusText,
    }, error.status);
}

function parseYahooPayload(text: string): {
    chart?: {
        result?: Array<{
            meta?: {
                firstTradeDate?: number;
                exchangeTimezoneName?: string;
            };
            timestamp?: number[];
            indicators?: {
                quote?: Array<{
                    close?: Array<number | null>;
                }>;
            };
        }> | null;
        error?: {
            code?: string;
            description?: string;
        } | null;
    };
} {
    if (!text.trim()) return {};
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

function yahooErrorFromResponse(upstream: Response, text: string): YahooError {
    const payload = parseYahooPayload(text);
    const yahooError = payload.chart?.error;
    return {
        status: upstream.status,
        statusText: upstream.statusText,
        code: yahooError?.code || `HTTP_${upstream.status}`,
        message:
            yahooError?.description ||
            text.trim().slice(0, 500) ||
            upstream.statusText ||
            "Yahoo Finance request failed.",
    };
}

function formatYahooDate(
    timestamp: number | undefined,
    timeZone: string | undefined
): string | null {
    if (timestamp === undefined || !Number.isFinite(timestamp)) return null;
    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) return null;
    if (timeZone) {
        try {
            const parts = new Intl.DateTimeFormat("en-US", {
                timeZone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).formatToParts(date);
            const values = Object.fromEntries(
                parts.map((part) => [part.type, part.value])
            );
            if (values.year && values.month && values.day) {
                return `${values.year}-${values.month}-${values.day}`;
            }
        } catch {
            // Fall back to the UTC date below.
        }
    }
    return date.toISOString().slice(0, 10);
}

function parseYmdCompact(value: string): Date | null {
    if (!/^\d{8}$/.test(value)) return null;
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime())) return null;
    return date;
}

function formatYmdCompact(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}

function addDaysUtc(date: Date, days: number): Date {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
}

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const normalized = value.trim();
        if (!normalized || normalized === "-" || normalized.toLowerCase() === "null") return null;
        const num = Number(normalized);
        return Number.isFinite(num) ? num : null;
    }
    return null;
}

const fetchWithTimeout = async (url: string, timeoutMs: number, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

const readYahooSymbol = (url: URL) =>
    url.searchParams.get("symbolYF")?.trim() ||
    url.searchParams.get("symbol")?.trim() ||
    "";

const fetchYahooHistorical = async (
    symbol: string,
    fromDate: Date,
    toDate: Date
): Promise<YahooHistoricalResult> => {
    const period1 = Math.floor(fromDate.getTime() / 1000);
    const period2 = Math.floor(addDaysUtc(toDate, 1).getTime() / 1000);
    const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    yahooUrl.searchParams.set("interval", "1d");
    yahooUrl.searchParams.set("period1", String(period1));
    yahooUrl.searchParams.set("period2", String(period2));

    const upstream = await fetchWithTimeout(yahooUrl.toString(), 4000, {
        method: "GET",
        headers: { "User-Agent": "Prosperitas/1.0" },
    });
    const responseText = await upstream.text();
    if (!upstream.ok) {
        return { error: yahooErrorFromResponse(upstream, responseText) };
    }
    const payload = parseYahooPayload(responseText);
    if (payload.chart?.error) {
        return {
            error: {
                status: 502,
                statusText: "Bad Gateway",
                code: payload.chart.error.code || "YAHOO_ERROR",
                message:
                    payload.chart.error.description ||
                    "Yahoo Finance returned an error.",
            },
        };
    }

    const result = payload.chart?.result?.[0];
    if (!result) return { data: [], availableFrom: null };
    const availableFrom = formatYahooDate(
        result.meta?.firstTradeDate,
        result.meta?.exchangeTimezoneName
    );
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];

    return {
        availableFrom,
        data: timestamps.map((ts, index) => ({
            date: new Date(ts * 1000).toISOString().slice(0, 10),
            time: null,
            open: null,
            high: null,
            low: null,
            close: parseNumber(closes[index]),
            volume: null,
        })),
    };
};

export async function onRequest(context: { request: Request }): Promise<Response> {
    const { request } = context;
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "GET") {
        return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    const url = new URL(request.url);
    const symbolYF = readYahooSymbol(url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!symbolYF || !from) {
        return jsonResponse({ error: "Missing required query params: symbolYF or symbol, from" }, 400);
    }
    if (symbolYF.length > 40) {
        return jsonResponse({ error: "Invalid symbol length" }, 400);
    }

    const fromDate = parseYmdCompact(from);
    if (!fromDate) {
        return jsonResponse({ error: "Invalid from date. Use YYYYMMDD." }, 400);
    }

    let effectiveFrom = from;
    let effectiveTo = to ?? "";

    if (to) {
        const toDate = parseYmdCompact(to);
        if (!toDate) {
            return jsonResponse({ error: "Invalid to date. Use YYYYMMDD." }, 400);
        }
    } else {
        const start = addDaysUtc(fromDate, -7);
        const end = addDaysUtc(fromDate, 7);
        effectiveFrom = formatYmdCompact(start);
        effectiveTo = formatYmdCompact(end);
    }

    const effectiveFromDate = parseYmdCompact(effectiveFrom) ?? fromDate;
    const effectiveToDate = parseYmdCompact(effectiveTo) ?? fromDate;
    const daySpan = (effectiveToDate.getTime() - effectiveFromDate.getTime()) / 86400000;
    if (daySpan < 0 || daySpan > 31) {
        return jsonResponse({ error: "Historical range must be at most 31 days" }, 400);
    }

    try {
        const yahooResult = await fetchYahooHistorical(
            symbolYF,
            effectiveFromDate,
            effectiveToDate
        );
        if ("error" in yahooResult) {
            return yahooErrorResponse(yahooResult.error);
        }
        const yfData = yahooResult.data;
        if (yfData && yfData.length > 0) {
            return jsonResponse({
                symbol: symbolYF,
                type: "historical",
                availableFrom: yahooResult.availableFrom,
                range: { from: effectiveFrom, to: effectiveTo },
                data: yfData,
                source: "yahoo",
            });
        }
        return jsonResponse({
            error: `Yahoo Finance returned no price data for ${symbolYF} in the requested range.`,
            status: 404,
            provider: "yahoo",
            code: "NO_DATA",
        }, 404);
    } catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        return jsonResponse({
            error: timedOut
                ? "Yahoo Finance request timed out."
                : "Unable to reach Yahoo Finance.",
            status: timedOut ? 504 : 502,
            provider: "yahoo",
            code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_NETWORK_ERROR",
        }, timedOut ? 504 : 502);
    }
}
