import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMealLogs } from "@/hooks/useMealLogs";
import { useDailyWeight } from "@/hooks/useDailyWeight";
import CalorieDashboard from "@/components/CalorieDashboard";
import BottomNav from "@/components/BottomNav";
import WeightInput from "@/components/WeightInput";
import ProfileWizard from "@/components/ProfileWizard";
import MorningCheckIn from "@/components/MorningCheckIn";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ruler, Scale, Activity, Target } from "lucide-react";

let energyCache: { date: string; level: string | null; checked: boolean } = {
  date: "",
  level: null,
  checked: false,
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, hasProfile, tdee, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { meals, totalConsumed } = useMealLogs();
  const { todayWeight, loading: weightLoading, editing, setEditing, saveWeight } = useDailyWeight();

  const [showWizard, setShowWizard] = useState(false);
  const [showMorningCheck, setShowMorningCheck] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [checkingEnergy, setCheckingEnergy] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
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

  // Compute macros from today's meals
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);

  const today = new Date();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      {/* Simple header */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] px-6 pt-10 pb-14 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <p className="text-white/80 text-[10px] font-bold tracking-widest uppercase relative z-10">{dateStr}</p>
        <h1 className="text-2xl font-black text-white leading-tight relative z-10 mt-1">Hi, {userName}</h1>
        <p className="text-white/70 text-xs font-semibold mt-1 relative z-10">
          {energyLevel === "energetic" ? "活力满满🔥 适合挑战高强度" : energyLevel === "tired" ? "今天注意休息😴" : "保持节奏，继续加油💪"}
        </p>
      </div>

      {/* Body profile card */}
      {profile && (
        <div className="mx-6 -mt-8 bg-card rounded-[28px] shadow-card-lg p-5 relative z-10 mb-5 border border-border">
          <p className="text-xs text-[#1E293B] font-bold tracking-widest uppercase mb-3 text-center">身体档案</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{profile.height || "--"}</span>
              <span className="text-[10px] text-[#1E293B] font-medium">cm</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-accent" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{profile.weight || "--"}</span>
              <span className="text-[10px] text-[#1E293B] font-medium">kg</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{bmi}</span>
              <span className="text-[10px] text-[#1E293B] font-medium">BMI</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
                <Target className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-base font-extrabold text-foreground">{activityLabels[profile.activity_level || ""] || "--"}</span>
              <span className="text-[10px] text-[#1E293B] font-medium">活动</span>
            </div>
          </div>
        </div>
      )}

      {/* Calorie dashboard */}
      <div className={profile ? "" : "-mt-8"}>
        <CalorieDashboard
          consumed={totalConsumed}
          target={tdee}
          onTargetChange={() => {}}
          macros={{ protein: Math.round(totalProtein), carbs: Math.round(totalCarbs), fat: Math.round(totalFat) }}
        />
      </div>

      {/* Weight input */}
      <WeightInput todayWeight={todayWeight} editing={editing} loading={weightLoading} onEdit={() => setEditing(true)} onSave={saveWeight} />

      <BottomNav />

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
