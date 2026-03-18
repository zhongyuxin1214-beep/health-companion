import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMealLogs } from "@/hooks/useMealLogs";
import BottomNav from "@/components/BottomNav";
import AddMealDialog from "@/components/AddMealDialog";
import DailyMealPlan from "@/components/DailyMealPlan";
import { Loader2, Camera, Mic, MicOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LogPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { meals, totalConsumed, addMeal, refetch } = useMealLogs();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizeStatus, setRecognizeStatus] = useState("");
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Photo Recognition ── */
  const handlePhotoRecognize = async (file: File) => {
    setRecognizing(true);
    setRecognizeStatus("正在压缩图片...");
    try {
      const base64 = await compressImage(file);
      setRecognizeStatus("AI 正在解析食物...");
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRecognizeStatus("正在计算营养成分...");
      await addMeal({
        type: guessType(),
        name: data.name || "未知食物",
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
      });
      toast.success(`已记录：${data.name}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "识别失败，请手动输入");
    } finally {
      setRecognizing(false);
      setRecognizeStatus("");
    }
  };

  /* ── Voice Recognition ── */
  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("浏览器不支持语音识别，请使用 Chrome");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
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
      toast.loading("正在解析...");
      try {
        const res = await fetch("/api/voice-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        toast.dismiss();
        if (data.error) throw new Error(data.error);
        await addMeal({
          type: guessType(),
          name: data.name || text,
          calories: Number(data.calories) || 0,
          protein: Number(data.protein) || 0,
          carbs: Number(data.carbs) || 0,
          fat: Number(data.fat) || 0,
        });
        toast.success(`已记录：${data.name || text}`);
        refetch();
      } catch (err: any) {
        toast.dismiss();
        toast.error(err.message || "解析失败");
      }
    };
    recognition.onerror = () => { setListening(false); toast.error("语音识别出错"); };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meal_logs").delete().eq("id", id);
    if (error) { toast.error("删除失败"); return; }
    toast.success("已删除");
    refetch();
  };

  const grouped = ["早餐", "午餐", "晚餐", "加餐"]
    .map((type) => ({ type, meals: meals.filter((m) => m.type === type) }))
    .filter((g) => g.meals.length > 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto relative pb-40 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <h2 className="text-[28px] font-black text-[#1E293B] leading-none">
          {totalConsumed} <span className="text-sm font-bold text-[#1E293B]/40">kcal</span>
        </h2>
        <p className="text-[10px] text-[#1E293B]/50 font-bold uppercase tracking-widest mt-2">今日总摄入</p>
      </div>

      {/* AI Meal Plan */}
      <div className="px-4 mb-5">
        <DailyMealPlan onQuickAdd={(m) => { addMeal(m); }} />
      </div>

      {/* Core Input Area */}
      <div className="px-4 mb-6">
        <div className="bg-emerald-50/70 rounded-[32px] p-5 border border-emerald-200/60">
          <p className="text-xs font-bold text-[#1E293B] mb-3">📝 快速录入</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={recognizing}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-[24px] bg-white shadow-sm border border-emerald-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {recognizing ? (
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              ) : (
                <Camera className="w-7 h-7 text-primary" strokeWidth={1.8} />
              )}
              <span className="text-[11px] font-bold text-[#1E293B]">
                {recognizing ? "识别中" : "拍照识别"}
              </span>
            </button>
            <button
              onClick={handleVoice}
              className={`flex flex-col items-center justify-center gap-2 py-5 rounded-[24px] bg-white shadow-sm border active:scale-95 transition-all ${
                listening ? "border-red-300 bg-red-50" : "border-emerald-100"
              }`}
            >
              {listening ? (
                <MicOff className="w-7 h-7 text-red-500" strokeWidth={1.8} />
              ) : (
                <Mic className="w-7 h-7 text-blue-500" strokeWidth={1.8} />
              )}
              <span className="text-[11px] font-bold text-[#1E293B]">
                {listening ? "停止" : "语音补录"}
              </span>
            </button>
            <button
              onClick={() => setShowAddMeal(true)}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-[24px] bg-white shadow-sm border border-emerald-100 active:scale-95 transition-all"
            >
              <span className="text-2xl">✏️</span>
              <span className="text-[11px] font-bold text-[#1E293B]">手动录入</span>
            </button>
          </div>
          {recognizing && recognizeStatus && (
            <p className="text-xs text-primary font-medium text-center mt-3 animate-pulse">{recognizeStatus}</p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handlePhotoRecognize(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* Today's Meal Log */}
      <div className="px-4 space-y-4">
        <p className="text-xs font-bold text-[#1E293B] uppercase tracking-wider px-1">今日摄入明细</p>
        {grouped.length === 0 && (
          <p className="text-sm text-[#1E293B]/40 text-center py-8">暂无记录，使用上方入口开始记录吧 ✨</p>
        )}
        {grouped.map((group) => (
          <div key={group.type} className="space-y-2">
            <h4 className="text-[11px] font-black text-[#1E293B]/60 uppercase px-1">{group.type}</h4>
            {group.meals.map((meal) => (
              <div
                key={meal.id}
                className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex justify-between items-center"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#1E293B] truncate">{meal.name}</p>
                  <p className="text-[10px] font-bold text-primary mt-0.5">
                    P:{meal.protein ?? 0}g &nbsp; C:{meal.carbs ?? 0}g &nbsp; F:{meal.fat ?? 0}g
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-black text-sm text-primary">{meal.calories} kcal</p>
                  <button onClick={() => handleDelete(meal.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-300 hover:text-red-500 transition-colors" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <BottomNav />
      {showAddMeal && (
        <AddMealDialog
          onClose={() => setShowAddMeal(false)}
          onAdd={(m) => { addMeal(m); setShowAddMeal(false); }}
        />
      )}
    </div>
  );
};

/* ── Helpers ── */

function guessType(): string {
  const h = new Date().getHours();
  if (h < 10) return "早餐";
  if (h < 14) return "午餐";
  if (h < 20) return "晚餐";
  return "加餐";
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.4).split(",")[1]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default LogPage;
