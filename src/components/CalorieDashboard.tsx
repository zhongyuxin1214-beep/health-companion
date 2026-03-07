import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import { toast } from "sonner";

interface CalorieDashboardProps {
  consumed: number;
  target: number;
  onTargetChange: (newTarget: number) => void;
}

const CalorieDashboard = ({ consumed, target, onTargetChange }: CalorieDashboardProps) => {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState(target.toString());

  const handleTargetSave = () => {
    const v = parseInt(targetValue);
    if (isNaN(v) || v < 500 || v > 5000) {
      toast.error("请输入合理的热量目标 (500-5000)");
      return;
    }
    onTargetChange(v);
    setEditingTarget(false);
    toast.success("目标已更新");
  };

  const remaining = Math.max(0, target - consumed);
  const progress = Math.min((consumed / target) * 100, 100);
  const isOver = consumed > target;
  const angle = (progress / 100) * 270;

  return (
    <div className="mx-4 -mt-14 bg-card rounded-3xl shadow-elevated p-6 relative z-10">
      <p className="text-xs text-muted-foreground text-center mb-2 font-semibold tracking-wider uppercase">
        今日热量进度
      </p>

      {/* Circular gauge */}
      <div className="flex justify-center mb-4">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-[135deg]">
            <circle
              cx="90" cy="90" r="76"
              fill="none"
              stroke="hsl(20 6% 25%)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${270 * (Math.PI * 152 / 360)} ${Math.PI * 152}`}
            />
            <circle
              cx="90" cy="90" r="76"
              fill="none"
              stroke={isOver ? "hsl(0 72% 55%)" : "url(#gaugeGradient)"}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(angle / 360) * Math.PI * 152} ${Math.PI * 152}`}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(174 55% 35%)" />
                <stop offset="100%" stopColor="hsl(174 45% 50%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-foreground">{consumed}</span>
            <span className="text-xs text-muted-foreground font-medium">/ {target} kcal</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-8">
        <div className="text-center">
          <div className="w-2 h-2 rounded-full bg-secondary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{consumed}</p>
          <p className="text-xs text-muted-foreground">已摄入</p>
        </div>
        <div className="text-center">
          <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${isOver ? 'bg-destructive' : 'bg-primary'}`} />
          <p className={`text-lg font-bold ${isOver ? 'text-destructive' : 'text-primary'}`}>
            {isOver ? `+${consumed - target}` : remaining}
          </p>
          <p className="text-xs text-muted-foreground">{isOver ? '已超标' : '剩余'}</p>
        </div>
        <div className="text-center">
          <div className="w-2 h-2 rounded-full bg-accent mx-auto mb-1" />
          {editingTarget ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-16 text-center text-lg font-bold bg-muted rounded-lg px-1 py-0.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleTargetSave()}
              />
              <button onClick={handleTargetSave} className="w-6 h-6 rounded-full gradient-teal flex items-center justify-center">
                <Check className="w-3 h-3 text-secondary-foreground" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setTargetValue(target.toString()); setEditingTarget(true); }} className="group">
              <p className="text-lg font-bold text-foreground group-hover:text-accent transition-colors flex items-center gap-1">
                {target}
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
              </p>
            </button>
          )}
          <p className="text-xs text-muted-foreground">目标</p>
        </div>
      </div>
    </div>
  );
};

export default CalorieDashboard;
