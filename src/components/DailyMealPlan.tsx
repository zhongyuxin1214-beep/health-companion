import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, calculateTDEE } from "@/hooks/useProfile";
import { Loader2, Sparkles, UtensilsCrossed, RefreshCw, Package, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import PantryManager from "./PantryManager";

interface MealMacros {
  protein?: number;
  carbs?: number;
  fat?: number;
  oil_tip?: string;
  salt_tip?: string;
}

interface MealItem {
  meal: string;
  food: string;
  calories: number;
  uses_pantry?: boolean;
  macros?: MealMacros;
}

const feedbackOptions = [
  { label: "想吃别的", emoji: "🍜" },
  { label: "太贵了", emoji: "💰" },
  { label: "没时间做", emoji: "⏰" },
];

interface DailyMealPlanProps {
  onQuickAdd?: (meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const DailyMealPlan = ({ onQuickAdd }: DailyMealPlanProps) => {
  const { user } = useAuth();
  const { profile, tdee } = useProfile();
  const [plan, setPlan] = useState<MealItem[]>([]);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);

  const date = todayStr();

  // Fetch from DB or generate via Vercel API
  useEffect(() => {
    const load = async () => {
      if (!user) return;

      // 1. Try reading from daily_recommendations
      const { data: existing } = await supabase
        .from("daily_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();

      if (existing?.meal_plan && Array.isArray(existing.meal_plan) && (existing.meal_plan as unknown[]).length > 0) {
        setPlan(existing.meal_plan as unknown as MealItem[]);
        setAdvice(existing.coach_advice || "");
        setRefreshCount(existing.refresh_count || 0);
        setLoading(false);
        return;
      }

      // 2. Generate via /api/generate-plan
      await generatePlan();
    };
    load();
  }, [user]);

  const generatePlan = async (feedback?: string) => {
    if (!user) return;
    try {
      // Fetch pantry items
      const { data: pantryData } = await supabase
        .from("user_pantry")
        .select("ingredient_name")
        .eq("user_id", user.id);
      const pantryStr = pantryData?.map((p) => p.ingredient_name).join("、") || "";

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: profile?.height,
          weight: profile?.weight,
          target_calories: tdee,
          pantry: pantryStr,
          feedback,
        }),
      });
      const data = await res.json();

      if (data.error) {
        console.error("generate-plan error:", data.error);
        setAdvice("今天也要好好吃饭，均衡营养哦！");
        setLoading(false);
        return;
      }

      const meals: MealItem[] = data.meal_plan || [];
      const coachAdvice: string = data.coach_advice || "";

      setPlan(meals);
      setAdvice(coachAdvice);

      // Persist to daily_recommendations
      const newCount = feedback ? refreshCount + 1 : 0;
      const { data: existingRow } = await supabase
        .from("daily_recommendations")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();

      if (existingRow) {
        await supabase
          .from("daily_recommendations")
          .update({
            meal_plan: meals as unknown as Json[],
            coach_advice: coachAdvice,
            refresh_count: newCount,
          })
          .eq("id", existingRow.id);
      } else {
        await supabase.from("daily_recommendations").insert({
          user_id: user.id,
          date,
          meal_plan: meals as unknown as Json[],
          coach_advice: coachAdvice,
          refresh_count: 0,
        });
      }
      setRefreshCount(newCount);
    } catch (err) {
      console.error("Failed to generate recommendation:", err);
      setAdvice("今天也要好好吃饭，均衡营养哦！");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async (feedback: string) => {
    if (!user || refreshCount >= 3) {
      toast.error("今日换一换次数已用完（最多3次）");
      return;
    }
    setShowFeedback(false);
    setRefreshing(true);
    await generatePlan(feedback);
    toast.success("食谱已更新！");
  };

  const mealEmoji: Record<string, string> = { "早餐": "🌅", "午餐": "☀️", "晚餐": "🌙" };

  if (loading || (refreshing && plan.length === 0)) {
    return (
      <div className="bg-blue-50/60 rounded-[32px] p-6 shadow-sm border border-blue-100">
        <div className="flex items-center gap-2 justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-[#1E293B]/70">AI 正在生成今日食谱...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {advice && (
        <div className="bg-blue-50/60 rounded-[32px] p-5 shadow-sm border border-blue-100 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-sm text-[#1E293B]">AI 教练建议</span>
          </div>
          <p className="text-sm text-[#1E293B]/75 leading-relaxed">{advice}</p>
        </div>
      )}

      {plan.length > 0 && (
        <div className="bg-blue-50/60 rounded-[32px] p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-[#1E293B]">今日推荐三餐</h3>
          </div>

          <PantryManager />

          <div className="space-y-2.5">
            {plan.map((item, i) => (
              <MealCard
                key={i}
                item={item}
                index={i}
                expanded={expandedMeal === i}
                onToggle={() => setExpandedMeal(expandedMeal === i ? null : i)}
                onQuickAdd={onQuickAdd}
                mealEmoji={mealEmoji}
              />
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-blue-200/60 flex justify-between text-xs text-[#1E293B]/60">
            <span>推荐总热量</span>
            <span className="font-bold text-primary">{plan.reduce((s, m) => s + m.calories, 0)} kcal</span>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-200/60">
            {showFeedback ? (
              <div className="space-y-2">
                <p className="text-xs text-[#1E293B]/60 font-medium">选择原因，AI 会重新推荐：</p>
                <div className="flex gap-2">
                  {feedbackOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleRefresh(opt.label)}
                      disabled={refreshing}
                      className="flex-1 bg-white hover:bg-blue-50 rounded-xl py-2 px-2 text-center transition-colors disabled:opacity-50 border border-blue-100"
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <p className="text-[10px] font-semibold text-[#1E293B] mt-0.5">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#1E293B]/50">换一换 {refreshCount}/3</span>
                <button
                  onClick={() => setShowFeedback(true)}
                  disabled={refreshing || refreshCount >= 3}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  换一换
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ── */

const MealCard = ({
  item, index, expanded, onToggle, onQuickAdd, mealEmoji,
}: {
  item: MealItem; index: number; expanded: boolean;
  onToggle: () => void;
  onQuickAdd?: DailyMealPlanProps["onQuickAdd"];
  mealEmoji: Record<string, string>;
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 bg-white rounded-2xl px-3.5 py-3 text-left transition-all hover:bg-blue-50 border border-blue-100"
    >
      <span className="text-xl">{mealEmoji[item.meal] || "🍽️"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs text-[#1E293B]/60 font-semibold">{item.meal}</p>
          {item.uses_pantry && (
            <span className="text-[9px] bg-primary/15 text-primary px-1 py-0.5 rounded font-bold flex items-center gap-0.5">
              <Package className="w-2.5 h-2.5" />现有食材
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-[#1E293B]">{item.food}</p>
      </div>
      <span className="text-sm font-extrabold text-primary tabular-nums">
        {item.calories}<span className="text-xs font-medium text-[#1E293B]/60 ml-0.5">kcal</span>
      </span>
      {onQuickAdd && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd({
              type: item.meal,
              name: item.food,
              calories: item.calories,
              protein: item.macros?.protein ?? 0,
              carbs: item.macros?.carbs ?? 0,
              fat: item.macros?.fat ?? 0,
            });
          }}
          className="text-[10px] font-bold text-white bg-primary px-2.5 py-1.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all flex-shrink-0"
        >
          一键记录
        </button>
      )}
      {item.macros ? (
        expanded ? <ChevronUp className="w-4 h-4 text-[#1E293B]/40 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#1E293B]/40 flex-shrink-0" />
      ) : null}
    </button>
    {expanded && item.macros && (
      <div className="mx-2 mt-1 mb-1 px-3 py-2.5 bg-blue-50/80 rounded-xl space-y-2 border border-blue-100">
        <div className="flex gap-3">
          <MacroPill label="蛋白质" value={item.macros.protein} unit="g" color="text-primary" />
          <MacroPill label="碳水" value={item.macros.carbs} unit="g" color="text-amber-600" />
          <MacroPill label="脂肪" value={item.macros.fat} unit="g" color="text-rose-500" />
        </div>
        {(item.macros.oil_tip || item.macros.salt_tip) && (
          <div className="text-[11px] text-[#1E293B]/70 leading-relaxed space-y-0.5">
            {item.macros.oil_tip && <p>🫒 {item.macros.oil_tip}</p>}
            {item.macros.salt_tip && <p>🧂 {item.macros.salt_tip}</p>}
          </div>
        )}
      </div>
    )}
  </div>
);

const MacroPill = ({ label, value, unit, color }: { label: string; value?: number; unit: string; color: string }) => {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex-1 text-center bg-white rounded-lg py-1.5 px-1 border border-blue-100">
      <p className={`text-sm font-extrabold ${color} tabular-nums`}>{value}<span className="text-[10px] font-medium">{unit}</span></p>
      <p className="text-[10px] text-[#1E293B]/60">{label}</p>
    </div>
  );
};

export default DailyMealPlan;
