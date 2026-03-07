import { useState } from "react";
import { Scale, Check } from "lucide-react";
import { toast } from "sonner";

interface WeightInputProps {
  todayWeight: number | null;
  onSave: (weight: number) => void;
}

const WeightInput = ({ todayWeight, onSave }: WeightInputProps) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(todayWeight?.toString() || "");

  const handleSave = () => {
    const w = parseFloat(value);
    if (isNaN(w) || w < 20 || w > 300) {
      toast.error("请输入有效体重 (20-300 kg)");
      return;
    }
    onSave(w);
    setEditing(false);
    toast.success("体重已记录");
  };

  if (!editing && todayWeight !== null) {
    return (
      <div className="mx-4 mt-4">
        <button
          onClick={() => { setValue(todayWeight.toString()); setEditing(true); }}
          className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card hover:bg-muted transition-colors"
        >
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-pink">
            <Scale className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs text-muted-foreground font-semibold">今日体重</p>
            <p className="text-lg font-extrabold text-foreground">{todayWeight} <span className="text-sm text-muted-foreground font-medium">kg</span></p>
          </div>
          <span className="text-xs text-muted-foreground">点击修改</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4">
      <div className="bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-pink">
          <Scale className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-semibold mb-1">
            {todayWeight !== null ? "修改体重" : "记录今日体重"}
          </p>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例: 68.5"
            autoFocus
            className="w-full px-3 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <button
          onClick={handleSave}
          className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center shadow-glow-teal"
        >
          <Check className="w-5 h-5 text-secondary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default WeightInput;
