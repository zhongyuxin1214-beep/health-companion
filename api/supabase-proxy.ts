export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;

function corsHeaders(origin: string | null) {
  // 尽量回显 origin（便于带 cookie / auth header 的场景），无 origin 则放开
  const allowOrigin = origin ?? "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  } as const;
}

function buildForwardHeaders(req: Request) {
  const incoming = new Headers(req.headers);

  // 头部清洗：移除可能导致上游拒绝或行为异常的头
  incoming.delete("host");
  incoming.delete("referrer");
  incoming.delete("referer");
  incoming.delete("connection");

  // 白名单：按要求保留 Authorization / apikey / Content-Type，并补齐常用请求头
  const forwarded = new Headers();
  const keep = ["authorization", "apikey", "content-type", "accept", "accept-language", "x-client-info"];
  for (const k of keep) {
    const v = incoming.get(k);
    if (v) forwarded.set(k, v);
  }
  return forwarded;
}

export default async function handler(req: Request): Promise<Response> {
  // 环境变量校验
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
  const origin = req.headers.get("origin");

  // CORS：必须处理 OPTIONS，返回 200 并携带正确头部
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders(origin) });
  }

  // 保留 /rest/v1 /auth/v1 /storage/v1 等后缀路径
  const pathSuffix = incomingUrl.pathname.startsWith(prefix)
    ? incomingUrl.pathname.slice(prefix.length)
    : incomingUrl.pathname;

  const targetUrl = new URL(SUPABASE_URL);
  targetUrl.pathname = `${targetUrl.pathname.replace(/\/$/, "")}${pathSuffix}`;
  targetUrl.search = incomingUrl.search;

  // 全方法支持：GET, POST, PUT, PATCH, DELETE（以及其它方法透传）
  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  // 流式 Body 转发：按要求使用 request.clone().arrayBuffer() 获取完整请求体
  let body: ArrayBuffer | undefined;
  if (hasBody) {
    body = await req.clone().arrayBuffer();
  }

  const headers = buildForwardHeaders(req);

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
          ...corsHeaders(origin),
        },
      },
    );
  }

  // 透明代理：原样返回 Supabase 响应（无论成功或失败），并补充 CORS 头
  const resHeaders = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    resHeaders.set(k, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}



