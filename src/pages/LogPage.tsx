import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMealLogs } from "@/hooks/useMealLogs";
import BottomNav from "@/components/BottomNav";
import AddMealDialog from "@/components/AddMealDialog";
import DailyMealPlan from "@/components/DailyMealPlan";
import OilSlider from "@/components/OilSlider";
import type { Meal } from "@/components/MealLog";
import { Loader2, Pencil, ChefHat, Trash2, Flame, Camera, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const mealTypeEmoji: Record<string, string> = {
  "早餐": "🌅", "午餐": "☀️", "晚餐": "晚餐", "加餐": "🍪",
};

const LogPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { meals, totalConsumed, addMeal, updateMeal, adjustOil, refetch } = useMealLogs();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showOilSlider, setShowOilSlider] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#10B981]" /></div>;
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meal_logs").delete().eq("id", id);
    if (error) { toast.error("删除失败"); return; }
    toast.success("已删除");
    refetch();
  };

  const handleEdit = (id: string) => {
    const meal = meals.find((m) => m.id === id);
    if (meal) { setEditingMeal(meal); setShowAddMeal(true); }
  };

  const handlePhotoRecognize = async (file: File) => {
    setRecognizing(true);
    const loadingId = toast.loading("AI 正在识别...");
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 600;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.4).split(",")[1]);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      await addMeal({
        type: "加餐",
        name: data.name || "新记录",
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
      });
      toast.success("记录成功");
      refetch();
    } catch (err) {
      toast.error("识别超时，请手动输入");
    } finally {
      setRecognizing(false);
      toast.dismiss(loadingId);
    }
  };

  const grouped = ["早餐", "午餐", "晚餐", "加餐"].map((type) => ({
    type,
    meals: meals.filter((m) => m.type === type),
  })).filter((g) => g.meals.length > 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto relative pb-40 overflow-y-auto">
      <div className="px-6 pt-12 pb-6">
        <h2 className="text-[28px] font-black text-[#1E293B] leading-none">{totalConsumed} <span className="text-sm font-bold text-slate-400">kcal</span></h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">今日总摄入日志</p>
      </div>
      <div className="mx-6 mb-8">
        <DailyMealPlan onQuickAdd={(m) => { addMeal(m); toast.success("已记录"); }} />
      </div>
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => fileRef.current?.click()} className="h-32 rounded-[32px] bg-white shadow-xl flex flex-col items-center justify-center gap-2 border border-slate-50">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center"><Camera className="text-[#10B981]" /></div>
            <span className="text-sm font-bold text-[#1E293B]">拍照识别</span>
          </button>
          <button onClick={() => setShowAddMeal(true)} className="h-32 rounded-[32px] bg-white shadow-xl flex flex-col items-center justify-center gap-2 border border-slate-50">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center"><Mic className="text-[#3B82F6]" /></div>
            <span className="text-sm font-bold text-[#1E293B]">手动录入</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoRecognize(e.target.files[0])} />
      </div>
      <div className="px-6 space-y-6">
        {grouped.map((group) => (
          <div key={group.type} className="space-y-3">
            <h4 className="text-xs font-black text-[#1E293B] uppercase">{group.type}</h4>
            {group.meals.map((meal) => (
              <div key={meal.id} className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-[#1E293B]">{meal.name}</p>
                  <p className="text-[10px] font-bold text-emerald-500">P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-[#10B981]">{meal.calories} kcal</p>
                  <button onClick={() => handleDelete(meal.id)}><Trash2 className="w-3.5 h-3.5 text-red-200" /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <BottomNav onAdd={() => setShowAddMeal(true)} />
      {showAddMeal && <AddMealDialog onClose={() => {setShowAddMeal(false); setEditingMeal(null);}} onAdd={(m) => { addMeal(m); setShowAddMeal(false); }} editMeal={editingMeal} />}
    </div>
  );
};

export default LogPage;
