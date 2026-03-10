import { Pencil, ChefHat } from "lucide-react";

export interface Meal {
  id: string;
  type: string;
  name: string;
  calories: number;
  oilMultiplier?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface MealLogProps {
  meals: Meal[];
  onEdit: (id: string) => void;
  onOilCalibrate: (id: string) => void;
}

const mealTypeEmoji: Record<string, string> = {
  "早餐": "🌅",
  "午餐": "☀️",
  "晚餐": "🌙",
  "加餐": "🍪",
};

const MealLog = ({ meals, onEdit, onOilCalibrate }: MealLogProps) => {
  return (
    <div className="mx-4 mt-4">
      <h2 className="font-bold text-base mb-3 text-foreground">今日饮食记录</h2>
      <div className="space-y-2.5">
        {meals.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground text-sm shadow-card">
            还没有记录，点击下方按钮开始添加 🍽️
          </div>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="bg-card rounded-2xl px-4 py-3.5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                  {mealTypeEmoji[meal.type] || "🍽️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-semibold">{meal.type}</span>
                    {meal.oilMultiplier && meal.oilMultiplier > 1 && (
                      <span className="text-xs gradient-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                        {meal.oilMultiplier}x
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate text-foreground">{meal.name}</p>
                </div>
                <span className="font-extrabold text-sm tabular-nums text-primary">
                  {Math.round(meal.calories * (meal.oilMultiplier || 1))}
                  <span className="text-xs font-medium text-muted-foreground ml-0.5">kcal</span>
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onEdit(meal.id)}
                    className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => onOilCalibrate(meal.id)}
                    className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <ChefHat className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {/* Macro bar */}
              {(meal.protein || meal.carbs || meal.fat) && (
                <div className="flex gap-3 mt-2 ml-[52px]">
                  {meal.protein != null && <span className="text-[10px] text-primary font-bold">P {meal.protein}g</span>}
                  {meal.carbs != null && <span className="text-[10px] text-secondary font-bold">C {meal.carbs}g</span>}
                  {meal.fat != null && <span className="text-[10px] text-accent font-bold">F {meal.fat}g</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MealLog;
