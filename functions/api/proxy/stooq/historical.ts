// functions/api/proxy/stooq/historical.ts

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
    headers.set("Cache-Control", "public, max-age=300");
    return new Response(JSON.stringify(body), { status, headers });
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

function formatYmdDashed(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDaysUtc(date: Date, days: number): Date {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
}

function parseNumber(value: string | undefined): number | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized || normalized === "-" || normalized.toLowerCase() === "null") return null;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
}

function parseCsvRows(csvText: string) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",");
        if (parts.length < 6) continue;
        rows.push({
            date: parts[0],
            time: null,
            open: parseNumber(parts[1]),
            high: parseNumber(parts[2]),
            low: parseNumber(parts[3]),
            close: parseNumber(parts[4]),
            volume: parseNumber(parts[5]),
        });
    }
    return rows;
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
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!symbol || !from) {
        return jsonResponse({ error: "Missing required query params: symbol, from" }, 400);
    }

    const fromDate = parseYmdCompact(from);
    if (!fromDate) {
        return jsonResponse({ error: "Invalid from date. Use YYYYMMDD." }, 400);
    }

    let effectiveFrom = from;
    let effectiveTo = to ?? "";
    let excludeAnchorDate: string | null = null;

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
        excludeAnchorDate = formatYmdDashed(fromDate);
    }

    const stooqUrl = new URL("https://stooq.com/q/d/l/");
    stooqUrl.searchParams.set("s", symbol.toLowerCase());
    stooqUrl.searchParams.set("i", "d");
    stooqUrl.searchParams.set("f", effectiveFrom);
    stooqUrl.searchParams.set("t", effectiveTo);

    const upstream = await fetch(stooqUrl.toString(), {
        method: "GET",
        headers: {
            "User-Agent": "Prosperitas/1.0",
        },
    });

    if (!upstream.ok) {
        return jsonResponse({ error: "Upstream error", status: upstream.status }, upstream.status);
    }

    const csvText = await upstream.text();
    let data = parseCsvRows(csvText);
    if (excludeAnchorDate) {
        data = data.filter((row) => row.date !== excludeAnchorDate);
    }

    return jsonResponse({
        symbol,
        type: "historical",
        range: { from: effectiveFrom, to: effectiveTo },
        data,
        source: "stooq",
    });
}
