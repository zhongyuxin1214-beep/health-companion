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
        { role: "system", content: `你是一位专业营养师。从用户描述中提取食物信息，必须返回完整的5项营养数据。
规则：
1. name: 具体食物名（如用户说"吃了碗面"应返回"一碗面条"）
2. calories: 估算总热量(kcal)
3. protein: 蛋白质克数(g)，精确到整数
4. carbs: 碳水化合物克数(g)，精确到整数  
5. fat: 脂肪克数(g)，精确到整数

如果用户提到多种食物，合并为一条记录，名称用"+"连接。
只返回JSON: {"name": "食物名", "calories": 数字, "protein": 数字, "carbs": 数字, "fat": 数字}` },
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
