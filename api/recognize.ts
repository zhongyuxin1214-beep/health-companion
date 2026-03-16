export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  try {
    let { image } = req.body;
    const apiKey = process.env.DOUBAO_API_KEY;
    const endpointId = process.env.DOUBAO_ENDPOINT_ID;

    if (!apiKey || !endpointId) return res.status(200).json({ error: "服务器 Key 未配置" });

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
                text: `你是一位专业营养师。请仔细识别图片中的食物，返回以下5项数据。
要求：
1. name: 具体食物名称（如"红烧排骨配米饭"而不是"一盘菜"）
2. calories: 估算总热量(kcal)，考虑份量大小
3. protein: 蛋白质克数(g)，精确到整数
4. carbs: 碳水化合物克数(g)，精确到整数
5. fat: 脂肪克数(g)，精确到整数

只返回JSON格式: {"name": "食物名", "calories": 数字, "protein": 数字, "carbs": 数字, "fat": 数字}
不要返回任何其他文字。`
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
        temperature: 0.1,
        max_tokens: 500
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
