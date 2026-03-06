import { useState } from "react";

interface OilSliderProps {
  mealId: string;
  onAdjust: (mealId: string, multiplier: number) => void;
  onClose: () => void;
}

const levels = [
  { label: "清淡", multiplier: 1.0, emoji: "🥗" },
  { label: "常规", multiplier: 1.3, emoji: "🍳" },
  { label: "油腻", multiplier: 1.6, emoji: "🍟" },
  { label: "重油", multiplier: 2.0, emoji: "🫕" },
];

const OilSlider = ({ mealId, onAdjust, onClose }: OilSliderProps) => {
  const [selected, setSelected] = useState(1);

  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-1">油度校准</h3>
        <p className="text-sm text-muted-foreground mb-5">调整外卖/餐厅的油脂含量，精确估算热量</p>
        
        <div className="grid grid-cols-4 gap-2 mb-6">
          {levels.map((level, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                selected === i
                  ? 'border-primary bg-secondary'
                  : 'border-transparent bg-muted'
              }`}
            >
              <span className="text-2xl">{level.emoji}</span>
              <span className="text-xs font-medium">{level.label}</span>
              <span className="text-xs text-muted-foreground">{level.multiplier}x</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { onAdjust(mealId, levels[selected].multiplier); onClose(); }}
          className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm"
        >
          应用校准
        </button>
      </div>
    </div>
  );
};

export default OilSlider;
