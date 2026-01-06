// functions/api/proxy/stooq/live.ts

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

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

export async function onRequest(context: {
    request: Request,
}): Promise<Response> {
    const { request } = context;

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol");

    if (!symbol) {
        return jsonResponse({ error: "Missing required query param: symbol" }, 400);
    }

    const stooqUrl = new URL("https://stooq.com/q/l/");
    stooqUrl.searchParams.set("s", symbol.toUpperCase());
    stooqUrl.searchParams.set("f", "sd2t2ohlcv");
    stooqUrl.searchParams.set("h", "");
    stooqUrl.searchParams.set("e", "json");

    const upstream = await fetch(stooqUrl.toString(), {
        method: "GET",
        headers: {
            "User-Agent": "Prosperitas/1.0",
        },
    });

    if (!upstream.ok) {
        return jsonResponse({ error: "Upstream error", status: upstream.status }, upstream.status);
    }

    const payload = await upstream.json().catch(() => null) as {
        symbols?: Array<{
            symbol?: string,
            date?: string,
            time?: string,
            open?: number | string,
            high?: number | string,
            low?: number | string,
            close?: number | string,
            volume?: number | string,
        }>,
    } | null;

    const symbols = payload?.symbols ?? [];
    const first = symbols[0];

    const data = first ? [{
        date: first.date ?? null,
        time: first.time ?? null,
        open: parseNumber(first.open),
        high: parseNumber(first.high),
        low: parseNumber(first.low),
        close: parseNumber(first.close),
        volume: parseNumber(first.volume),
    }] : [];

    return jsonResponse({
        symbol,
        type: "live",
        data,
        source: "stooq",
    });
}
