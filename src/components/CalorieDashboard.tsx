import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import { toast } from "sonner";

interface CalorieDashboardProps {
  consumed: number;
  target: number;
  onTargetChange: (newTarget: number) => void;
  macros?: { protein: number; carbs: number; fat: number };
}

const CalorieDashboard = ({ consumed, target, onTargetChange, macros }: CalorieDashboardProps) => {
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

  // Macro targets (rough estimates based on calorie target)
  const proteinTarget = Math.round(target * 0.3 / 4); // 30% from protein
  const carbsTarget = Math.round(target * 0.4 / 4);   // 40% from carbs
  const fatTarget = Math.round(target * 0.3 / 9);     // 30% from fat

  const p = macros?.protein || 0;
  const c = macros?.carbs || 0;
  const f = macros?.fat || 0;

  return (
    <div className="mx-6 mt-4 bg-card rounded-[28px] shadow-card-lg p-6 relative z-10 border border-border">
      <p className="text-xs text-muted-foreground text-center mb-5 font-bold tracking-widest uppercase">
        今日热量进度
      </p>

      {/* Circular gauge */}
      <div className="flex justify-center mb-6">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-[90deg]">
            <circle cx="90" cy="90" r="80" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" strokeLinecap="round" />
            <circle
              cx="90" cy="90" r="80"
              fill="none"
              stroke={isOver ? "hsl(var(--destructive))" : "url(#gaugeGradientMint)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * Math.PI * 160} ${Math.PI * 160}`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gaugeGradientMint" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(160 84% 39%)" />
                <stop offset="100%" stopColor="hsl(160 84% 50%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-foreground mb-0.5 tracking-tight">{consumed}</span>
            <span className="text-sm text-muted-foreground font-medium">/ {target} kcal</span>
          </div>
        </div>
      </div>

      {/* Macro pill bars */}
      <div className="flex justify-center gap-6 mb-6">
        <MacroPill label="蛋白质" value={p} target={proteinTarget} color="hsl(160 84% 39%)" unit="g" />
        <MacroPill label="碳水" value={c} target={carbsTarget} color="hsl(217 91% 60%)" unit="g" />
        <MacroPill label="脂肪" value={f} target={fatTarget} color="hsl(24 94% 53%)" unit="g" />
      </div>

      {/* Stats row */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{consumed}</p>
          <p className="text-[11px] text-muted-foreground font-medium">已摄入</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <p className={`text-lg font-bold ${isOver ? 'text-destructive' : 'text-primary'}`}>
            {isOver ? `+${consumed - target}` : remaining}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">{isOver ? '已超标' : '剩余'}</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          {editingTarget ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-14 text-center text-lg font-bold bg-muted rounded-xl px-1 py-0.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleTargetSave()}
              />
              <button onClick={handleTargetSave} className="w-6 h-6 rounded-full gradient-mint flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button onClick={() => { setTargetValue(target.toString()); setEditingTarget(true); }} className="group mindful-interaction">
              <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                {target}
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
              </p>
            </button>
          )}
          <p className="text-[11px] text-muted-foreground font-medium">目标</p>
        </div>
      </div>
    </div>
  );
};

function MacroPill({ label, value, target, color, unit }: { label: string; value: number; target: number; color: string; unit: string }) {
  const pct = Math.min((value / target) * 100, 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-sm font-bold text-foreground">{value}<span className="text-xs text-muted-foreground font-medium">{unit}</span></span>
      <div className="w-3 h-20 rounded-full bg-muted overflow-hidden relative">
        <div
          className="absolute bottom-0 w-full rounded-full transition-all duration-700 ease-out"
          style={{ height: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-semibold">{label}</span>
      <span className="text-[9px] text-muted-foreground">{Math.round(pct)}%</span>
    </div>
  );
}

export default CalorieDashboard;
