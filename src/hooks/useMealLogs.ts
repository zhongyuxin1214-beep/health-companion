import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Meal } from "@/components/MealLog";
import { toast } from "sonner";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const toNumberOrZero = (value: unknown) => {
  if (value === "" || value === undefined || value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const useMealLogs = () => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    if (!user) { setMeals([]); setLoading(false); return; }
    const { data } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayStr())
      .order("created_at", { ascending: true });

    if (data) {
      setMeals(data.map((m) => ({
        id: m.id,
        type: m.type,
        name: m.name,
        calories: m.calories,
        oilMultiplier: m.oil_multiplier ?? 1,
        protein: m.protein ?? undefined,
        carbs: m.carbs ?? undefined,
        fat: m.fat ?? undefined,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const addMeal = async (meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? user?.id;
    if (!userId) {
      toast.error("请先登录后再记录");
      return;
    }

    const { error } = await supabase.from("meal_logs").insert({
      user_id: userId,
      date: todayStr(),
      type: meal.type || "加餐",
      name: meal.name?.trim() || "未命名食物",
      calories: toNumberOrZero(meal.calories),
      protein: toNumberOrZero(meal.protein),
      carbs: toNumberOrZero(meal.carbs),
      fat: toNumberOrZero(meal.fat),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("已添加记录");
    await fetchMeals();
  };

  const updateMeal = async (id: string, meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => {
    const { error } = await supabase.from("meal_logs").update({
      type: meal.type || "加餐",
      name: meal.name?.trim() || "未命名食物",
      calories: toNumberOrZero(meal.calories),
      protein: toNumberOrZero(meal.protein),
      carbs: toNumberOrZero(meal.carbs),
      fat: toNumberOrZero(meal.fat),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("已更新记录");
    await fetchMeals();
  };

  const adjustOil = async (id: string, multiplier: number) => {
    const { error } = await supabase.from("meal_logs").update({ oil_multiplier: multiplier }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`油度已校准为 ${multiplier}x`);
    await fetchMeals();
  };

  const totalConsumed = meals.reduce(
    (sum, m) => sum + Math.round(m.calories * (m.oilMultiplier || 1)), 0
  );

  return { meals, loading, addMeal, updateMeal, adjustOil, totalConsumed, refetch: fetchMeals };
};
