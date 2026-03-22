export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { profile, pantry, energyLevel } = req.body;
    const apiKey = process.env.DOUBAO_API_KEY;
    const endpointId = process.env.DOUBAO_ENDPOINT_ID;

    const systemPrompt = `你是一位全能健康教练。根据用户信息，同时生成今日食谱和健身计划。
    要求严格返回如下 JSON 格式，不要有任何多余文字：
    {
      "meal_plan": {
        "breakfast": {"name": "..", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "5g", "salt": "1g"},
        "lunch": {"name": "..", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "5g", "salt": "1g"},
        "dinner": {"name": "..", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "5g", "salt": "1g"}
      },
      "workout_plan": {
        "focus": "训练部位",
        "exercises": [{"name": "动作名", "sets": "4组x12次", "tip": "要领"}],
        "cardio": "有氧建议"
      }
    }`;

    const userText = `用户档案：身高${profile.height}cm, 体重${profile.weight}kg, 目标${profile.goal}。
    今日体力：${energyLevel}。现有食材：${pantry}。`;

    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: endpointId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    
    res.status(200).json(jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "AI 返回解析失败" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
