import { useState } from "react";
import { Scale, Check, Pencil } from "lucide-react";
import { toast } from "sonner";

interface WeightInputProps {
  todayWeight: number | null;
  editing: boolean;
  loading: boolean;
  onEdit: () => void;
  onSave: (weight: number) => void;
}

const WeightInput = ({ todayWeight, editing, loading, onEdit, onSave }: WeightInputProps) => {
  const [value, setValue] = useState("");

  if (loading) return null;

  // Already recorded and not editing
  if (todayWeight !== null && !editing) {
    return (
      <div className="mx-6 mt-6">
        <div className="w-full bg-card rounded-[24px] px-5 py-4 flex items-center gap-4 shadow-mindful mindful-border">
          <div className="w-12 h-12 rounded-[16px] bg-muted flex items-center justify-center">
            <Scale className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">今日体重</p>
            <p className="text-xl font-extrabold text-foreground">
              {todayWeight} <span className="text-sm text-muted-foreground font-medium">kg</span>
            </p>
          </div>
          <button
            onClick={() => { setValue(String(todayWeight)); onEdit(); }}
            className="w-10 h-10 rounded-[16px] bg-muted hover:bg-white hover:shadow-sm flex items-center justify-center transition-all mindful-interaction border border-transparent hover:border-border"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const w = parseFloat(value);
    if (isNaN(w) || w < 20 || w > 300) {
      toast.error("请输入有效体重 (20-300 kg)");
      return;
    }
    onSave(w);
  };

  return (
    <div className="mx-6 mt-6">
      <div className="bg-card rounded-[24px] px-5 py-4 flex items-center gap-4 shadow-mindful mindful-border">
        <div className="w-12 h-12 rounded-[16px] gradient-mindful flex items-center justify-center shadow-glow-blue">
          <Scale className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            {todayWeight !== null ? "修改今日体重" : "记录今日体重"}
          </p>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例: 68.5"
            autoFocus
            className="w-full px-4 py-3 rounded-[16px] bg-muted text-base font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm border border-transparent focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <button
          onClick={handleSave}
          className="w-12 h-12 rounded-[16px] gradient-mindful flex items-center justify-center shadow-glow-blue mindful-interaction"
        >
          <Check className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default WeightInput;
