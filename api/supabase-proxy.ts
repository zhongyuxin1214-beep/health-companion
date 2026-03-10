export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;

export default async function handler(req: Request): Promise<Response> {
  if (!SUPABASE_URL) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL environment variable" }),
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
  // 拼接原始 path + 查询参数
  targetUrl.pathname = `${targetUrl.pathname.replace(/\/$/, "")}${pathSuffix}`;
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(req.headers);
  // 由 fetch 自己处理 Host 等头
  headers.delete("host");

  const init: RequestInit = {
    method: req.method,
    headers,
    // GET/HEAD 不需要 body
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    redirect: "manual",
  };

  const upstream = await fetch(targetUrl.toString(), init);

  const responseHeaders = new Headers(upstream.headers);
  // 确保 JSON 响应类型保留
  if (!responseHeaders.has("content-type") && upstream.headers.get("content-type")) {
    responseHeaders.set("content-type", upstream.headers.get("content-type") as string);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

