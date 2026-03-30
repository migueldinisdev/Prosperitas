// functions/api/proxy/stock/search-yahoo.ts

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

export async function onRequest(context: { request: Request }): Promise<Response> {
    const { request } = context;
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";

    if (!query) {
        return jsonResponse({ quotes: [] });
    }

    const upstreamUrl = new URL("https://query1.finance.yahoo.com/v1/finance/search");
    upstreamUrl.searchParams.set("q", query);

    const upstream = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: {
            "User-Agent": "Prosperitas/1.0",
            "Accept": "application/json,text/plain,*/*",
        },
    });

    if (!upstream.ok) {
        return jsonResponse({ error: "Upstream error", status: upstream.status }, upstream.status);
    }

    const payload = (await upstream.json()) as {
        quotes?: Array<{
            symbol?: string;
            shortname?: string;
            longname?: string;
            quoteType?: string;
            exchDisp?: string;
            score?: number;
        }>;
    };

    const quotes = (payload.quotes ?? []).map((quote) => ({
        symbol: quote.symbol ?? "",
        shortname: quote.shortname ?? "",
        longname: quote.longname ?? "",
        quoteType: quote.quoteType ?? "",
        exchDisp: quote.exchDisp ?? "",
        score: typeof quote.score === "number" ? quote.score : 0,
    }));

    return jsonResponse({ quotes });
}
