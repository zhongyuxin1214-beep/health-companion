export default async function handler(req: any, res: any) {
  const { pantry, calories } = req.body;
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT_ID;

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: endpointId,
      messages: [{
        role: "user",
        content: `现有食材：${pantry}。目标热量：${calories}kcal。请推荐今日三餐，以JSON格式返回：{"meal_plan": {"breakfast": {"name": "..", "calories": 0}, "lunch": {"name": "..", "calories": 0}, "dinner": {"name": "..", "calories": 0}}}`
      }]
    })
  });
  const data = await response.json();
  res.status(200).json(JSON.parse(data.choices[0].message.content));
}
