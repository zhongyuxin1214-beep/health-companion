import { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

interface AddMealDialogProps {
  onClose: () => void;
  onAdd: (meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => void;
  editMeal?: { id: string; type: string; name: string; calories: number } | null;
  prefillMeal?: { type?: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number };
}

const mealTypes = ["早餐", "午餐", "晚餐", "加餐"];

async function recognizeFood(base64Image: string): Promise<any> {
  const res = await fetch("/api/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });
  return await res.json();
}

const AddMealDialog = ({ onClose, onAdd, editMeal, prefillMeal }: AddMealDialogProps) => {
  const initialType = editMeal?.type || prefillMeal?.type || "早餐";
  const initialName = editMeal?.name || prefillMeal?.name || "";
  const initialCalories = editMeal?.calories?.toString() || (prefillMeal?.calories != null ? String(prefillMeal.calories) : "");

  const [type, setType] = useState(initialType);
  const [name, setName] = useState(initialName);
  const [calories, setCalories] = useState(initialCalories);
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefillMeal || editMeal) return;
    setType(prefillMeal.type || "加餐");
    setName(prefillMeal.name || "");
    setCalories(prefillMeal.calories != null ? String(prefillMeal.calories) : "");
    setProtein(prefillMeal.protein != null ? String(prefillMeal.protein) : "");
    setCarbs(prefillMeal.carbs != null ? String(prefillMeal.carbs) : "");
    setFat(prefillMeal.fat != null ? String(prefillMeal.fat) : "");
  }, [prefillMeal, editMeal]);

  useEffect(() => {
    let interval: any;
    if (recognizing) {
      setLoadingProgress(0);
      setLoadingStatus("正在压缩图片并上传...");
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev < 30) return prev + 5;
          if (prev < 70) { setLoadingStatus("AI 正在分析食物成分..."); return prev + 1; }
          if (prev < 95) { setLoadingStatus("正在精算热量与营养素..."); return prev + 0.5; }
          return prev;
        });
      }, 200);
    } else {
      setLoadingProgress(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [recognizing]);

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.4);
        setPreview(compressed);
        setRecognizing(true);
        try {
          const result = await recognizeFood(compressed.split(",")[1]);
          if (result.error) throw new Error(result.error);
          setLoadingProgress(100);
          setLoadingStatus("解析成功！");
          setName(result.name);
          setCalories(String(result.calories));
          setProtein(String(result.protein || ""));
          setCarbs(String(result.carbs || ""));
          setFat(String(result.fat || ""));
          toast.success("识别完成");
        } catch (err: any) {
          toast.error(err.message || "识别失败");
        } finally {
          setRecognizing(false);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name || !calories) { toast.error("请填写名称和热量"); return; }
    onAdd({
      type,
      name,
      calories: parseInt(calories),
      protein: parseFloat(protein) || undefined,
      carbs: parseFloat(carbs) || undefined,
      fat: parseFloat(fat) || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-[28px] p-6 animate-slide-up shadow-card-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl bg-primary/10 card-hover"
          >
            <Camera className="w-7 h-7 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-bold text-foreground">拍照识别</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl bg-accent/10 card-hover">
            <Mic className="w-7 h-7 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-bold text-foreground">语音补录</span>
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="relative rounded-2xl overflow-hidden mb-5 border border-border">
            <img src={preview} alt="食物" className="w-full h-40 object-cover" style={{ opacity: recognizing ? 0.5 : 1 }} />
            {recognizing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/40">
                <div className="relative w-16 h-16 mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="hsl(var(--muted))" strokeWidth="4" fill="transparent" />
                    <circle cx="32" cy="32" r="28" stroke="hsl(var(--primary))" strokeWidth="4" fill="transparent"
                      strokeDasharray={176} strokeDashoffset={176 - (176 * loadingProgress) / 100} className="transition-all duration-300" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-xs">{Math.floor(loadingProgress)}%</span>
                </div>
                <p className="text-primary-foreground text-xs font-medium animate-pulse">{loadingStatus}</p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className={`space-y-3 transition-opacity duration-300 ${recognizing ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {/* Meal type */}
          <div className="flex gap-2">
            {mealTypes.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${type === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground ml-1 mb-1 block font-medium">食物名称</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              placeholder="AI 会帮你填，也可手动输入" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground ml-1 mb-1 block font-medium">热量 (kcal)</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              placeholder="0" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground text-center block mb-1 font-medium">蛋白质(g)</label>
              <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
                className="w-full py-2.5 rounded-xl bg-card border border-border text-xs text-center text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground text-center block mb-1 font-medium">碳水(g)</label>
              <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                className="w-full py-2.5 rounded-xl bg-card border border-border text-xs text-center text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground text-center block mb-1 font-medium">脂肪(g)</label>
              <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
                className="w-full py-2.5 rounded-xl bg-card border border-border text-xs text-center text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            </div>
          </div>

          <button onClick={handleSubmit}
            className="w-full gradient-mint text-primary-foreground py-3.5 rounded-2xl font-bold shadow-mint hover:scale-[1.02] active:scale-95 transition-all mt-2">
            添加到记录
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMealDialog;
