export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { height, weight, target_calories, pantry, feedback, energy_level, workout_frequency } = req.body;
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    return res.status(200).json({ error: "服务器 AI Key 未配置" });
  }

  // 动态构建提示语
  const pantryHint = pantry ? `\n- 用户冰箱现有食材：${pantry}。请优先使用。` : "";
  const feedbackHint = feedback ? `\n- 用户上轮反馈：${feedback}。请据此调整。` : "";
  const energyStatus = energy_level === 'energetic' ? '精力充沛' : (energy_level === 'tired' ? '比较疲惫' : '状态一般');

  const prompt = `你是一位全能健康教练。请根据以下信息为用户定制今日【保姆级】饮食与健身计划。

用户信息：
- 身体：身高${height}cm, 体重${weight}kg。今日目标摄入：${target_calories}kcal。
- 状态：当前感觉${energyStatus}。每周健身${workout_frequency || 3}次。${pantryHint}${feedbackHint}

要求：
1. 饮食：推荐早午晚三餐。包含菜名、热量、P/C/F(g)、以及具体的【油量(g)】和【盐量(g)】建议。
2. 健身：明确今日训练部位。列出3-4个动作清单（含组数x次数）。
3. 动作要领：点击动作名时显示的简短指导。
4. 休息日逻辑：如果根据频率今日应休息，则推荐拉伸或冥想。

必须严格返回以下JSON格式，严禁任何额外文字：
{
  "meal_plan": [
    {"meal": "早餐", "food": "名称", "calories": 数字, "protein": 数字, "carbs": 数字, "fat": 数字, "oil": "数字g", "salt": "数字g"},
    {"meal": "午餐", "food": "名称", "calories": 数字, "protein": 数字, "carbs": 数字, "fat": 数字, "oil": "数字g", "salt": "数字g"},
    {"meal": "晚餐", "food": "名称", "calories": 数字, "protein": 数字, "carbs": 数字, "fat": 数字, "oil": "数字g", "salt": "数字g"}
  ],
  "workout_plan": {
    "type": "训练日/休息日",
    "part": "部位名称",
    "exercises": [
      {"name": "动作名", "sets": "4组x12次", "description": "要领文字"}
    ]
  },
  "coach_advice": "今日寄语"
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
        temperature: 0.4, // 稍微降低随机性，结果更稳定
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "AI 响应异常");

    const aiText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      res.status(200).json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(200).json({ error: "解析失败", raw: aiText });
    }
  } catch (error: any) {
    res.status(200).json({ error: "AI连接超时，请重试", details: error.message });
  }
}
