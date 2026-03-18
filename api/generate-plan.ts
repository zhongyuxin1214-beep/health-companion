export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { height, weight, target_calories, pantry, feedback, energy_level } = req.body;
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    return res.status(200).json({ error: "服务器 AI Key 未配置" });
  }

  const pantryHint = pantry ? `\n用户冰箱现有食材：${pantry}。尽量优先使用这些食材，并在对应菜品标记 "uses_pantry": true。` : "";
  const feedbackHint = feedback ? `\n用户对上一版食谱的反馈是「${feedback}」，请据此调整推荐。` : "";
  const energyHint = energy_level ? `\n用户今日体力状态：${energy_level}。` : "";

  const prompt = `你是一位专业营养师。请根据以下信息为用户推荐今日三餐计划。

用户信息：
- 身高：${height || "未知"}cm
- 体重：${weight || "未知"}kg
- 今日目标热量：${target_calories || 1600}kcal
${pantryHint}${feedbackHint}${energyHint}

要求：
1. 推荐早餐、午餐、晚餐各一道菜
2. 每道菜必须包含：菜品名称、热量(kcal)、蛋白质(g)、碳水(g)、脂肪(g)
3. 每道菜必须包含精准的油量建议（如"限5g植物油"）和盐量建议（如"少盐，约2g"）
4. 三餐总热量尽量接近目标热量
5. 附一句简短的教练建议

严格返回以下JSON格式，不要返回任何其他文字：
{
  "meal_plan": [
    {"meal": "早餐", "food": "菜名", "calories": 数字, "uses_pantry": false, "macros": {"protein": 数字, "carbs": 数字, "fat": 数字, "oil_tip": "油量建议", "salt_tip": "盐量建议"}},
    {"meal": "午餐", "food": "菜名", "calories": 数字, "uses_pantry": false, "macros": {"protein": 数字, "carbs": 数字, "fat": 数字, "oil_tip": "油量建议", "salt_tip": "盐量建议"}},
    {"meal": "晚餐", "food": "菜名", "calories": 数字, "uses_pantry": false, "macros": {"protein": 数字, "carbs": 数字, "fat": 数字, "oil_tip": "油量建议", "salt_tip": "盐量建议"}}
  ],
  "coach_advice": "一句教练建议"
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
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Doubao API error:", JSON.stringify(data));
      return res.status(200).json({ error: `AI 报错: ${data.error?.message || response.statusText}` });
    }

    const aiText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json(parsed);
    } else {
      return res.status(200).json({ error: "AI 返回格式异常", raw: aiText });
    }
  } catch (error: any) {
    console.error("generate-plan error:", error);
    return res.status(200).json({ error: "网络超时，请重试" });
  }
}
