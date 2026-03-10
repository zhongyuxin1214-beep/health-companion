import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMealLogs } from "@/hooks/useMealLogs";
import BottomNav from "@/components/BottomNav";
import AddMealDialog from "@/components/AddMealDialog";
import OilSlider from "@/components/OilSlider";
import type { Meal } from "@/components/MealLog";
import { Loader2, Pencil, ChefHat, Trash2, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const mealTypeEmoji: Record<string, string> = {
  "早餐": "🌅", "午餐": "☀️", "晚餐": "🌙", "加餐": "🍪",
};

const LogPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { meals, totalConsumed, addMeal, updateMeal, adjustOil, refetch } = useMealLogs();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showOilSlider, setShowOilSlider] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meal_logs").delete().eq("id", id);
    if (error) { toast.error("删除失败"); return; }
    toast.success("已删除");
    refetch();
  };

  const handleEdit = (id: string) => {
    const meal = meals.find((m) => m.id === id);
    if (meal) { setEditingMeal(meal); setShowAddMeal(true); }
  };

  const handleAddMeal = (meal: { type: string; name: string; calories: number; protein?: number; carbs?: number; fat?: number }) => {
    if (editingMeal) {
      updateMeal(editingMeal.id, meal);
      setEditingMeal(null);
    } else {
      addMeal(meal);
    }
  };

  const mealOrder = ["早餐", "午餐", "晚餐", "加餐"];
  const grouped = mealOrder.map((type) => ({
    type,
    meals: meals.filter((m) => m.type === type),
  })).filter((g) => g.meals.length > 0);

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      <div className="px-4 pt-12 pb-6">
        <p className="text-sm text-muted-foreground font-medium">今日饮食日志</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-5xl font-extrabold text-foreground tabular-nums">{totalConsumed}</span>
          <span className="text-lg text-muted-foreground font-medium mb-1.5">kcal</span>
          <Flame className="w-6 h-6 text-accent mb-2 ml-1" />
        </div>
      </div>

      <div className="mx-4 space-y-4">
        {grouped.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center shadow-card">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="font-bold text-foreground mb-1">还没有记录</p>
            <p className="text-sm text-muted-foreground">点击底部 + 按钮开始添加饮食</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.type}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{mealTypeEmoji[group.type] || "🍽️"}</span>
                <span className="text-sm font-bold text-foreground">{group.type}</span>
                <span className="text-xs text-muted-foreground">
                  {group.meals.reduce((s, m) => s + Math.round(m.calories * (m.oilMultiplier || 1)), 0)} kcal
                </span>
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-border ml-2.5">
                {group.meals.map((meal) => (
                  <div key={meal.id} className="bg-card rounded-2xl px-4 py-3.5 shadow-card ml-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{meal.name}</p>
                        {meal.oilMultiplier && meal.oilMultiplier > 1 && (
                          <span className="text-[10px] gradient-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                            油度 {meal.oilMultiplier}x
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-sm tabular-nums text-primary">
                        {Math.round(meal.calories * (meal.oilMultiplier || 1))}
                        <span className="text-xs font-medium text-muted-foreground ml-0.5">kcal</span>
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(meal.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => setShowOilSlider(meal.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
                          <ChefHat className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(meal.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors">
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    {/* Macro display */}
                    {(meal.protein || meal.carbs || meal.fat) && (
                      <div className="flex gap-3 mt-2">
                        {meal.protein != null && <span className="text-[10px] text-primary font-bold">P {meal.protein}g</span>}
                        {meal.carbs != null && <span className="text-[10px] text-secondary font-bold">C {meal.carbs}g</span>}
                        {meal.fat != null && <span className="text-[10px] text-accent font-bold">F {meal.fat}g</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav onAdd={() => { setEditingMeal(null); setShowAddMeal(true); }} />

      {showOilSlider && (
        <OilSlider
          mealId={showOilSlider}
          onAdjust={(id, mult) => { adjustOil(id, mult); setShowOilSlider(null); }}
          onClose={() => setShowOilSlider(null)}
        />
      )}
      {showAddMeal && (
        <AddMealDialog
          onClose={() => { setShowAddMeal(false); setEditingMeal(null); }}
          onAdd={(meal) => { handleAddMeal(meal); setShowAddMeal(false); }}
          editMeal={editingMeal}
        />
      )}
    </div>
  );
};

export default LogPage;
