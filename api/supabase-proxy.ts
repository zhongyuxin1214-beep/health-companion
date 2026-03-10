export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default async function handler(req: Request): Promise<Response> {
  // 自检：后端必须配置 SUPABASE_URL，否则直接提示前端
  if (!SUPABASE_URL) {
    return new Response(
      JSON.stringify({
        error: "SUPABASE_URL is not configured on the server",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const incomingUrl = new URL(req.url);
  const prefix = "/api/supabase-proxy";

  // 保留 /rest/v1 /auth/v1 /storage/v1 等后缀路径
  const pathSuffix = incomingUrl.pathname.startsWith(prefix)
    ? incomingUrl.pathname.slice(prefix.length)
    : incomingUrl.pathname;

  const targetUrl = new URL(SUPABASE_URL);
  targetUrl.pathname = `${targetUrl.pathname.replace(/\/$/, "")}${pathSuffix}`;
  targetUrl.search = incomingUrl.search;

  // CORS 预检：允许常见方法与头
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": incomingUrl.origin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
          "Authorization, apikey, X-Client-Info, Content-Type, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const headers = new Headers(req.headers);
  headers.delete("host");

  // 确保带上 apikey（若前端未自动附带则兜底）
  if (SUPABASE_ANON_KEY && !headers.has("apikey")) {
    headers.set("apikey", SUPABASE_ANON_KEY);
  }

  // Authorization 头保持原样转发（supabase-js 会自动加 Bearer token）
  // 不做覆盖，只要存在就原封不动

  const shouldHaveBody = !["GET", "HEAD"].includes(req.method.toUpperCase());

  // 使用原始 body 流构造新的 Request，实现完整流式转发
  const upstreamRequest = new Request(targetUrl.toString(), {
    method: req.method,
    headers,
    body: shouldHaveBody ? req.body : undefined,
    redirect: "manual",
  });

  const upstream = await fetch(upstreamRequest);

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("Access-Control-Allow-Origin", incomingUrl.origin);
  responseHeaders.set(
    "Access-Control-Expose-Headers",
    "Content-Length, Date, Transfer-Encoding, Content-Encoding, apikey, Authorization",
  );

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}


