import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useMealLogs } from "@/hooks/useMealLogs";
import { Loader2, TrendingUp, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";

interface DayData {
  date: string;
  calories: number;
  weight: number | null;
}

interface MacroData {
  date: string;
  protein: number;
  carbs: number;
  fat: number;
}

interface CalendarDayInfo {
  date: string;
  calories: number;
  status: "under" | "over" | "none";
}

interface DayDetail {
  date: string;
  meals: { name: string; type: string; calories: number; protein?: number; carbs?: number; fat?: number }[];
  totalCalories: number;
}

const StatsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { tdee } = useProfile();
  const { addMeal } = useMealLogs();
  const [view, setView] = useState<"week" | "month">("week");
  const [data, setData] = useState<DayData[]>([]);
  const [macroData, setMacroData] = useState<MacroData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMeal, setShowAddMeal] = useState(false);

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [calData, setCalData] = useState<Map<string, number>>(new Map());
  const [calLoading, setCalLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const days = view === "week" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const [mealRes, weightRes] = await Promise.all([
      supabase.from("meal_logs").select("date, calories, oil_multiplier, protein, carbs, fat").eq("user_id", user.id).gte("date", sinceStr).order("date"),
      supabase.from("daily_body_logs").select("date, weight").eq("user_id", user.id).gte("date", sinceStr).order("date"),
    ]);

    const calMap = new Map<string, number>();
    const macroMap = new Map<string, { protein: number; carbs: number; fat: number }>();

    (mealRes.data || []).forEach((l) => {
      const cal = Math.round(l.calories * (l.oil_multiplier || 1));
      calMap.set(l.date, (calMap.get(l.date) || 0) + cal);

      const existing = macroMap.get(l.date) || { protein: 0, carbs: 0, fat: 0 };
      existing.protein += l.protein || 0;
      existing.carbs += l.carbs || 0;
      existing.fat += l.fat || 0;
      macroMap.set(l.date, existing);
    });

    const wtMap = new Map<string, number>();
    (weightRes.data || []).forEach((w) => wtMap.set(w.date, w.weight));

    const allDates = new Set([...calMap.keys(), ...wtMap.keys()]);
    const sorted = Array.from(allDates).sort();
    setData(sorted.map((d) => ({ date: d.slice(5), calories: calMap.get(d) || 0, weight: wtMap.get(d) ?? null })));

    // Macro trend data
    const macroSorted = Array.from(macroMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    setMacroData(macroSorted.map(([d, m]) => ({
      date: d.slice(5),
      protein: Math.round(m.protein),
      carbs: Math.round(m.carbs),
      fat: Math.round(m.fat),
    })));

    setLoading(false);
  }, [user, view]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calendar data
  const fetchCalendarData = useCallback(async () => {
    if (!user) return;
    setCalLoading(true);
    const firstDay = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-01`;
    const lastDate = new Date(calMonth.year, calMonth.month + 1, 0);
    const lastDay = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;

    const { data: meals } = await supabase
      .from("meal_logs")
      .select("date, calories, oil_multiplier")
      .eq("user_id", user.id)
      .gte("date", firstDay)
      .lte("date", lastDay);

    const map = new Map<string, number>();
    (meals || []).forEach((m) => {
      const cal = Math.round(m.calories * (m.oil_multiplier || 1));
      map.set(m.date, (map.get(m.date) || 0) + cal);
    });
    setCalData(map);
    setCalLoading(false);
  }, [user, calMonth]);

  useEffect(() => { fetchCalendarData(); }, [fetchCalendarData]);

  const fetchDayDetail = async (dateStr: string) => {
    if (!user) return;
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("name, type, calories, oil_multiplier, protein, carbs, fat")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .order("created_at");

    const mealList = (meals || []).map((m) => ({
      name: m.name,
      type: m.type,
      calories: Math.round(m.calories * (m.oil_multiplier || 1)),
      protein: m.protein || undefined,
      carbs: m.carbs || undefined,
      fat: m.fat || undefined,
    }));

    setSelectedDay({
      date: dateStr,
      meals: mealList,
      totalCalories: mealList.reduce((s, m) => s + m.calories, 0),
    });
  };

  const avgCal = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length) : 0;
  const weights = data.filter((d) => d.weight !== null).map((d) => d.weight as number);
  const weightDelta = weights.length >= 2 ? (weights[weights.length - 1] - weights[0]).toFixed(1) : null;

  // Macro averages for AI comment
  const avgP = macroData.length > 0 ? Math.round(macroData.reduce((s, d) => s + d.protein, 0) / macroData.length) : 0;
  const avgC = macroData.length > 0 ? Math.round(macroData.reduce((s, d) => s + d.carbs, 0) / macroData.length) : 0;
  const avgF = macroData.length > 0 ? Math.round(macroData.reduce((s, d) => s + d.fat, 0) / macroData.length) : 0;

  const getMacroComment = () => {
    if (macroData.length === 0) return null;
    const parts: string[] = [];
    if (avgP >= 80) parts.push("蛋白质摄入达标👍");
    else parts.push("蛋白质偏低，建议增加鸡胸/鱼/蛋");
    if (avgC > 250) parts.push("碳水略高，建议减少米面");
    else parts.push("碳水控制良好");
    if (avgF > 70) parts.push("脂肪偏高，注意控油");
    else parts.push("脂肪摄入合理");
    return parts.join("，");
  };

  // Calendar helpers
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(calMonth.year, calMonth.month, 1).getDay();
  const monthLabel = `${calMonth.year}年${calMonth.month + 1}月`;
  const todayStr = new Date().toISOString().slice(0, 10);

  const prevMonth = () => {
    setCalMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  };
  const nextMonth = () => {
    setCalMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-secondary" /> 趋势分析
        </h1>
      </div>

      {/* Period toggle */}
      <div className="mx-4 flex gap-2 mb-5">
        {(["week", "month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              view === v ? "gradient-teal text-secondary-foreground shadow-glow-teal" : "bg-muted text-muted-foreground"
            }`}
          >
            {v === "week" ? "近 7 天" : "近 30 天"}
          </button>
        ))}
      </div>

      {/* Calories + Weight Chart */}
      <div className="mx-4 bg-card rounded-2xl p-4 shadow-card-lg border border-border">
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
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              暂无数据，开始记录后将显示趋势
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis yAxisId="cal" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis yAxisId="wt" orientation="right" domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "16px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar yAxisId="cal" dataKey="calories" fill="hsl(var(--secondary) / 0.7)" radius={[8, 8, 0, 0]} />
                <Line yAxisId="wt" type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>每日目标</span>
            <span className="font-bold text-secondary">{tdee} kcal</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{view === "week" ? "本周" : "本月"}平均摄入</span>
            <span className="font-bold text-foreground">{avgCal} kcal</span>
          </div>
          {weightDelta !== null && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>体重变化</span>
              <span className={`font-bold ${parseFloat(weightDelta) <= 0 ? "text-secondary" : "text-primary"}`}>
                {parseFloat(weightDelta) > 0 ? "+" : ""}{weightDelta} kg
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Macro Trends Chart */}
      {macroData.length > 0 && (
        <div className="mx-4 mt-4 bg-card rounded-2xl p-4 shadow-card-lg border border-border">
          <h3 className="font-bold text-sm text-foreground mb-3">宏量营养素趋势</h3>
          <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-full bg-primary" />
              <span>蛋白质</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-full bg-secondary" />
              <span>碳水</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-full bg-accent" />
              <span>脂肪</span>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={macroData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "16px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { protein: "蛋白质", carbs: "碳水", fat: "脂肪" };
                    return [`${value}g`, labels[name] || name];
                  }}
                />
                <Line type="monotone" dataKey="protein" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="carbs" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="fat" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Macro averages + AI comment */}
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>日均 P/C/F</span>
              <span className="font-bold text-foreground">{avgP}g / {avgC}g / {avgF}g</span>
            </div>
            {getMacroComment() && (
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                💡 {getMacroComment()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Monthly Calendar */}
      <div className="mx-4 mt-4 bg-card rounded-2xl p-4 shadow-card-lg border border-border">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h3 className="font-bold text-sm text-foreground">{monthLabel}</h3>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const cal = calData.get(dateStr);
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;

            let bgClass = "bg-muted";
            if (!isFuture && cal !== undefined && cal > 0) {
              bgClass = cal <= tdee ? "bg-secondary/30" : "bg-primary/30";
            }

            return (
              <button
                key={day}
                onClick={() => !isFuture && cal !== undefined && fetchDayDetail(dateStr)}
                disabled={isFuture || cal === undefined}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${bgClass} ${
                  isToday ? "ring-2 ring-secondary" : ""
                } ${isFuture || cal === undefined ? "opacity-40 cursor-default" : "hover:opacity-80 cursor-pointer"}`}
              >
                <span className={isToday ? "text-secondary font-extrabold" : "text-foreground"}>{day}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 mt-3 pt-2 border-t border-border justify-center text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-secondary/30" />
            <span>达标 (≤ {tdee})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-primary/30" />
            <span>超标</span>
          </div>
        </div>
      </div>

      {/* Day detail popup */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in" onClick={() => setSelectedDay(null)}>
           <div className="w-full max-w-md bg-card rounded-t-3xl p-5 pb-8 shadow-card-lg animate-in slide-in-from-bottom max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">{selectedDay.date} 饮食明细</h3>
              <button onClick={() => setSelectedDay(null)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {selectedDay.meals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">该日暂无饮食记录</p>
            ) : (
              <div className="space-y-2">
                {selectedDay.meals.map((m, i) => (
                  <div key={i} className="bg-muted rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold">{m.type}</p>
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                      </div>
                      <span className="text-sm font-extrabold text-primary tabular-nums">{m.calories} kcal</span>
                    </div>
                    {(m.protein || m.carbs || m.fat) && (
                      <div className="flex gap-3 mt-1.5">
                        {m.protein != null && <span className="text-[10px] text-primary font-bold">P {m.protein}g</span>}
                        {m.carbs != null && <span className="text-[10px] text-secondary font-bold">C {m.carbs}g</span>}
                        {m.fat != null && <span className="text-[10px] text-accent font-bold">F {m.fat}g</span>}
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>当日总计</span>
                  <span className={`font-bold ${selectedDay.totalCalories <= tdee ? "text-secondary" : "text-primary"}`}>
                    {selectedDay.totalCalories} kcal
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default StatsPage;
