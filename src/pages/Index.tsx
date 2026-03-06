import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import CalorieDashboard from "@/components/CalorieDashboard";
import AICoach from "@/components/AICoach";
import MealLog, { type Meal } from "@/components/MealLog";
import BottomNav from "@/components/BottomNav";
import OilSlider from "@/components/OilSlider";
import TrendChart from "@/components/TrendChart";
import AddMealDialog from "@/components/AddMealDialog";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

const TARGET_CALORIES = 1800;

const initialMeals: Meal[] = [
  { id: "1", type: "早餐", name: "煎蛋吐司 + 牛奶", calories: 350 },
  { id: "2", type: "午餐", name: "外卖鸡肉饭", calories: 600, oilMultiplier: 1.3 },
];

const getCoachMessage = (consumed: number, target: number, _meals: Meal[]) => {
  const remaining = target - consumed;
  if (consumed === 0) return "新的一天开始了！记得记录每一餐，精确控卡从早餐开始 💪";
  if (remaining < 0) return `今日已超标 ${Math.abs(remaining)} kcal。建议下一餐以蔬菜沙拉为主，或增加30分钟有氧运动来平衡。`;
  if (remaining < 300) return `剩余额度仅 ${remaining} kcal，晚餐建议选择清蒸鱼或蔬菜汤，避免油炸食品。`;
  if (remaining < 600) return "晚餐推荐：清蒸鲈鱼+时蔬（约300kcal）。今日油脂摄入略高，建议晚餐清淡为主。";
  return "今日热量控制良好！可以正常安排晚餐，建议蛋白质为主搭配粗粮。";
};

const Index = () => {
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [showOilSlider, setShowOilSlider] = useState<string | null>(null);
  const [showTrend, setShowTrend] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const totalConsumed = meals.reduce(
    (sum, m) => sum + Math.round(m.calories * (m.oilMultiplier || 1)),
    0
  );

  const handleAddMeal = (meal: { type: string; name: string; calories: number }) => {
    if (editingMeal) {
      setMeals((prev) =>
        prev.map((m) => (m.id === editingMeal.id ? { ...m, ...meal } : m))
      );
      setEditingMeal(null);
      toast.success("已更新记录");
    } else {
      const newMeal: Meal = {
        id: Date.now().toString(),
        ...meal,
      };
      setMeals((prev) => [...prev, newMeal]);
      toast.success("已添加记录");
    }
  };

  const handleEdit = (id: string) => {
    const meal = meals.find((m) => m.id === id);
    if (meal) {
      setEditingMeal(meal);
      setShowAddMeal(true);
    }
  };

  const handleOilAdjust = (mealId: string, multiplier: number) => {
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, oilMultiplier: multiplier } : m))
    );
    toast.success(`油度已校准为 ${multiplier}x`);
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-28">
      <AppHeader name="Elizabeth" streak={12} />
      <CalorieDashboard consumed={totalConsumed} target={TARGET_CALORIES} />
      <AICoach message={getCoachMessage(totalConsumed, TARGET_CALORIES, meals)} />
      <MealLog meals={meals} onEdit={handleEdit} onOilCalibrate={(id) => setShowOilSlider(id)} />

      <button
        onClick={() => setShowTrend(true)}
        className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card text-muted-foreground text-sm font-bold hover:bg-muted transition-colors shadow-card"
      >
        <TrendingUp className="w-4 h-4 text-secondary" />
        查看周/月趋势图
      </button>

      <BottomNav
        onAddPhoto={() => { setEditingMeal(null); setShowAddMeal(true); }}
        onVoice={() => toast.info("语音补录功能需要连接 AI 服务后启用")}
        onStats={() => setShowTrend(true)}
      />

      {showOilSlider && (
        <OilSlider
          mealId={showOilSlider}
          onAdjust={handleOilAdjust}
          onClose={() => setShowOilSlider(null)}
        />
      )}
      {showTrend && <TrendChart onClose={() => setShowTrend(false)} />}
      {showAddMeal && (
        <AddMealDialog
          onClose={() => { setShowAddMeal(false); setEditingMeal(null); }}
          onAdd={handleAddMeal}
          editMeal={editingMeal}
        />
      )}
    </div>
  );
};

export default Index;
