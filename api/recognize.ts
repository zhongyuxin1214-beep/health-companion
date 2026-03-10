export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  try {
    let { image } = req.body;
    const apiKey = process.env.DOUBAO_API_KEY;
    const endpointId = process.env.DOUBAO_ENDPOINT_ID;

    if (!apiKey || !endpointId) return res.status(200).json({ error: "服务器 Key 未配置" });

    // 【核心修复】确保 Base64 格式正确：去掉 data:image/xxx;base64, 前缀
    if (image.includes('base64,')) {
      image = image.split('base64,')[1];
    }

    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: endpointId,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Food identification. Return ONLY JSON: {\"name\": \"食物\", \"calories\": 0, \"protein\": 0, \"carbs\": 0, \"fat\": 0}"
              },
              {
                type: "image_url",
                image_url: { 
                  url: `data:image/jpeg;base64,${image}` 
                }
              }
            ]
          }
        ],
        temperature: 0.1, // 降低随机性提高速度
        max_tokens: 500   // 限制输出长度提高速度
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("豆包 API 错误详情:", JSON.stringify(data));
      return res.status(200).json({ 
        error: `AI 报错: ${data.error?.message || response.statusText}` 
      });
    }

    const aiText = data.choices?.[0]?.message?.content || "";
    // 后端提取 JSON
    const jsonMatch = aiText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return res.status(200).json(JSON.parse(jsonMatch[0]));
    } else {
      return res.status(200).json({ error: "AI 识别结果无法解析", raw: aiText });
    }

  } catch (error: any) {
    return res.status(200).json({ error: "网络超时", message: "由于 Vercel 免费版限制，请尝试拍摄更小、更清晰的图片" });
  }
}
