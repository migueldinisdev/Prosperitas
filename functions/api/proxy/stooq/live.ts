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
    const requestId = crypto.randomUUID().slice(0, 8);
    const logs: string[] = [];
    const log = (label: string, value?: unknown) => {
        if (value === undefined) {
            logs.push(label);
            return;
        }
        if (typeof value === "string") {
            logs.push(`${label} ${value}`);
            return;
        }
        logs.push(`${label} ${JSON.stringify(value)}`);
    };
    const flushLogs = () => {
        if (!logs.length) return;
        const header = `[stooq/live][${requestId}]`;
        const line = "+------------------------------------------------------------";
        const body = logs.map((entry) => `| ${entry}`).join("\n");
        console.debug(`${header} ${line}\n${body}\n${header} ${line}`);
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    log("request:", `${request.method} ${url.pathname}${url.search}`);
    const symbol = url.searchParams.get("symbol");

    if (!symbol) {
        log("error:", "Missing required query param: symbol");
        flushLogs();
        return jsonResponse({ error: "Missing required query param: symbol" }, 400);
    }

    const stooqUrl = new URL("https://stooq.com/q/l/");
    stooqUrl.searchParams.set("s", symbol.toUpperCase());
    stooqUrl.searchParams.set("f", "sd2t2ohlcv");
    stooqUrl.searchParams.set("h", "");
    stooqUrl.searchParams.set("e", "json");
    log("upstream url:", stooqUrl.toString());

    const upstream = await fetch(stooqUrl.toString(), {
        method: "GET",
        headers: {
            "User-Agent": "Prosperitas/1.0",
            "Accept": "application/json,text/plain,*/*",
        },
    });

    const contentType = upstream.headers.get("content-type") ?? "unknown";
    log("upstream status:", upstream.status);
    log("upstream content-type:", contentType);

    if (!upstream.ok) {
        log("error:", `Upstream error ${upstream.status}`);
        flushLogs();
        return jsonResponse({ error: "Upstream error", status: upstream.status }, upstream.status);
    }

    const rawBody = await upstream.text();
    log("upstream body length:", rawBody.length);
    log("upstream body snippet:", rawBody.slice(0, 500));

    const sanitizedBody = rawBody.replace(/:\s*(?=[,}\]])/g, ": null");
    if (sanitizedBody !== rawBody) {
        log("sanitize:", "sanitized malformed JSON fields");
    }

    const payload = (() => {
        try {
            return JSON.parse(sanitizedBody);
        } catch (error) {
            log("error:", `JSON parse error ${String(error)}`);
            return null;
        }
    })() as {
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

    log("payload:", payload);
    flushLogs();

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
