import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMealLogs } from "@/hooks/useMealLogs";
import { useDailyWeight } from "@/hooks/useDailyWeight";
import AppHeader from "@/components/AppHeader";
import CalorieDashboard from "@/components/CalorieDashboard";
import DailyMealPlan from "@/components/DailyMealPlan";
import BottomNav from "@/components/BottomNav";
import WeightInput from "@/components/WeightInput";
import AddMealDialog from "@/components/AddMealDialog";
import ProfileWizard from "@/components/ProfileWizard";
import WorkoutPlanCard from "@/components/WorkoutPlanCard";
import MorningCheckIn from "@/components/MorningCheckIn";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ruler, Scale, Activity, Target } from "lucide-react";
import { toast } from "sonner";

// Session-level cache to prevent re-querying on tab switches
let energyCache: { date: string; level: string | null; checked: boolean } = {
  date: "",
  level: null,
  checked: false,
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, hasProfile, tdee, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { totalConsumed, addMeal } = useMealLogs();
  const { todayWeight, loading: weightLoading, editing, setEditing, saveWeight } = useDailyWeight();

  const [showAddMeal, setShowAddMeal] = useState(false);
  const [prefillMeal, setPrefillMeal] = useState<{
    type?: string;
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  } | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showMorningCheck, setShowMorningCheck] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [checkingEnergy, setCheckingEnergy] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Check if morning check-in is needed — with session cache
  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    // If we already checked today in this session, use cached result
    if (energyCache.checked && energyCache.date === todayStr) {
      setEnergyLevel(energyCache.level);
      setShowMorningCheck(!energyCache.level);
      setCheckingEnergy(false);
      return;
    }

    supabase
      .from("daily_recommendations")
      .select("energy_level")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .maybeSingle()
      .then(({ data }) => {
        const level = data?.energy_level || null;
        energyCache = { date: todayStr, level, checked: true };
        setEnergyLevel(level);
        setShowMorningCheck(!level);
        setCheckingEnergy(false);
      });
  }, [user]);

  const handleEnergyComplete = (level: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    energyCache = { date: todayStr, level, checked: true };
    setEnergyLevel(level);
    setShowMorningCheck(false);
  };

  if (authLoading || profileLoading || !user || checkingEnergy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  const needsWizard = !hasProfile && !showWizard;
  const userName = user.email?.split("@")[0] || "用户";

  const bmi = profile?.weight && profile?.height
    ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1)
    : "--";

  const activityLabels: Record<string, string> = {
    sedentary: "久坐", light: "轻度", moderate: "中度", active: "高强度",
  };

  const handleAITextSubmit = async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;

    const dismiss = toast.loading("AI 正在解析...");
    try {
      const res = await fetch("/api/voice-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned }),
      });
      const data = await res.json();
      if (!data?.name || !data?.calories) {
        throw new Error(data?.error || "解析失败");
      }

      setPrefillMeal({
        type: "加餐",
        name: data.name,
        calories: Number(data.calories),
        protein: data.protein != null ? Number(data.protein) : undefined,
        carbs: data.carbs != null ? Number(data.carbs) : undefined,
        fat: data.fat != null ? Number(data.fat) : undefined,
      });
      setShowAddMeal(true);
      toast.success("已识别，确认后即可记录");
    } catch (e: any) {
      toast.error(e?.message || "AI 暂时没听懂，请换种说法");
    } finally {
      toast.dismiss(dismiss);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      <AppHeader name={userName} streak={0} onAITextSubmit={handleAITextSubmit} />

      {/* 按类型浏览 */}
      <div className="mt-6 mb-4 px-6 overflow-hidden">
        <h3 className="text-sm font-black text-foreground mb-4">按类型浏览</h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
          {[
            { n: "素食", e: "🥗" },
            { n: "蛋白质", e: "🍗" },
            { n: "低碳", e: "🥑" },
            { n: "零食", e: "🍿" },
            { n: "饮品", e: "🍹" },
          ].map((item) => (
            <div key={item.n} className="flex flex-col items-center gap-2 min-w-[70px]">
              <div className="w-16 h-16 bg-card rounded-[32px] shadow-card flex items-center justify-center text-3xl border border-border card-hover">
                {item.e}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{item.n}</span>
            </div>
          ))}
        </div>
      </div>

      {profile && (
        <div className="mx-6 -mt-10 bg-card rounded-[28px] shadow-card-lg p-5 relative z-10 mb-5 border border-border card-hover">
          <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mb-3 text-center">身体档案</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{profile.height || "--"}</span>
              <span className="text-[10px] text-muted-foreground font-medium">cm</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-accent" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{profile.weight || "--"}</span>
              <span className="text-[10px] text-muted-foreground font-medium">kg</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{bmi}</span>
              <span className="text-[10px] text-muted-foreground font-medium">BMI</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
                <Target className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{activityLabels[profile.activity_level || ""] || "--"}</span>
              <span className="text-[10px] text-muted-foreground font-medium">活动</span>
            </div>
          </div>
        </div>
      )}

      <div className={profile ? "" : "-mt-14"}>
        <CalorieDashboard consumed={totalConsumed} target={tdee} onTargetChange={() => {}} />
      </div>

      <WeightInput todayWeight={todayWeight} editing={editing} loading={weightLoading} onEdit={() => setEditing(true)} onSave={saveWeight} />

      <WorkoutPlanCard />
      <DailyMealPlan />

      <BottomNav onAdd={() => setShowAddMeal(true)} />

      {showAddMeal && (
        <AddMealDialog
          prefillMeal={prefillMeal ?? undefined}
          onClose={() => { setShowAddMeal(false); setPrefillMeal(null); }}
          onAdd={(meal) => { addMeal(meal); setShowAddMeal(false); setPrefillMeal(null); }}
        />
      )}
      {(needsWizard || showWizard) && (
        <ProfileWizard onComplete={() => { setShowWizard(false); refetchProfile(); }} />
      )}
      {showMorningCheck && (
        <MorningCheckIn onComplete={handleEnergyComplete} />
      )}
    </div>
  );
};

export default Index;
