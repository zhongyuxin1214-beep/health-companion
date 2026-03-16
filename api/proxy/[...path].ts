export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;

export default async function handler(req: Request): Promise<Response> {
  if (!SUPABASE_URL) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL is not configured on the server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const incomingUrl = new URL(req.url);
  const origin = req.headers.get("origin") ?? "*";
  const basePath = "/api/proxy";
  const prefix = `${basePath}/`;

  // CORS preflight
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Extract everything after /api/proxy/
  let suffixPath = "/";
  if (incomingUrl.pathname === basePath || incomingUrl.pathname === prefix) {
    suffixPath = "/";
  } else if (incomingUrl.pathname.startsWith(prefix)) {
    suffixPath = `/${incomingUrl.pathname.slice(prefix.length)}`.replace(/^\/+/, "/");
  } else {
    suffixPath = incomingUrl.pathname.startsWith("/") ? incomingUrl.pathname : `/${incomingUrl.pathname}`;
  }

  const targetUrl = new URL(SUPABASE_URL);
  targetUrl.pathname = `${targetUrl.pathname.replace(/\/$/, "")}${suffixPath}`;
  targetUrl.search = incomingUrl.search;

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  let body: ArrayBuffer | undefined;
  if (hasBody) {
    body = await req.arrayBuffer();
  }

  // Keep only the required auth headers; strip host/referrer-like headers
  const incomingHeaders = new Headers(req.headers);
  incomingHeaders.delete("host");
  incomingHeaders.delete("referrer");
  incomingHeaders.delete("referer");

  const forwardHeaders = new Headers();
  const auth = incomingHeaders.get("authorization");
  const apikey = incomingHeaders.get("apikey");
  const contentType = incomingHeaders.get("content-type");

  if (auth) forwardHeaders.set("Authorization", auth);
  if (apikey) forwardHeaders.set("apikey", apikey);
  if (contentType) forwardHeaders.set("Content-Type", contentType);

  const upstream = await fetch(targetUrl.toString(), {
    method,
    headers: forwardHeaders,
    body,
    redirect: "manual",
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.set("Access-Control-Allow-Origin", origin);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

