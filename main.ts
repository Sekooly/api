// main.ts - Supabase Proxy for Deno Deploy

Deno.serve(async (req: Request) => {
  // --- CORS Preflight ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-supabase-url, x-supabase-anon-key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    // --- Get Supabase config from headers ---
    const supabaseUrl = req.headers.get("x-supabase-url");
    const supabaseAnonKey = req.headers.get("x-supabase-anon-key");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Missing useful headers." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- Build target URL ---
    const url = new URL(req.url);
    const targetUrl = `${supabaseUrl}${url.pathname}${url.search}`;

    // --- Prepare headers for Supabase ---
    const headers = new Headers(req.headers);
    headers.set("apikey", supabaseAnonKey);
    headers.delete("host");

    // --- Forward request to Supabase ---
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    });

    // --- Return response with CORS ---
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    responseHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-supabase-url, x-supabase-anon-key"
    );

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Proxy Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});