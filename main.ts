// main.ts - Supabase Proxy for Deno Deploy

Deno.serve(async (req: Request) => {
  // --- CORS Preflight ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-supabase-url, x-supabase-anon-key, Content-Profile, Accept-Profile",
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
    const cleanSupabaseUrl = supabaseUrl.replace(/\/$/, "");
    const targetUrl = `${cleanSupabaseUrl}${url.pathname}${url.search}`;

    // --- Prepare headers for Supabase ---
    const headers = new Headers(req.headers);
    headers.set("apikey", supabaseAnonKey);
    // Ne pas supprimer le host, Supabase en a besoin pour le routing
    // headers.delete("host"); 
    
    // S'assurer que le Content-Type est bien transmis
    if (req.headers.has("content-type")) {
      headers.set("Content-Type", req.headers.get("content-type")!);
    }

    // --- Forward request to Supabase ---
    // Important : lire le body comme ArrayBuffer pour éviter les erreurs de décodage
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    // --- Return response with CORS ---
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS, DELETE");
    responseHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-supabase-url, x-supabase-anon-key, Content-Profile, Accept-Profile"
    );

    // Gérer le cas où la réponse n'a pas de corps (204, 304, etc.)
    if (response.status === 204 || response.status === 304) {
      return new Response(null, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Proxy Error", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});