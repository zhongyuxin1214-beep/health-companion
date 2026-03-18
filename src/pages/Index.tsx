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
import { Loader2, Ruler, Scale, Activity, Target, Search, Sparkles, Bell } from "lucide-react";
import AddMealDialog from "@/components/AddMealDialog";

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
  const [showAddMeal, setShowAddMeal] = useState(false);

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
        <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
      </div>
    );
  }

  const needsWizard = !hasProfile && !showWizard;
  const userName = user.email?.split("@")[0] || "伙伴";
  const bmi = profile?.weight && profile?.height
    ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1)
    : "--";

  const activityLabels: Record<string, string> = {
    sedentary: "久坐", light: "轻度", moderate: "中度", active: "高强度",
  };

  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);

  const todayStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto relative pb-32">
      {/* 视觉对齐图2：全新的 Header 布局 */}
      <div className="bg-gradient-to-br from-[#10B981] to-[#3B82F6] px-6 pt-12 pb-16 relative overflow-hidden rounded-b-[40px] shadow-lg">
        {/* 背景简约图片装饰 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        
        <div className="flex items-center justify-between relative z-10 mb-8">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white/20 backdrop-blur-md">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="avatar" />
             </div>
             <div>
                <h1 className="text-xl font-black text-white">Hi, {userName}</h1>
                <p className="text-white/80 text-[10px] font-bold tracking-widest uppercase">{todayStr}</p>
             </div>
          </div>
          <button className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
            <Bell className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 mb-6">
          <h2 className="text-[26px] font-bold text-white leading-tight">
            今天想吃点什么，<br />
            我的健身伙伴？
          </h2>
        </div>

        {/* 自动交互搜索入口 */}
        <div 
          onClick={() => setShowAddMeal(true)}
          className="relative group cursor-pointer shadow-2xl rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
          </div>
          <div className="w-full py-5 pl-14 pr-14 bg-white border-none rounded-3xl text-sm font-bold text-slate-400">
            比如：我吃了一个牛肉汉堡和一杯拿铁
          </div>
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-all">
              <Sparkles className="w-5 h-5 text-white" fill="white" />
            </div>
          </div>
        </div>
      </div>

      {/* 身体档案卡 - 增强对比度 */}
      <div className="mx-6 -mt-8 bg-white rounded-[32px] shadow-[0_15px_40px_rgba(0,0,0,0.05)] p-6 relative z-20 mb-8 border border-slate-50">
        <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mb-4 text-center">身体实时档案</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "身高", val: profile?.height, unit: "cm", icon: Ruler, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "体重", val: profile?.weight, unit: "kg", icon: Scale, color: "text-orange-500", bg: "bg-orange-50" },
            { label: "BMI", val: bmi, unit: "", icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "运动", val: activityLabels[profile?.activity_level || ""] || "--", unit: "", icon: Target, color: "text-purple-500", bg: "bg-purple-50" }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center mb-1`}>
                <item.icon className={`w-5 h-5 ${item.color}`} strokeWidth={2} />
              </div>
              <span className="text-sm font-black text-slate-800">{item.val || "--"}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 热量汇总看板 - 移除了菜谱，专注状态展示 */}
      <div className="px-2">
        <CalorieDashboard
          consumed={totalConsumed}
          target={tdee}
          onTargetChange={() => {}}
          macros={{ protein: Math.round(totalProtein), carbs: Math.round(totalCarbs), fat: Math.round(totalFat) }}
        />
      </div>

      {/* 体重录入 - 允许随时修改 */}
      <div className="px-6 mt-4">
        <WeightInput 
          todayWeight={todayWeight} 
          editing={editing} 
          loading={weightLoading} 
          onEdit={() => setEditing(true)} 
          onSave={saveWeight} 
        />
      </div>

      <BottomNav />

      {/* 弹窗逻辑 */}
      {(needsWizard || showWizard) && (
        <ProfileWizard onComplete={() => { setShowWizard(false); refetchProfile(); }} />
      )}
      {showMorningCheck && (
        <MorningCheckIn onComplete={handleEnergyComplete} />
      )}
      {showAddMeal && (
        <AddMealDialog 
          onClose={() => setShowAddMeal(false)} 
          onAdd={() => { setShowAddMeal(false); window.location.reload(); }} 
        />
      )}
    </div>
  );
};

export default Index;
