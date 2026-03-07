import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import CalorieDashboard from "@/components/CalorieDashboard";
import AICoach from "@/components/AICoach";
import MealLog, { type Meal } from "@/components/MealLog";
import BottomNav from "@/components/BottomNav";
import OilSlider from "@/components/OilSlider";
import WeightInput from "@/components/WeightInput";
import DataView from "@/components/DataView";
import AddMealDialog from "@/components/AddMealDialog";
import { toast } from "sonner";

const DEFAULT_TARGET = 1800;

const initialMeals: Meal[] = [
  { id: "1", type: "早餐", name: "煎蛋吐司 + 牛奶", calories: 350 },
  { id: "2", type: "午餐", name: "外卖鸡肉饭", calories: 600, oilMultiplier: 1.3 },
];

// Generate mock historical records for demo
const generateMockRecords = () => {
  const records: Array<{ date: string; calories: number; weight?: number; meals: Meal[] }> = [];
  const today = new Date();
  for (let i = 30; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const cal = Math.round(1400 + Math.random() * 800);
    const w = +(68.5 - i * 0.03 + Math.random() * 0.4).toFixed(1);
    records.push({
      date: dateStr,
      calories: cal,
      weight: w,
      meals: [
        { id: `${i}-1`, type: "早餐", name: "早餐", calories: Math.round(cal * 0.25) },
        { id: `${i}-2`, type: "午餐", name: "午餐", calories: Math.round(cal * 0.4) },
        { id: `${i}-3`, type: "晚餐", name: "晚餐", calories: Math.round(cal * 0.35) },
      ],
    });
  }
  return records;
};

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
  const [targetCalories, setTargetCalories] = useState(DEFAULT_TARGET);
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [showOilSlider, setShowOilSlider] = useState<string | null>(null);
  const [showDataView, setShowDataView] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [historicalRecords] = useState(generateMockRecords);

  const totalConsumed = meals.reduce(
    (sum, m) => sum + Math.round(m.calories * (m.oilMultiplier || 1)),
    0
  );

  // Build today's record for data view
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const allRecords = [
    ...historicalRecords,
    { date: todayStr, calories: totalConsumed, weight: todayWeight ?? undefined, meals },
  ];

  const handleAddMeal = (meal: { type: string; name: string; calories: number }) => {
    if (editingMeal) {
      setMeals((prev) =>
        prev.map((m) => (m.id === editingMeal.id ? { ...m, ...meal } : m))
      );
      setEditingMeal(null);
      toast.success("已更新记录");
    } else {
      const newMeal: Meal = { id: Date.now().toString(), ...meal };
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
      <CalorieDashboard consumed={totalConsumed} target={targetCalories} onTargetChange={setTargetCalories} />
      <WeightInput todayWeight={todayWeight} onSave={setTodayWeight} />
      <AICoach message={getCoachMessage(totalConsumed, targetCalories, meals)} />
      <MealLog meals={meals} onEdit={handleEdit} onOilCalibrate={(id) => setShowOilSlider(id)} />

      <BottomNav
        onAddPhoto={() => { setEditingMeal(null); setShowAddMeal(true); }}
        onVoice={() => toast.info("语音补录功能需要连接 AI 服务后启用")}
        onStats={() => setShowDataView(true)}
      />

      {showOilSlider && (
        <OilSlider
          mealId={showOilSlider}
          onAdjust={handleOilAdjust}
          onClose={() => setShowOilSlider(null)}
        />
      )}
      {showDataView && (
        <DataView
          onClose={() => setShowDataView(false)}
          target={targetCalories}
          records={allRecords}
        />
      )}
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
