export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;

export default async function handler(req: Request): Promise<Response> {
  // 环境变量：必须配置 SUPABASE_URL
  if (!SUPABASE_URL) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL is not configured on the server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const incomingUrl = new URL(req.url);
  const origin = req.headers.get("origin") ?? "*";
  const prefix = "/api/supabase-proxy";

  // 处理跨域预检：OPTIONS 直接 200
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

  // 构造转发目标 URL，保留 /rest/v1 /auth/v1 /storage/v1 等后缀路径
  const pathSuffix = incomingUrl.pathname.startsWith(prefix)
    ? incomingUrl.pathname.slice(prefix.length)
    : incomingUrl.pathname;

  const targetUrl = new URL(SUPABASE_URL);
  targetUrl.pathname = `${targetUrl.pathname.replace(/\/$/, "")}${pathSuffix}`;
  targetUrl.search = incomingUrl.search;

  // 支持所有 HTTP 方法：GET, POST, PUT, PATCH, DELETE 等
  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  // 完整转发 Body：使用 arrayBuffer 读取原始请求体
  let body: ArrayBuffer | undefined;
  if (hasBody) {
    body = await req.arrayBuffer();
  }

  // 头部清洗：只保留 Authorization / apikey / Content-Type，移除 host / referrer
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



