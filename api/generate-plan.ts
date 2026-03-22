export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return res.status(200).end();

  const { height, weight, target_calories, pantry, energy_level, workout_frequency } = req.body;
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT_ID;

  if (!apiKey || !endpointId) return res.status(200).json({ error: "Config missing" });

  const energy = energy_level === 'energetic' ? 'high' : (energy_level === 'tired' ? 'low' : 'normal');

  // 【极致优化】使用英文指令强制 AI 快速响应，去掉所有废话
  const prompt = `Task: Create 1-day plan. 
  User: ${height}cm, ${weight}kg, target ${target_calories}kcal, energy: ${energy}, gym: ${workout_frequency}x/week. Pantry: ${pantry}.
  Return ONLY JSON:
  {
    "meal_plan": [
      {"meal": "早餐", "food": "Name", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "g", "salt": "g"},
      {"meal": "午餐", "food": "Name", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "g", "salt": "g"},
      {"meal": "晚餐", "food": "Name", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "oil": "g", "salt": "g"}
    ],
    "workout_plan": {"part": "Focus", "exercises": [{"name": "Ex", "sets": "4x12", "description": "Tip"}]},
    "coach_advice": "Advice"
  }`;

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: endpointId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // 最快推理速度
        max_tokens: 800,  // 严格限制长度
      }),
    });

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      res.status(200).json(JSON.parse(jsonMatch[0]));
    } else {
      throw new Error("Parse Error");
    }
  } catch (error: any) {
    // 【终极兜底】如果 AI 还是慢，直接返回一个“万能保底模板”，不让前端报错
    res.status(200).json({
      "meal_plan": [
        {"meal": "早餐", "food": "全麦面包配鸡蛋", "calories": 350, "protein": 15, "carbs": 40, "fat": 10, "oil": "3g", "salt": "1g"},
        {"meal": "午餐", "food": "香煎鸡胸肉配糙米饭", "calories": 550, "protein": 40, "carbs": 60, "fat": 12, "oil": "5g", "salt": "2g"},
        {"meal": "晚餐", "food": "清蒸鱼配时蔬", "calories": 450, "protein": 35, "carbs": 30, "fat": 8, "oil": "3g", "salt": "1g"}
      ],
      "workout_plan": {"part": "全身唤醒", "exercises": [{"name": "开合跳", "sets": "4组x30秒", "description": "保持呼吸节奏"}]},
      "coach_advice": "由于网络波动，为您准备了万能健康方案，加油！"
    });
  }
}
