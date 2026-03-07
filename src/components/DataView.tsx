import { useState } from "react";
import { X, Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import type { Meal } from "./MealLog";

interface DayRecord {
  date: string; // YYYY-MM-DD
  calories: number;
  weight?: number;
  meals: Meal[];
}

interface DataViewProps {
  onClose: () => void;
  target: number;
  records: DayRecord[];
}

const DataView = ({ onClose, target, records }: DataViewProps) => {
  const [view, setView] = useState<"calendar" | "trend">("calendar");
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = `${year}年${month + 1}月`;

  const weekHeaders = ["日", "一", "二", "三", "四", "五", "六"];

  const getRecordForDay = (day: number): DayRecord | undefined => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return records.find((r) => r.date === dateStr);
  };

  const getDayColor = (record?: DayRecord) => {
    if (!record) return "bg-muted/50 text-muted-foreground/50";
    if (record.calories <= target) return "bg-secondary/30 text-secondary border border-secondary/40";
    return "bg-destructive/20 text-destructive border border-destructive/30";
  };

  // Prepare trend data from records
  const trendData = records
    .slice(-14)
    .map((r) => ({
      day: r.date.slice(5),
      calories: r.calories,
      weight: r.weight,
    }));

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-foreground">数据分析</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setView("calendar"); setSelectedDay(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              view === "calendar" ? "gradient-primary text-primary-foreground shadow-glow-pink" : "bg-muted text-muted-foreground"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            月度日历
          </button>
          <button
            onClick={() => { setView("trend"); setSelectedDay(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              view === "trend" ? "gradient-teal text-secondary-foreground shadow-glow-teal" : "bg-muted text-muted-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            趋势图
          </button>
        </div>

        {view === "calendar" && (
          <>
            <p className="text-center font-bold text-foreground mb-3">{monthName}</p>

            {/* Legend */}
            <div className="flex gap-4 mb-3 justify-center text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-secondary/30 border border-secondary/40" />
                <span>达标</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-destructive/20 border border-destructive/30" />
                <span>超标</span>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {weekHeaders.map((h) => (
                <div key={h} className="text-center text-xs text-muted-foreground font-semibold py-1">
                  {h}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const record = getRecordForDay(day);
                const isToday = day === today.getDate();
                return (
                  <button
                    key={day}
                    onClick={() => record && setSelectedDay(record)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${getDayColor(record)} ${
                      isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
                    } ${record ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
                  >
                    <span>{day}</span>
                    {record && (
                      <span className="text-[8px] font-medium opacity-80">{record.calories}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Day detail popup */}
            {selectedDay && (
              <div className="bg-muted rounded-2xl p-4 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm text-foreground">{selectedDay.date} 饮食明细</p>
                  <button onClick={() => setSelectedDay(null)} className="text-xs text-muted-foreground">关闭</button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  总计: <span className={`font-bold ${selectedDay.calories > target ? "text-destructive" : "text-secondary"}`}>{selectedDay.calories} kcal</span>
                  {selectedDay.weight && <span className="ml-3">体重: <span className="font-bold text-primary">{selectedDay.weight} kg</span></span>}
                </p>
                {selectedDay.meals.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedDay.meals.map((m) => (
                      <div key={m.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{m.type} · {m.name}</span>
                        <span className="font-bold text-foreground">{Math.round(m.calories * (m.oilMultiplier || 1))} kcal</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">无详细记录</p>
                )}
              </div>
            )}
          </>
        )}

        {view === "trend" && (
          <>
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
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 6% 25%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(20 10% 50%)" }} stroke="hsl(20 6% 25%)" />
                    <YAxis yAxisId="cal" tick={{ fontSize: 10, fill: "hsl(20 10% 50%)" }} stroke="hsl(20 6% 25%)" />
                    <YAxis yAxisId="wt" orientation="right" domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "hsl(20 10% 50%)" }} stroke="hsl(20 6% 25%)" />
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
                    <Line yAxisId="wt" type="monotone" dataKey="weight" stroke="hsl(350 72% 62%)" strokeWidth={2.5} dot={{ fill: "hsl(350 72% 62%)", r: 4 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  暂无数据，开始记录后将显示趋势
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DataView;
