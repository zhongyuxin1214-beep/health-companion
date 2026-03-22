import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

import { Loader2, TrendingUp, ChevronLeft, ChevronRight, X, Info } from "lucide-react";
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend } from "recharts";

interface DayData {
  date: string;
  displayDate: string;
  calories: number;
  weight: number | null;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayDetail {
  date: string;
  meals: { name: string; type: string; calories: number; protein?: number; carbs?: number; fat?: number }[];
  totalCalories: number;
}

const StatsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { tdee, profile } = useProfile();
  const [view, setView] = useState<"week" | "month">("week");
  const [statsData, setStatsData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [calData, setCalData] = useState<Map<string, number>>(new Map());
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const days = view === "week" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const sinceStr = since.toISOString().slice(0, 10);

    const [mealRes, weightRes] = await Promise.all([
      supabase.from("meal_logs")
        .select("date, calories, protein, carbs, fat")
        .eq("user_id", user.id)
        .gte("date", sinceStr)
        .order("date"),
      supabase.from("daily_body_logs")
        .select("date, weight")
        .eq("user_id", user.id)
        .gte("date", sinceStr)
        .order("date"),
    ]);

    // 数据聚合逻辑
    const dataMap = new Map<string, DayData>();
    
    // 生成连续日期序列
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const dStr = d.toISOString().slice(0, 10);
      dataMap.set(dStr, {
        date: dStr,
        displayDate: dStr.slice(5),
        calories: 0,
        weight: null,
        protein: 0,
        carbs: 0,
        fat: 0
      });
    }

    (mealRes.data || []).forEach((l) => {
      const existing = dataMap.get(l.date);
      if (existing) {
        existing.calories += l.calories || 0;
        existing.protein += l.protein || 0;
        existing.carbs += l.carbs || 0;
        existing.fat += l.fat || 0;
      }
    });

    (weightRes.data || []).forEach((w) => {
      const existing = dataMap.get(w.date);
      if (existing) existing.weight = w.weight;
    });

    setStatsData(Array.from(dataMap.values()));
    
    // 同步更新日历总数据
    const calMap = new Map<string, number>();
    Array.from(dataMap.values()).forEach(d => calMap.set(d.date, d.calories));
    setCalData(calMap);
    
    setLoading(false);
  }, [user, view]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDayDetail = async (dateStr: string) => {
    if (!user) return;
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("name, type, calories, protein, carbs, fat")
      .eq("user_id", user.id)
      .eq("date", dateStr);

    const mealList = (meals || []).map((m) => ({
      name: m.name,
      type: m.type,
      calories: Math.round(m.calories),
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
    }));

    setSelectedDay({
      date: dateStr,
      meals: mealList,
      totalCalories: mealList.reduce((s, m) => s + m.calories, 0),
    });
  };

  const prevMonth = () => setCalMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setCalMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto relative pb-40 overflow-y-auto no-scrollbar">
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-2xl font-black text-[#1E293B] flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-[#3B82F6]" /> 趋势分析
        </h1>
      </div>

      {/* 视图切换 */}
      <div className="mx-6 flex gap-2 mb-6">
        {(["week", "month"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-3 rounded-2xl text-xs font-black tracking-widest uppercase transition-all ${
              view === v ? "bg-[#3B82F6] text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400"
            }`}>{v === "week" ? "近 7 天" : "近 30 天"}</button>
        ))}
      </div>

      {/* 核心图表 1：热量与体重 */}
      <div className="mx-6 bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mb-6">
        <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-6 text-center">热量摄入 vs 体重趋势</p>
        <div className="h-64 -ml-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="displayDate" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#64748B', fontWeight: 700}} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} tick={{fill: '#3B82F6', fontWeight: 800}} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              <Bar yAxisId="left" dataKey="calories" fill="#10B981" opacity={0.6} radius={[6, 6, 0, 0]} barSize={16} />
              <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 核心图表 2：三大营养素趋势 */}
      <div className="mx-6 bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mb-6">
        <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-6 text-center">宏量营养素摄入趋势</p>
        <div className="h-64 -ml-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="displayDate" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#64748B', fontWeight: 700}} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" iconType="circle" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 800}} />
              {/* 体重作为淡色背景条形图 */}
              <Bar dataKey="weight" fill="#E2E8F0" opacity={0.3} barSize={20} name="体重参考" />
              <Line type="monotone" dataKey="protein" stroke="#10B981" strokeWidth={3} dot={false} name="蛋白质(g)" />
              <Line type="monotone" dataKey="carbs" stroke="#3B82F6" strokeWidth={3} dot={false} name="碳水(g)" />
              <Line type="monotone" dataKey="fat" stroke="#F97316" strokeWidth={3} dot={false} name="脂肪(g)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 月度健康日历 */}
      <div className="mx-6 bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mb-10">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
          <h3 className="font-black text-[#1E293B]">{calMonth.year}年{calMonth.month + 1}月</h3>
          <button onClick={nextMonth} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["日", "一", "二", "三", "四", "五", "六"].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase pb-2">{d}</div>
          ))}
          {Array.from({ length: new Date(calMonth.year, calMonth.month, 1).getDay() }).map((_, i) => <div key={i} />)}
          {Array.from({ length: new Date(calMonth.year, calMonth.month + 1, 0).getDate() }).map((_, i) => {
            const day = i + 1;
            const dStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const cal = calData.get(dStr);
            const isTargetMet = cal !== undefined && cal > 0 && cal <= (tdee || 2000);
            const isOver = cal !== undefined && cal > (tdee || 2000);

            return (
              <button key={day} onClick={() => cal && fetchDayDetail(dStr)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                  isTargetMet ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : 
                  isOver ? "bg-rose-500 text-white shadow-lg shadow-rose-100" : "bg-slate-50 text-slate-400"
                }`}>
                <span className="text-xs font-black">{day}</span>
                {cal !== undefined && cal > 0 && <span className="text-[7px] font-bold mt-0.5 opacity-80">{cal}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1E293B]/20 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
           <div className="w-full max-w-md bg-white rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-[#1E293B]">{selectedDay.date} 摄入明细</h3>
              <button onClick={() => setSelectedDay(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              {selectedDay.meals.map((m, i) => (
                <div key={i} className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{m.type}</p>
                      <p className="font-bold text-[#1E293B]">{m.name}</p>
                    </div>
                    <span className="font-black text-sm text-[#10B981]">{m.calories} kcal</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[11px] font-bold text-emerald-600">P {m.protein || 0}g</span>
                    <span className="text-[11px] font-bold text-blue-600">C {m.carbs || 0}g</span>
                    <span className="text-[11px] font-bold text-orange-600">F {m.fat || 0}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default StatsPage;
