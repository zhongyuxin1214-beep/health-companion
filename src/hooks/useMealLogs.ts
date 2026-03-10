import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Meal } from "@/components/MealLog";
import { toast } from "sonner";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const useMealLogs = () => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    if (!user) { setLoading(false); return; }
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
        oilMultiplier: m.oil_multiplier || 1,
        protein: m.protein || undefined,
        carbs: m.carbs || undefined,
        fat: m.fat || undefined,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const addMeal = async (meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => {
    if (!user) return;
    const { error } = await supabase.from("meal_logs").insert({
      user_id: user.id,
      date: todayStr(),
      type: meal.type,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein || null,
      carbs: meal.carbs || null,
      fat: meal.fat || null,
    });
    if (error) { toast.error("添加失败"); return; }
    toast.success("已添加记录");
    fetchMeals();
  };

  const updateMeal = async (id: string, meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => {
    const { error } = await supabase.from("meal_logs").update({
      type: meal.type,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein || null,
      carbs: meal.carbs || null,
      fat: meal.fat || null,
    }).eq("id", id);
    if (error) { toast.error("更新失败"); return; }
    toast.success("已更新记录");
    fetchMeals();
  };

  const adjustOil = async (id: string, multiplier: number) => {
    const { error } = await supabase.from("meal_logs").update({ oil_multiplier: multiplier }).eq("id", id);
    if (error) { toast.error("调整失败"); return; }
    toast.success(`油度已校准为 ${multiplier}x`);
    fetchMeals();
  };

  const totalConsumed = meals.reduce(
    (sum, m) => sum + Math.round(m.calories * (m.oilMultiplier || 1)), 0
  );

  return { meals, loading, addMeal, updateMeal, adjustOil, totalConsumed, refetch: fetchMeals };
};
