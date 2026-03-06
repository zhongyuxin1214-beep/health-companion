import { Pencil, ChefHat } from "lucide-react";

export interface Meal {
  id: string;
  type: string;
  name: string;
  calories: number;
  oilMultiplier?: number;
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
      <h2 className="font-semibold text-base mb-3">今日饮食记录</h2>
      <div className="bg-card rounded-2xl shadow-card overflow-hidden divide-y divide-border">
        {meals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            还没有记录，点击下方按钮开始添加 🍽️
          </div>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="flex items-center px-4 py-3.5 gap-3">
              <span className="text-xl">{mealTypeEmoji[meal.type] || "🍽️"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">{meal.type}</span>
                  {meal.oilMultiplier && meal.oilMultiplier > 1 && (
                    <span className="text-xs bg-accent/15 text-accent-foreground px-1.5 py-0.5 rounded-full font-medium">
                      {meal.oilMultiplier}x油
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm truncate">{meal.name}</p>
              </div>
              <span className="font-bold text-sm tabular-nums">
                {Math.round(meal.calories * (meal.oilMultiplier || 1))} kcal
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(meal.id)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => onOilCalibrate(meal.id)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ChefHat className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MealLog;
