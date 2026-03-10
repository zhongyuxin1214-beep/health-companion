import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, date, feedback, swap_single } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
      .from("daily_recommendations")
      .select("*")
      .eq("user_id", user_id)
      .eq("date", date)
      .maybeSingle();

    const energyLevel = existing?.energy_level || "normal";

    if (feedback && existing && existing.refresh_count >= 3) {
      return new Response(JSON.stringify({ error: "今日换一换次数已用完（最多3次）" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .maybeSingle();

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const { data: yesterdayMeals } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user_id)
      .eq("date", yesterdayStr);

    const yesterdayCal = (yesterdayMeals || []).reduce(
      (sum: number, m: any) => sum + Math.round(m.calories * (m.oil_multiplier || 1)),
      0
    );

    const weekAgo = new Date(date);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: recentWorkouts } = await supabase
      .from("workout_shots")
      .select("id")
      .eq("user_id", user_id)
      .gte("created_at", weekAgo.toISOString());

    const workoutCount = recentWorkouts?.length || 0;
    const workoutFreq = profile?.workout_frequency || 3;

    const { data: pantryItems } = await supabase
      .from("user_pantry")
      .select("ingredient_name")
      .eq("user_id", user_id);
    const pantryList = (pantryItems || []).map((p: any) => p.ingredient_name);

    let tdee = 1800;
    if (profile?.weight && profile?.height) {
      const activityFactors: Record<string, number> = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
      };
      const factor = activityFactors[profile.activity_level || "light"] || 1.375;
      let bmr: number;
      if (profile.body_fat) {
        const lbm = profile.weight * (1 - profile.body_fat / 100);
        bmr = 370 + 21.6 * lbm;
      } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * 30 - 161;
      }
      const dailyDeficit = ((profile.weight_loss_speed || 0.5) * 7700) / 7;
      tdee = Math.round(bmr * factor - dailyDeficit);
    }

    const overAte = yesterdayCal > tdee;
    const isLosing = (profile?.weight_loss_speed || 0) > 0;
    const dayOfWeek = new Date(date).getDay();

    const feedbackHint = feedback
      ? `\n\n用户对上一次方案的反馈是："${feedback}"。请根据此反馈调整方案：
- "练胸" → 生成胸部专项训练计划
- "练背" → 生成背部专项训练计划
- "练腿" → 生成腿部专项训练计划
- "练肩/臂" → 生成肩部和手臂专项训练计划
- "练核心" → 生成核心力量专项训练计划
- "想吃别的" → 推荐完全不同的食谱
- "太贵了" → 推荐更经济实惠的食谱
- "没时间做" → 推荐快手菜、简单料理
${swap_single ? "- 注意：用户只要求替换特定动作，请保持整体计划结构不变，只替换指定的那一个动作" : ""}`
      : "";

    const energyLabels: Record<string, string> = {
      energetic: "活力满满🔥，适合高强度训练",
      normal: "状态一般，正常强度训练",
      tired: "疲惫😴，应安排轻度恢复性训练",
    };

    const prompt = `你是一位专业的营养师+私人健身教练AI。

用户数据:
- 体重: ${profile?.weight || "未知"}kg, 身高: ${profile?.height || "未知"}cm
- 体脂: ${profile?.body_fat || "未知"}%, 活动水平: ${profile?.activity_level || "未知"}
- 今日体力状态: ${energyLabels[energyLevel] || "未知"}
- 每日热量目标: ${tdee} kcal
- 昨日实际摄入: ${yesterdayCal} kcal (${overAte ? `超标${yesterdayCal - tdee}kcal` : `剩余${tdee - yesterdayCal}kcal`})
- 每周计划健身: ${workoutFreq} 天
- 近7天已健身: ${workoutCount} 次
- 减脂目标: ${isLosing ? `每周减${profile?.weight_loss_speed}kg` : "维持体重"}
- 今天是星期${["日","一","二","三","四","五","六"][dayOfWeek]}
- 用户食材箱: ${pantryList.length > 0 ? pantryList.join("、") : "空（无特定食材偏好）"}
${feedbackHint}

请生成以JSON格式回复:
{
  "coach_advice": "一段温和的教练建议(50字以内)",
  "meal_plan": [
    {
      "meal": "早餐",
      "food": "食物描述",
      "calories": 数字,
      "uses_pantry": true或false,
      "macros": {
        "protein": 蛋白质克数,
        "carbs": 碳水化合物克数,
        "fat": 脂肪克数,
        "oil_tip": "用油建议，如：限5g橄榄油煎制",
        "salt_tip": "盐分建议，如：少盐，用柠檬汁提味"
      }
    },
    {"meal": "午餐", "food": "...", "calories": 数字, "uses_pantry": false, "macros": {"protein": 数字, "carbs": 数字, "fat": 数字, "oil_tip": "...", "salt_tip": "..."}},
    {"meal": "晚餐", "food": "...", "calories": 数字, "uses_pantry": false, "macros": {"protein": 数字, "carbs": 数字, "fat": 数字, "oil_tip": "...", "salt_tip": "..."}}
  ],
  "workout_plan": {
    "type": "训练日|有氧日|休息日",
    "focus": "训练重点描述,如:背部+二头",
    "exercises": [
      {"name": "动作名称", "sets": "4组x12次", "tip": "动作要点简述"}
    ]
  }
}

食谱规则:
- 每餐必须提供macros字段，包含protein、carbs、fat的具体克数(整数)
- 每餐必须提供oil_tip(具体用油量和种类)和salt_tip(盐分控制建议)
- 三餐总蛋白质应达到体重kg数×1.5~2g
- 总热量控制在${tdee}kcal左右
${pantryList.length > 0 ? `- 优先使用用户食材箱中的食材(${pantryList.join("、")})来组合菜品。如果某道菜使用了食材箱里的食材,将uses_pantry设为true。` : ""}

训练计划规则:
- 根据用户每周${workoutFreq}天健身频率,合理安排今天是训练日、有氧日还是休息日
- 重要：必须根据用户今日体力状态调整计划强度：
  ${energyLevel === "energetic" ? "- 用户体力充沛，安排高强度训练，推荐大重量复合动作，饮食增加高蛋白食物" : ""}
  ${energyLevel === "tired" ? "- 用户疲惫，严禁大重量！改为主动恢复（拉伸/瑜伽/冥想），食谱增加抗炎、易消化的食材（如燕麦、鱼类、蔬菜汤）" : ""}
  ${energyLevel === "normal" ? "- 用户状态正常，按常规强度安排训练" : ""}
- 训练日: 明确部位(胸/背/腿/肩/臂),列出4-6个具体动作,每个有组数次数
  - 减脂期优先安排大肌群(背/腿)
  - 昨天超标优先安排高强度训练
- 有氧日: 列出2-3个有氧项目,写明具体参数(时长/速度/坡度等)
- 休息日: 推荐主动恢复方案(泡沫轴/拉伸/冥想/瑜伽),列出3-4个恢复活动
- 每个动作的tip用一句话说明要点,包含呼吸技巧和发力感

只返回JSON,不要其他文字。`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "请求太频繁，请稍后再试" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度不足" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result: any = {
      coach_advice: "今天也要好好控制饮食哦！加油💪",
      meal_plan: [],
      workout_plan: {
        type: "休息日",
        focus: "主动恢复",
        exercises: [
          { name: "全身泡沫轴放松", sets: "10分钟", tip: "重点滚压大腿外侧和背部" },
          { name: "静态拉伸", sets: "10分钟", tip: "每个部位保持30秒" },
          { name: "正念冥想", sets: "5分钟", tip: "闭眼深呼吸，放空大脑" },
        ],
      },
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        result = { ...result, ...parsed };
      } catch {}
    }

    const newRefreshCount = feedback ? (existing?.refresh_count || 0) + 1 : (existing?.refresh_count || 0);

    const upsertData = {
      user_id,
      date,
      coach_advice: result.coach_advice,
      meal_plan: result.meal_plan,
      workout_plan: result.workout_plan,
      refresh_count: newRefreshCount,
    };

    const { error: upsertError } = await supabase
      .from("daily_recommendations")
      .upsert(upsertData, { onConflict: "user_id,date" });

    if (upsertError) {
      await supabase.from("daily_recommendations").insert(upsertData);
    }

    return new Response(JSON.stringify({ ...result, refresh_count: newRefreshCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
