import { useState } from "react";
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { X, TrendingUp } from "lucide-react";

const weekData = [
  { day: "周一", calories: 1650, weight: 68.5 },
  { day: "周二", calories: 1780, weight: 68.3 },
  { day: "周三", calories: 1520, weight: 68.1 },
  { day: "周四", calories: 1900, weight: 68.4 },
  { day: "周五", calories: 1600, weight: 68.0 },
  { day: "周六", calories: 2100, weight: 68.2 },
  { day: "周日", calories: 1200, weight: 67.8 },
];

const monthData = [
  { day: "第1周", calories: 1700, weight: 69.0 },
  { day: "第2周", calories: 1650, weight: 68.5 },
  { day: "第3周", calories: 1600, weight: 68.0 },
  { day: "第4周", calories: 1550, weight: 67.5 },
];

interface TrendChartProps {
  onClose: () => void;
}

const TrendChart = ({ onClose }: TrendChartProps) => {
  const [view, setView] = useState<"week" | "month">("week");
  const data = view === "week" ? weekData : monthData;

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <h3 className="font-bold text-lg text-foreground">趋势分析</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                view === v ? "gradient-teal text-secondary-foreground shadow-glow-teal" : "bg-muted text-muted-foreground"
              }`}
            >
              {v === "week" ? "本周" : "本月"}
            </button>
          ))}
        </div>

        <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-secondary/70" />
            <span>热量 (kcal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full bg-primary" />
            <span>体重 (kg)</span>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 6% 25%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(20 10% 50%)" }} stroke="hsl(20 6% 25%)" />
              <YAxis yAxisId="cal" tick={{ fontSize: 10, fill: "hsl(20 10% 50%)" }} stroke="hsl(20 6% 25%)" />
              <YAxis yAxisId="wt" orientation="right" domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: "hsl(20 10% 50%)" }} stroke="hsl(20 6% 25%)" />
              <Tooltip
                contentStyle={{
                  background: "hsl(20 8% 16%)",
                  border: "1px solid hsl(20 6% 25%)",
                  borderRadius: "16px",
                  fontSize: "12px",
                  color: "hsl(0 0% 90%)",
                }}
              />
              <Bar yAxisId="cal" dataKey="calories" fill="hsl(174 55% 35% / 0.7)" radius={[8, 8, 0, 0]} />
              <Line yAxisId="wt" type="monotone" dataKey="weight" stroke="hsl(350 72% 62%)" strokeWidth={2.5} dot={{ fill: "hsl(350 72% 62%)", r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
