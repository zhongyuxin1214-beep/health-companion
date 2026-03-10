export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { text } = await req.json();
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT_ID;

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: endpointId,
      messages: [
        { role: "system", content: '你是一个饮食专家。从用户话语中提取食物名和营养数据，只返回JSON: {"name": "食物名", "calories": 数字, "protein": 蛋白质克数, "carbs": 碳水克数, "fat": 脂肪克数}' },
        { role: "user", content: text }
      ]
    })
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  return new Response(jsonMatch ? jsonMatch[0] : JSON.stringify({error: "解析失败"}), {
    headers: { 'Content-Type': 'application/json' }
  });
}
