// functions/api/proxy/stooq.ts

export async function onRequest(context: {
    request: Request,
}): Promise<Response> {
    const { request } = context;
    const url = new URL(request.url);

    // Expected:
    // /api/proxy/stooq?s=googl.us&i=d&f=20200522&t=20210105
    const s = url.searchParams.get("s");
    const i = url.searchParams.get("i") ?? "d";
    const f = url.searchParams.get("f");
    const t = url.searchParams.get("t");

    if (!s || !f || !t) {
        return new Response("Missing required query params: s, f, t", {
            status: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
        });
    }

    // Build Stooq URL (hardcoded host/path; not an open proxy)
    const stooqUrl = new URL("https://stooq.com/q/d/l/");
    stooqUrl.searchParams.set("s", s.toLowerCase());
    stooqUrl.searchParams.set("i", i);
    stooqUrl.searchParams.set("f", f);
    stooqUrl.searchParams.set("t", t);

    const upstream = await fetch(stooqUrl.toString(), {
        method: "GET",
        headers: {
            "User-Agent": "Prosperitas/1.0",
        },
    });

    // Pass-through headers + add CORS
    const headers = new Headers(upstream.headers);

    // Ensure browser can read it
    headers.set("Access-Control-Allow-Origin", "*");

    // Stooq usually sets this, but force it to be safe
    headers.set("Content-Type", "text/csv; charset=utf-8");

    // Conservative cache (tweak later)
    headers.set("Cache-Control", "public, max-age=300");

    return new Response(upstream.body, {
        status: upstream.status,
        headers,
    });
}
