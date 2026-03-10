import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Dumbbell, Timer, CheckCircle2, Circle, Sparkles, Wind, RefreshCw, Trash2, Plus, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface WorkoutExercise {
  name: string;
  sets?: string;
  tip?: string;
}

interface WorkoutPlanData {
  type: string;
  focus: string;
  exercises: WorkoutExercise[];
}

const bodyPartOptions = [
  { label: "练胸", emoji: "💪" },
  { label: "练背", emoji: "🏋️" },
  { label: "练腿", emoji: "🦵" },
  { label: "练肩/臂", emoji: "💪" },
  { label: "练核心", emoji: "🧘" },
];

const WorkoutPlanCard = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<WorkoutPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [expandedTip, setExpandedTip] = useState<number | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customSets, setCustomSets] = useState("");
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("daily_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .maybeSingle();

      if (data?.workout_plan) {
        const wp = data.workout_plan as unknown as WorkoutPlanData;
        if (wp.type && wp.exercises) {
          setPlan(wp);
          setRefreshCount(data.refresh_count || 0);
          setLoading(false);
          return;
        }
      }

      try {
        const { data: freshData } = await supabase.functions.invoke("daily-coach", {
          body: { user_id: user.id, date: todayStr },
        });
        if (freshData?.workout_plan) {
          setPlan(freshData.workout_plan);
          setRefreshCount(freshData.refresh_count || 0);
        }
      } catch {}
      setLoading(false);
    };
    fetchPlan();
  }, [user]);

  const savePlanToDb = async (updatedPlan: WorkoutPlanData) => {
    if (!user) return;
    await supabase
      .from("daily_recommendations")
      .update({ workout_plan: updatedPlan as unknown as Json })
      .eq("user_id", user.id)
      .eq("date", todayStr);
  };

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
      if (data?.workout_plan) {
        setPlan(data.workout_plan);
        setRefreshCount(data.refresh_count || refreshCount + 1);
        setChecked(new Set());
        toast.success("训练计划已更新！");
      }
    } catch (err: any) {
      toast.error(err.message || "刷新失败");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteExercise = async (idx: number) => {
    if (!plan) return;
    const updated = { ...plan, exercises: plan.exercises.filter((_, i) => i !== idx) };
    setPlan(updated);
    setChecked((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => { if (v < idx) next.add(v); else if (v > idx) next.add(v - 1); });
      return next;
    });
    await savePlanToDb(updated);
    toast.success("动作已移除");
  };

  const handleAddCustom = async () => {
    if (!plan || !customName.trim()) return;
    const newEx: WorkoutExercise = { name: customName.trim(), sets: customSets.trim() || undefined };
    const updated = { ...plan, exercises: [...plan.exercises, newEx] };
    setPlan(updated);
    setCustomName("");
    setCustomSets("");
    setAddingCustom(false);
    await savePlanToDb(updated);
    toast.success("自定义动作已添加");
  };

  const handleSwapSingle = async (idx: number) => {
    if (!user || !plan) return;
    setSwappingIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("daily-coach", {
        body: {
          user_id: user.id,
          date: todayStr,
          feedback: `请只替换第${idx + 1}个动作"${plan.exercises[idx].name}"，换一个同部位的不同动作，保持其他动作不变`,
          swap_single: true,
        },
      });
      if (error) throw error;
      if (data?.workout_plan?.exercises) {
        const newExercises = [...plan.exercises];
        const swapped = (data.workout_plan.exercises as WorkoutExercise[])[idx];
        if (swapped) {
          newExercises[idx] = swapped;
          const updated = { ...plan, exercises: newExercises };
          setPlan(updated);
          await savePlanToDb(updated);
          toast.success("动作已替换");
        }
      }
    } catch {
      toast.error("替换失败");
    } finally {
      setSwappingIdx(null);
      setExpandedTip(null);
    }
  };

  const toggleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="mx-6 mt-6 bg-card rounded-[32px] p-6 shadow-card-lg mindful-border">
        <div className="flex items-center gap-2 justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-foreground">AI 正在规划训练...</span>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const typeIcon = plan.type === "休息日" ? Wind : plan.type === "有氧日" ? Timer : Dumbbell;
  const TypeIcon = typeIcon;
  const progress = plan.exercises.length > 0 ? Math.round((checked.size / plan.exercises.length) * 100) : 0;

  return (
    <div className="mx-6 mt-6 bg-card rounded-[32px] p-5 shadow-card-lg mindful-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-mint">
            <TypeIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-foreground">今日训练</h3>
              <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">{plan.type}</span>
            </div>
            <p className="text-xs text-foreground/70 font-medium">{plan.focus}</p>
          </div>
        </div>
        {plan.exercises.length > 0 && (
          <div className="text-right">
            <span className="text-lg font-extrabold text-foreground tabular-nums">{progress}%</span>
            <p className="text-[10px] text-foreground/70 font-semibold">完成度</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {plan.exercises.length > 0 && (
        <div className="h-2 bg-muted rounded-full mb-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--mint-light, 160 60% 65%)))`,
            }}
          />
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-2">
        {plan.exercises.map((ex, i) => {
          const isDone = checked.has(i);
          return (
            <div key={i}>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleCheck(i)}
                  className={`flex-1 flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 ${
                    isDone ? "bg-primary/10" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-foreground/40 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDone ? "line-through text-foreground/40" : "text-foreground"}`}>
                      {ex.name}
                    </p>
                    {ex.sets && (
                      <p className={`text-[11px] font-medium ${isDone ? "text-foreground/30" : "text-foreground/60"}`}>
                        {ex.sets}
                      </p>
                    )}
                  </div>
                  {ex.tip && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === i ? null : i); }}
                      className="w-7 h-7 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 hover:bg-accent/30 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                    </button>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteExercise(i)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded tip panel */}
              {expandedTip === i && ex.tip && (
                <div className="ml-10 mr-3 mt-2 mb-1 px-4 py-3 bg-card border border-border rounded-2xl shadow-card text-sm text-foreground leading-relaxed">
                  <p className="mb-3">💡 {ex.tip}</p>
                  <button
                    onClick={() => handleSwapSingle(i)}
                    disabled={swappingIdx === i}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 px-3.5 py-2 rounded-xl transition-colors"
                  >
                    {swappingIdx === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                    换个同部位动作
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add custom exercise */}
      {addingCustom ? (
        <div className="mt-3 p-3 bg-muted rounded-2xl space-y-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="动作名称"
            autoFocus
            className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={customSets}
            onChange={(e) => setCustomSets(e.target.value)}
            placeholder="组数x次数 (如: 4x12)"
            className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
          />
          <div className="flex gap-2">
            <button onClick={() => setAddingCustom(false)} className="flex-1 text-xs text-foreground/60 font-medium py-1.5">取消</button>
            <button onClick={handleAddCustom} className="flex-1 text-xs font-bold text-primary py-1.5">添加</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingCustom(true)}
          className="mt-3 w-full flex items-center justify-center gap-1 py-2.5 rounded-2xl border border-dashed border-foreground/20 text-xs text-foreground/60 font-medium hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          自定义动作
        </button>
      )}

      {/* Completion banner */}
      {progress === 100 && plan.exercises.length > 0 && (
        <div className="mt-3 text-center py-2.5 bg-primary rounded-2xl">
          <span className="text-sm font-bold text-primary-foreground">🎉 今日训练已完成！</span>
        </div>
      )}

      {/* Refresh section */}
      <div className="mt-3 pt-3 border-t border-border">
        {showFeedback ? (
          <div className="space-y-2">
            <p className="text-xs text-foreground font-semibold">选择部位，AI 重新规划：</p>
            <div className="flex flex-wrap gap-2">
              {bodyPartOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleRefresh(opt.label)}
                  disabled={refreshing}
                  className="bg-muted hover:bg-primary/10 rounded-2xl py-2 px-3 text-center transition-colors disabled:opacity-50"
                >
                  <span className="text-sm">{opt.emoji}</span>
                  <p className="text-[10px] font-bold text-foreground mt-0.5">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground/70 font-semibold">换一换 {refreshCount}/3</span>
            <button
              onClick={() => setShowFeedback(true)}
              disabled={refreshing || refreshCount >= 3}
              className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              换一换
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutPlanCard;
