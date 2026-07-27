// functions/api/proxy/stock/live.ts

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface UnifiedCandle {
    [key: string]: JsonValue;
    date: string | null;
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

type YahooLiveResult =
    | { data: UnifiedCandle[]; availableFrom: string | null }
    | { error: YahooError };

function corsHeaders(): Headers {
    return new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
    });
}

function jsonResponse(body: JsonValue, status = 200): Response {
    const headers = corsHeaders();
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set(
        "Cache-Control",
        status >= 400 ? "no-store" : "public, max-age=60"
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
            indicators?: { quote?: Array<{ close?: Array<number | null> }> };
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

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "null") return null;
        const num = Number(trimmed);
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

const fetchYahooLive = async (symbol: string): Promise<YahooLiveResult> => {
    const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    yahooUrl.searchParams.set("interval", "1d");
    yahooUrl.searchParams.set("range", "5d");

    const upstream = await fetchWithTimeout(yahooUrl.toString(), 3500, {
        method: "GET",
        headers: {
            "User-Agent": "Prosperitas/1.0",
            "Accept": "application/json,text/plain,*/*",
        },
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
    const availableFrom = formatYahooDate(
        result?.meta?.firstTradeDate,
        result?.meta?.exchangeTimezoneName
    );
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    if (!timestamps.length || !closes.length) {
        return { data: [], availableFrom };
    }

    let lastIndex = Math.min(closes.length, timestamps.length) - 1;
    while (lastIndex >= 0 && parseNumber(closes[lastIndex]) == null) {
        lastIndex -= 1;
    }
    if (lastIndex < 0) return { data: [], availableFrom };

    const close = parseNumber(closes[lastIndex]);
    const timestamp = timestamps[lastIndex];
    if (!timestamp) return { data: [], availableFrom };
    return {
        availableFrom,
        data: [{
            date: new Date(timestamp * 1000).toISOString().slice(0, 10),
            time: null,
            open: null,
            high: null,
            low: null,
            close,
            volume: null,
        }],
    };
};

export async function onRequest(context: {
    request: Request,
}): Promise<Response> {
    const { request } = context;
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const symbolYF = readYahooSymbol(url);

    if (!symbolYF) {
        return jsonResponse({ error: "Missing required query param: symbolYF or symbol" }, 400);
    }

    try {
        const yahooResult = await fetchYahooLive(symbolYF);
        if ("error" in yahooResult) {
            return yahooErrorResponse(yahooResult.error);
        }
        const yfData = yahooResult.data;
        if (yfData && yfData.length > 0 && yfData[0].close != null) {
            return jsonResponse({
                symbol: symbolYF,
                type: "live",
                availableFrom: yahooResult.availableFrom,
                data: yfData,
                source: "yahoo",
            });
        }
        return jsonResponse({
            error: `Yahoo Finance returned no price data for ${symbolYF}.`,
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
