export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;

export default async function handler(req: Request): Promise<Response> {
  // 自检：缺少环境变量时直接返回清晰错误
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

  // CORS 预检
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
  // 按你的要求，转发时清理可能导致拒绝的头部
  headers.delete("host");
  headers.delete("connection");

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  let body: BodyInit | undefined;
  if (hasBody) {
    // 使用 arrayBuffer 完整读取 body，避免 JSON 解析截断
    const buffer = await req.arrayBuffer();
    body = buffer;
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "Failed to reach Supabase",
        message: error?.message ?? String(error),
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": incomingUrl.origin,
        },
      },
    );
  }

  // 非 2xx/3xx 情况下，返回清晰 JSON 错误，避免前端崩溃
  if (!upstream.ok) {
    let rawBody = "";
    try {
      rawBody = await upstream.text();
    } catch {
      rawBody = "";
    }

    return new Response(
      JSON.stringify({
        error: "Supabase responded with an error",
        status: upstream.status,
        statusText: upstream.statusText,
        body: rawBody,
      }),
      {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": incomingUrl.origin,
        },
      },
    );
  }

  // 成功时直接将响应流回前端，附带基础 CORS
  const resHeaders = new Headers(upstream.headers);
  resHeaders.set("Access-Control-Allow-Origin", incomingUrl.origin);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}



