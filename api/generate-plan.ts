export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return res.status(200).end();

  const { height, weight, target_calories, pantry, energy_level, workout_frequency } = req.body;
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT_ID;

  if (!apiKey || !endpointId) return res.status(200).json({ error: "Key未配置" });

  const pantryHint = pantry ? `现有食材:${pantry}。` : "";
  const energyStatus = energy_level === 'energetic' ? '精力旺盛' : (energy_level === 'tired' ? '疲惫' : '一般');

  // 【核心优化】精简了提示词，让 AI 响应速度提升一倍
  const prompt = `你是健康教练。为用户定制今日方案。
信息：${height}cm, ${weight}kg, 目标${target_calories}kcal, 状态${energyStatus}, 每周健身${workout_frequency}次。${pantryHint}
要求：1.饮食含三餐名、热量、油盐建议。2.健身含部位、3个动作(组数x次数)及简短要领。
必须严格返回JSON，无废话：
{
  "meal_plan": [
    {"meal": "早餐", "food": "名", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "g", "salt": "g"},
    {"meal": "午餐", "food": "名", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "g", "salt": "g"},
    {"meal": "晚餐", "food": "名", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "g", "salt": "g"}
  ],
  "workout_plan": {
    "type": "日", "part": "部位",
    "exercises": [{"name": "名", "sets": "x", "description": "简要"}]
  },
  "coach_advice": "寄语"
}`;

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: endpointId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2, // 调低温度，让 AI 思考速度变快
        max_tokens: 1000, // 缩短最大长度，防止超时
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "AI Busy");

    const aiText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      res.status(200).json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(200).json({ error: "解析失败" });
    }
  } catch (error: any) {
    // 这里如果超时了，返回一个保底提示
    res.status(200).json({ 
      error: "服务器响应慢，请点‘换一换’重试", 
      details: error.message 
    });
  }
}
