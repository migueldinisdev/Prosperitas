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
    headers.set("Cache-Control", "public, max-age=60");
    return new Response(JSON.stringify(body), { status, headers });
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

const fetchYahooLive = async (symbol: string): Promise<UnifiedCandle[] | null> => {
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
    if (!upstream.ok) return null;
    const payload = (await upstream.json()) as {
        chart?: {
            result?: Array<{
                timestamp?: number[];
                indicators?: { quote?: Array<{ close?: Array<number | null> }> };
            }>;
        };
    };
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    if (!timestamps.length || !closes.length) return [];
    const lastIndex = closes.length - 1;
    const close = parseNumber(closes[lastIndex]);
    const timestamp = timestamps[Math.min(lastIndex, timestamps.length - 1)];
    if (!timestamp) return [];
    return [{
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        time: null,
        open: null,
        high: null,
        low: null,
        close,
        volume: null,
    }];
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
        const yfData = await fetchYahooLive(symbolYF);
        if (yfData && yfData.length > 0 && yfData[0].close != null) {
            return jsonResponse({ symbol: symbolYF, type: "live", data: yfData, source: "yahoo" });
        }
    } catch {
        // Return the upstream error below.
    }

    return jsonResponse({ error: "Upstream error", status: 502 }, 502);
}
