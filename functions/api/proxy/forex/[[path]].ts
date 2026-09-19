// functions/api/proxy/forex/[[path]].ts

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

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
    headers.set("Cache-Control", "public, max-age=60");
    return new Response(JSON.stringify(body), { status, headers });
}

const buildFrankfurterUrl = (requestUrl: URL) => {
    const pathname = requestUrl.pathname
        .replace(/^\/api\/proxy\/forex\/?/, "")
        .trim();
    const upstreamUrl = new URL(
        `https://api.frankfurter.app/${pathname || "latest"}`
    );

    requestUrl.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.append(key, value);
    });

    return upstreamUrl;
};

export async function onRequest(context: { request: Request }): Promise<Response> {
    const { request } = context;
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "GET") {
        return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    try {
        const requestUrl = new URL(request.url);
        const pathname = requestUrl.pathname.replace(/^\/api\/proxy\/forex\/?/, "");
        if (pathname && pathname !== "latest" && !/^\d{4}-\d{2}-\d{2}$/.test(pathname)) {
            return jsonResponse({ error: "Invalid forex path" }, 400);
        }
        if ([...requestUrl.searchParams.keys()].some((key) => key !== "from" && key !== "to") ||
            [...requestUrl.searchParams.values()].some((value) => !/^[A-Za-z]{3}$/.test(value))) {
            return jsonResponse({ error: "Invalid forex query" }, 400);
        }
        const upstreamUrl = buildFrankfurterUrl(requestUrl);

        const upstream = await fetch(upstreamUrl.toString(), {
            method: "GET",
            headers: {
                "User-Agent": "Prosperitas/1.0",
                "Accept": "application/json,text/plain,*/*",
            },
        });

        const bodyText = await upstream.text();
        const headers = corsHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=60");
        return new Response(bodyText, {
            status: upstream.status,
            headers,
        });
    } catch {
        return jsonResponse({ error: "Upstream error", status: 502 }, 502);
    }
}
