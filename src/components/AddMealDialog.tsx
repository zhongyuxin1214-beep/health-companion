import { useState } from "react";
import { X, Camera } from "lucide-react";

interface AddMealDialogProps {
  onClose: () => void;
  onAdd: (meal: { type: string; name: string; calories: number }) => void;
  editMeal?: { id: string; type: string; name: string; calories: number } | null;
}

const mealTypes = ["早餐", "午餐", "晚餐", "加餐"];

const AddMealDialog = ({ onClose, onAdd, editMeal }: AddMealDialogProps) => {
  const [type, setType] = useState(editMeal?.type || "早餐");
  const [name, setName] = useState(editMeal?.name || "");
  const [calories, setCalories] = useState(editMeal?.calories?.toString() || "");

  const handleSubmit = () => {
    if (!name || !calories) return;
    onAdd({ type, name, calories: parseInt(calories) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-lg">{editMeal ? "修改记录" : "添加饮食"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">餐食类型</label>
            <div className="flex gap-2">
              {mealTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    type === t ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">食物名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 煎蛋吐司、鸡胸肉沙拉..."
              className="w-full px-4 py-3 rounded-xl bg-muted border-none text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">热量 (kcal)</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="估算热量"
              className="w-full px-4 py-3 rounded-xl bg-muted border-none text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="bg-secondary rounded-xl p-3 flex items-center gap-3">
            <Camera className="w-5 h-5 text-primary" />
            <p className="text-xs text-muted-foreground">拍照识别功能需要连接 AI 服务后启用</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name || !calories}
            className="w-full gradient-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editMeal ? "保存修改" : "添加记录"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMealDialog;
