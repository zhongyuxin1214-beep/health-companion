import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMealLogs } from "@/hooks/useMealLogs";
import BottomNav from "@/components/BottomNav";
import AddMealDialog from "@/components/AddMealDialog";
import DailyMealPlan from "@/components/DailyMealPlan";
import OilSlider from "@/components/OilSlider";
import type { Meal } from "@/components/MealLog";
import { Loader2, Pencil, ChefHat, Trash2, Flame, Camera, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const mealTypeEmoji: Record<string, string> = {
  "早餐": "🌅", "午餐": "☀️", "晚餐": "🌙", "加餐": "🍪",
};

const LogPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { meals, totalConsumed, addMeal, updateMeal, adjustOil, refetch } = useMealLogs();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showOilSlider, setShowOilSlider] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
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

  const handleAddMeal = (meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => {
    if (editingMeal) {
      updateMeal(editingMeal.id, meal);
      setEditingMeal(null);
    } else {
      addMeal(meal);
    }
  };

  // Photo recognition - directly add to meal_logs
  const handlePhotoRecognize = async (file: File) => {
    setRecognizing(true);
    const loadingId = toast.loading("AI 正在识别食物...");
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
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
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Auto-add to meal_logs
      await addMeal({
        type: "加餐",
        name: data.name || "未知食物",
        calories: Number(data.calories) || 0,
        protein: data.protein != null ? Number(data.protein) : undefined,
        carbs: data.carbs != null ? Number(data.carbs) : undefined,
        fat: data.fat != null ? Number(data.fat) : undefined,
      });
      toast.success(`已识别并记录：${data.name}`);
    } catch (err: any) {
      toast.error(err.message || "识别失败");
    } finally {
      setRecognizing(false);
      toast.dismiss(loadingId);
    }
  };

  // Voice recognition
  const handleVoiceToggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("浏览器不支持语音识别");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setListening(false);
      const loadingId = toast.loading(`AI 正在解析："${text}"`);
      try {
        const res = await fetch("/api/voice-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (!data?.name || !data?.calories) throw new Error(data?.error || "解析失败");

        await addMeal({
          type: "加餐",
          name: data.name,
          calories: Number(data.calories),
          protein: data.protein != null ? Number(data.protein) : undefined,
          carbs: data.carbs != null ? Number(data.carbs) : undefined,
          fat: data.fat != null ? Number(data.fat) : undefined,
        });
        toast.success(`已识别并记录：${data.name}`);
      } catch (e: any) {
        toast.error(e?.message || "AI 解析失败");
      } finally {
        toast.dismiss(loadingId);
      }
    };

    recognition.onerror = () => { setListening(false); toast.error("语音识别出错"); };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
    toast.info("请说出你吃了什么...");
  };

  const mealOrder = ["早餐", "午餐", "晚餐", "加餐"];
  const grouped = mealOrder.map((type) => ({
    type,
    meals: meals.filter((m) => m.type === type),
  })).filter((g) => g.meals.length > 0);

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <p className="text-sm text-[#1E293B] font-bold">饮食日志</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-5xl font-extrabold text-foreground tabular-nums">{totalConsumed}</span>
          <span className="text-lg text-[#1E293B] font-medium mb-1.5">kcal</span>
          <Flame className="w-6 h-6 text-accent mb-2 ml-1" />
        </div>
      </div>

      {/* AI Recommended Meals */}
      <DailyMealPlan onQuickAdd={addMeal} />

      {/* Big Photo/Voice recognition area */}
      <div className="mx-4 mt-4">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => e.target.files?.[0] && handlePhotoRecognize(e.target.files[0])} />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={recognizing}
            className="flex flex-col items-center justify-center gap-3 py-8 rounded-[28px] bg-primary/10 border-2 border-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {recognizing ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <Camera className="w-10 h-10 text-primary" strokeWidth={1.5} />
            )}
            <span className="text-sm font-extrabold text-[#1E293B]">📷 拍照识别</span>
            <span className="text-[10px] text-[#1E293B]/70 font-medium">拍一张，AI 自动记录</span>
          </button>
          <button
            onClick={handleVoiceToggle}
            className={`flex flex-col items-center justify-center gap-3 py-8 rounded-[28px] border-2 active:scale-95 transition-all ${
              listening ? "bg-accent/20 border-accent/40" : "bg-accent/10 border-accent/20"
            }`}
          >
            {listening ? (
              <MicOff className="w-10 h-10 text-accent animate-pulse" strokeWidth={1.5} />
            ) : (
              <Mic className="w-10 h-10 text-accent" strokeWidth={1.5} />
            )}
            <span className="text-sm font-extrabold text-[#1E293B]">🎙️ 语音识别</span>
            <span className="text-[10px] text-[#1E293B]/70 font-medium">{listening ? "正在听..." : "说出你吃了什么"}</span>
          </button>
        </div>
      </div>

      {/* Today's meal list */}
      <div className="mx-4 mt-5 space-y-4">
        <h3 className="text-sm font-extrabold text-[#1E293B]">今日摄入明细</h3>
        {grouped.length === 0 ? (
          <div className="bg-card rounded-[28px] p-10 text-center shadow-card border border-border">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="font-bold text-foreground mb-1">还没有记录</p>
            <p className="text-sm text-[#1E293B]/70">用上方拍照或语音开始记录</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.type}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{mealTypeEmoji[group.type] || "🍽️"}</span>
                <span className="text-sm font-bold text-[#1E293B]">{group.type}</span>
                <span className="text-xs text-[#1E293B]/70 font-semibold">
                  {group.meals.reduce((s, m) => s + Math.round(m.calories * (m.oilMultiplier || 1)), 0)} kcal
                </span>
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-border ml-2.5">
                {group.meals.map((meal) => (
                  <div key={meal.id} className="bg-card rounded-[24px] px-4 py-3.5 shadow-card ml-4 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1E293B]">{meal.name}</p>
                        {meal.oilMultiplier && meal.oilMultiplier > 1 && (
                          <span className="text-[10px] gradient-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                            油度 {meal.oilMultiplier}x
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-sm tabular-nums text-primary">
                        {Math.round(meal.calories * (meal.oilMultiplier || 1))}
                        <span className="text-xs font-medium text-[#1E293B]/60 ml-0.5">kcal</span>
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(meal.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
                          <Pencil className="w-3 h-3 text-[#1E293B]/60" />
                        </button>
                        <button onClick={() => setShowOilSlider(meal.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
                          <ChefHat className="w-3 h-3 text-[#1E293B]/60" />
                        </button>
                        <button onClick={() => handleDelete(meal.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors">
                          <Trash2 className="w-3 h-3 text-[#1E293B]/60" />
                        </button>
                      </div>
                    </div>
                    {/* P/C/F display */}
                    {(meal.protein || meal.carbs || meal.fat) && (
                      <div className="flex gap-3 mt-2">
                        {meal.protein != null && <span className="text-[11px] text-primary font-bold">P {meal.protein}g</span>}
                        {meal.carbs != null && <span className="text-[11px] text-secondary font-bold">C {meal.carbs}g</span>}
                        {meal.fat != null && <span className="text-[11px] text-accent font-bold">F {meal.fat}g</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual add button */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => { setEditingMeal(null); setShowAddMeal(true); }}
          className="w-full py-3.5 rounded-[24px] border-2 border-dashed border-primary/30 text-sm font-bold text-primary hover:bg-primary/5 transition-colors active:scale-95"
        >
          + 手动添加饮食记录
        </button>
      </div>

      <BottomNav />

      {showOilSlider && (
        <OilSlider
          mealId={showOilSlider}
          onAdjust={(id, mult) => { adjustOil(id, mult); setShowOilSlider(null); }}
          onClose={() => setShowOilSlider(null)}
        />
      )}
      {showAddMeal && (
        <AddMealDialog
          onClose={() => { setShowAddMeal(false); setEditingMeal(null); }}
          onAdd={(meal) => { handleAddMeal(meal); setShowAddMeal(false); }}
          editMeal={editingMeal}
        />
      )}
    </div>
  );
};

export default LogPage;
