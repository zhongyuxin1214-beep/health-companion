export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;

function buildCors(origin: string | null) {
  const allowOrigin = origin ?? "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  } as const;
}

export default async function handler(req: Request): Promise<Response> {
  if (!SUPABASE_URL) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL is not configured on the server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const origin = req.headers.get("origin");
  const cors = buildCors(origin);

  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  // Vercel rewrite sends /api/proxy/* -> /api/proxy, so we must reconstruct the subpath
  // Prefer the actual URL if Vercel keeps it; fall back to common forwarded headers.
  const reqUrl = new URL(req.url);
  const basePath = "/api/proxy";
  const prefix = `${basePath}/`;

  const forwardedPath =
    req.headers.get("x-original-url") ||
    req.headers.get("x-rewrite-url") ||
    req.headers.get("x-forwarded-uri") ||
    req.headers.get("x-vercel-rewrite") ||
    req.headers.get("x-matched-path");

  const originalUrl = forwardedPath
    ? new URL(forwardedPath, reqUrl.origin)
    : reqUrl;

  // 路径转发逻辑：识别 /api/proxy/ 后面的所有内容，并准确拼接到 SUPABASE_URL 之后
  let suffixPath = "/";
  if (originalUrl.pathname === basePath || originalUrl.pathname === `${basePath}/`) {
    suffixPath = "/";
  } else if (originalUrl.pathname.startsWith(prefix)) {
    suffixPath = `/${originalUrl.pathname.slice(prefix.length)}`.replace(/^\/+/, "/");
  } else {
    // 兜底
    suffixPath = "/";
  }

  const target = new URL(SUPABASE_URL);
  target.pathname = `${target.pathname.replace(/\/$/, "")}${suffixPath}`;
  target.search = originalUrl.search; // 查询参数完整转发

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  // 头部清洗：保留 Authorization、apikey、Content-Type；移除 host 和 referrer
  const incoming = new Headers(req.headers);
  incoming.delete("host");
  incoming.delete("referrer");
  incoming.delete("referer");

  const forwardHeaders = new Headers();
  const authorization = incoming.get("authorization");
  const apikey = incoming.get("apikey");
  const contentType = incoming.get("content-type");
  if (authorization) forwardHeaders.set("Authorization", authorization);
  if (apikey) forwardHeaders.set("apikey", apikey);
  if (contentType) forwardHeaders.set("Content-Type", contentType);

  const upstream = await fetch(target.toString(), {
    method,
    headers: forwardHeaders,
    body,
    redirect: "manual",
  });

  const resHeaders = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(cors)) resHeaders.set(k, v);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

