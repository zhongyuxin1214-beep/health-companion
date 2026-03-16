export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// 统一 CORS 头部配置
function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default async function handler(req: Request): Promise<Response> {
  // 1. 基础环境检查
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: "服务器环境变量未配置" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // 2. 处理预检请求 (OPTIONS)
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    
    // 【核心优化】：使用更稳健的路径提取方式
    // 无论 Vercel 如何重写，我们只取 /api/proxy/ 之后的部分
    const pathPart = reqUrl.pathname.split('/api/proxy')[1] || '/';
    
    // 拼接目标 URL
    const targetUrl = new URL(SUPABASE_URL);
    // 移除末尾斜杠并拼接子路径
    targetUrl.pathname = targetUrl.pathname.replace(/\/$/, "") + pathPart;
    targetUrl.search = reqUrl.search;

    const method = req.method.toUpperCase();
    
    // 【稳定性优化】：克隆请求体，防止流在读取前关闭
    const body = ["GET", "HEAD"].includes(method) 
      ? null 
      : await req.clone().arrayBuffer();

    // 3. 构建转发头部
    const forwardHeaders = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) forwardHeaders.set("Content-Type", contentType);

    // 注入 API Key
    forwardHeaders.set("apikey", SUPABASE_ANON_KEY);
    
    // 优先使用客户端传来的 Authorization (JWT)，否则使用 Anon Key 兜底
    const auth = req.headers.get("authorization");
    forwardHeaders.set("Authorization", auth || `Bearer ${SUPABASE_ANON_KEY}`);

    // 4. 发起请求
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method,
      headers: forwardHeaders,
      body,
    });

    // 5. 构建并返回响应
    const responseHeaders = new Headers(upstreamResponse.headers);
    // 合并 CORS 头部
    Object.entries(corsHeaders).forEach(([k, v]) => {
      responseHeaders.set(k, v);
    });

    // 防止 Vercel 错误地尝试重新处理响应
    responseHeaders.delete("content-encoding");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });

  } catch (error: any) {
    // 【报错优化】：防止前端 Unexpected Token A 错误，始终返回 JSON
    return new Response(
      JSON.stringify({ 
        error: "代理服务器故障", 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
}

