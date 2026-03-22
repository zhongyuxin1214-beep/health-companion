export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  try {
    let { image, text, systemPrompt } = req.body;
    const apiKey = process.env.DOUBAO_API_KEY;
    const endpointId = process.env.DOUBAO_ENDPOINT_ID;

    if (!apiKey || !endpointId) return res.status(200).json({ error: "服务器 Key 未配置" });

    let messages = [];

    // --- 分支逻辑：图片识别 ---
    if (image) {
      if (image.includes('base64,')) {
        image = image.split('base64,')[1];
      }
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `你是一位专业营养师。请仔细识别图片中的食物，返回以下5项数据。
              要求：
              1. name: 具体食物名称（如"红烧排骨配米饭"）
              2. calories: 估算总热量(kcal)
              3. protein: 蛋白质(g)
              4. carbs: 碳水(g)
              5. fat: 脂肪(g)
              只返回纯JSON: {"name": "食物名", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}`
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image}` }
            }
          ]
        }
      ];
    } 
    // --- 分支逻辑：文字指令（用于生成健身/饮食计划） ---
    else if (text) {
      messages = [
        {
          role: "system",
          content: systemPrompt || "你是一位专业的健康教练。请根据用户信息提供精准的建议，并严格返回 JSON 格式。"
        },
        {
          role: "user",
          content: text
        }
      ];
    } else {
      return res.status(400).json({ error: "请求数据不能为空" });
    }

    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: endpointId,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("豆包 API 报错:", JSON.stringify(data));
      return res.status(200).json({ error: `AI 报错: ${data.error?.message || response.statusText}` });
    }

    const aiText = data.choices?.[0]?.message?.content || "";
    // 鲁棒的 JSON 提取逻辑（兼容 Markdown 标签）
    const jsonMatch = aiText.match(/\{[\s\S]*?\}/);
    
    if (jsonMatch) {
      // 成功提取并返回解析后的 JSON
      return res.status(200).json(JSON.parse(jsonMatch[0]));
    } else {
      return res.status(200).json({ error: "AI 返回格式无法解析", raw: aiText });
    }

  } catch (error: any) {
    console.error("代理执行故障:", error);
    return res.status(200).json({ 
      error: "服务繁忙", 
      message: "正在全力连接 AI，请尝试拍摄更小、更清晰的图片" 
    });
  }
}
