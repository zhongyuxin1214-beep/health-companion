import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const DailyMealPlan = ({ onQuickAdd }: DailyMealPlanProps) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<MealItem[]>([]);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("daily_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .maybeSingle();

      if (data?.meal_plan && Array.isArray(data.meal_plan) && (data.meal_plan as unknown[]).length > 0) {
        setPlan(data.meal_plan as unknown as MealItem[]);
        setAdvice(data.coach_advice || "");
        setRefreshCount(data.refresh_count || 0);
        setLoading(false);
        return;
      }

      try {
        const { data: freshData, error } = await supabase.functions.invoke("daily-coach", {
          body: { user_id: user.id, date: todayStr },
        });
        if (error) throw error;
        if (freshData?.meal_plan) setPlan(freshData.meal_plan);
        if (freshData?.coach_advice) setAdvice(freshData.coach_advice);
        setRefreshCount(freshData?.refresh_count || 0);
      } catch (err) {
        console.error("Failed to generate recommendation:", err);
        setAdvice("今天也要好好吃饭，均衡营养哦！");
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendation();
  }, [user]);

  const handleRefresh = async (feedback: string) => {
    if (!user || refreshCount >= 3) {
      toast.error("今日换一换次数已用完（最多3次）");
      return;
    }
    setShowFeedback(false);
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-coach", {
        body: { user_id: user.id, date: todayStr, feedback },
      });
      if (error) throw error;
      if (data?.meal_plan) setPlan(data.meal_plan);
      if (data?.coach_advice) setAdvice(data.coach_advice);
      setRefreshCount(data?.refresh_count || refreshCount + 1);
      toast.success("食谱已更新！");
    } catch (err: any) {
      toast.error(err.message || "刷新失败");
    } finally {
      setRefreshing(false);
    }
  };

  const mealEmoji: Record<string, string> = { "早餐": "🌅", "午餐": "☀️", "晚餐": "🌙" };

  if (loading || (refreshing && plan.length === 0)) {
    return (
      <div className="mx-6 mt-6 bg-card rounded-[32px] p-6 shadow-mindful mindful-border">
        <div className="flex items-center gap-2 justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-secondary" />
          <span className="text-sm text-foreground/70">AI 正在生成今日食谱...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4">
      {advice && (
        <div className="bg-muted rounded-[24px] p-5 shadow-sm mindful-border mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="font-bold text-sm text-secondary-foreground">AI 教练建议</span>
          </div>
          <p className="text-sm text-foreground/75 leading-relaxed">{advice}</p>
        </div>
      )}

      {plan.length > 0 && (
        <div className="bg-card rounded-[24px] p-5 shadow-mindful mindful-border">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="w-4 h-4 text-secondary" />
            <h3 className="font-bold text-sm text-foreground">今日推荐三餐</h3>
          </div>

          <PantryManager />

          <div className="space-y-2.5">
            {plan.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setExpandedMeal(expandedMeal === i ? null : i)}
                  className="w-full flex items-center gap-3 bg-muted rounded-xl px-3.5 py-3 text-left transition-all hover:bg-border"
                >
                  <span className="text-xl">{mealEmoji[item.meal] || "🍽️"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground font-semibold">{item.meal}</p>
                      {item.uses_pantry && (
                        <span className="text-[9px] bg-secondary/15 text-secondary px-1 py-0.5 rounded font-bold flex items-center gap-0.5">
                          <Package className="w-2.5 h-2.5" />现有食材
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.food}</p>
                  </div>
                  <span className="text-sm font-extrabold text-primary tabular-nums">
                    {item.calories}<span className="text-xs font-medium text-muted-foreground ml-0.5">kcal</span>
                  </span>
                  {item.macros ? (
                    expandedMeal === i ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : null}
                </button>
                {/* Expanded macros */}
                {expandedMeal === i && item.macros && (
                  <div className="mx-2 mt-1 mb-1 px-3 py-2.5 bg-accent/10 rounded-lg space-y-2">
                    <div className="flex gap-3">
                      <MacroPill label="蛋白质" value={item.macros.protein} unit="g" color="text-primary" />
                      <MacroPill label="碳水" value={item.macros.carbs} unit="g" color="text-secondary" />
                      <MacroPill label="脂肪" value={item.macros.fat} unit="g" color="text-accent" />
                    </div>
                    {(item.macros.oil_tip || item.macros.salt_tip) && (
                      <div className="text-[11px] text-muted-foreground leading-relaxed space-y-0.5">
                        {item.macros.oil_tip && <p>🫒 {item.macros.oil_tip}</p>}
                        {item.macros.salt_tip && <p>🧂 {item.macros.salt_tip}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
            <span>推荐总热量</span>
            <span className="font-bold text-secondary">{plan.reduce((s, m) => s + m.calories, 0)} kcal</span>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            {showFeedback ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">选择原因，AI 会重新推荐：</p>
                <div className="flex gap-2">
                  {feedbackOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleRefresh(opt.label)}
                      disabled={refreshing}
                      className="flex-1 bg-muted hover:bg-border rounded-xl py-2 px-2 text-center transition-colors disabled:opacity-50"
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <p className="text-[10px] font-semibold text-foreground mt-0.5">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">换一换 {refreshCount}/3</span>
                <button
                  onClick={() => setShowFeedback(true)}
                  disabled={refreshing || refreshCount >= 3}
                  className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-secondary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

const MacroPill = ({ label, value, unit, color }: { label: string; value?: number; unit: string; color: string }) => {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex-1 text-center bg-muted rounded-lg py-1.5 px-1">
      <p className={`text-sm font-extrabold ${color} tabular-nums`}>{value}<span className="text-[10px] font-medium">{unit}</span></p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

export default DailyMealPlan;
