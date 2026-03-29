// functions/api/proxy/stooq/historical.ts

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface UnifiedCandle {
    date: string;
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

function parseCsvRows(csvText: string) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length <= 1) return [] as UnifiedCandle[];
    const rows: UnifiedCandle[] = [];
    for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",");
        if (parts.length < 5) continue;
        while (parts.length < 6) parts.push("");
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

const fetchWithTimeout = async (url: string, timeoutMs: number, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

const readSymbols = (url: URL) => {
    const symbolYF = url.searchParams.get("symbolYF")?.trim() || "";
    const symbolStooq = url.searchParams.get("symbolStooq")?.trim() || "";
    const legacySymbol = url.searchParams.get("symbol")?.trim() || "";
    if (symbolYF || symbolStooq) {
        return { symbolYF, symbolStooq };
    }
    if (legacySymbol) {
        return { symbolYF: legacySymbol, symbolStooq: legacySymbol };
    }
    return { symbolYF: "", symbolStooq: "" };
};

const fetchYahooHistorical = async (
    symbol: string,
    fromDate: Date,
    toDate: Date
): Promise<UnifiedCandle[] | null> => {
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
    if (!upstream.ok) return null;

    const payload = (await upstream.json()) as {
        chart?: {
            result?: Array<{
                timestamp?: number[];
                indicators?: {
                    quote?: Array<{
                        close?: Array<number | null>;
                    }>;
                };
            }>;
        };
    };

    const result = payload.chart?.result?.[0];
    if (!result) return [];
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];

    return timestamps.map((ts, index) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        time: null,
        open: null,
        high: null,
        low: null,
        close: parseNumber(closes[index]),
        volume: null,
    }));
};

const fetchStooqHistorical = async (
    symbol: string,
    effectiveFrom: string,
    effectiveTo: string
): Promise<UnifiedCandle[] | null> => {
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
    if (!upstream.ok) return null;
    const csvText = await upstream.text();
    return parseCsvRows(csvText);
};

export async function onRequest(context: { request: Request }): Promise<Response> {
    const { request } = context;
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const { symbolYF, symbolStooq } = readSymbols(url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if ((!symbolYF && !symbolStooq) || !from) {
        return jsonResponse({ error: "Missing required query params: symbolYF or symbolStooq or symbol, from" }, 400);
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

    if (symbolYF) {
        try {
            const yfData = await fetchYahooHistorical(
                symbolYF,
                effectiveFromDate,
                effectiveToDate
            );
            if (yfData && yfData.length > 0) {
                return jsonResponse({
                    symbol: symbolYF,
                    type: "historical",
                    range: { from: effectiveFrom, to: effectiveTo },
                    data: yfData,
                    source: "yahoo",
                });
            }
        } catch {
            // fallback to stooq when available
        }
    }

    if (symbolStooq) {
        try {
            const stooqData = await fetchStooqHistorical(symbolStooq, effectiveFrom, effectiveTo);
            if (stooqData) {
                return jsonResponse({
                    symbol: symbolStooq,
                    type: "historical",
                    range: { from: effectiveFrom, to: effectiveTo },
                    data: stooqData,
                    source: "stooq",
                });
            }
        } catch {
            // return error below
        }
    }

    return jsonResponse({ error: "Upstream error", status: 502 }, 502);
}
