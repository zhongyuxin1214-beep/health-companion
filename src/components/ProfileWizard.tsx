import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Ruler, User, Percent, Dumbbell, TrendingDown, ChevronRight, ChevronLeft, Calendar, Activity } from "lucide-react";

interface ProfileWizardProps {
  onComplete: () => void;
}

const activityOptions = [
  { value: "sedentary", label: "静养模式", desc: "主要时间久坐，很少运动", emoji: "🧘‍♀️" },
  { value: "light", label: "温和模式", desc: "每周轻度运动1-3次", emoji: "🚶‍♀️" },
  { value: "moderate", label: "活力模式", desc: "每周适度运动3-5次", emoji: "🏃‍♀️" },
  { value: "active", label: "元气模式", desc: "每周高频运动6-7次", emoji: "💪" },
];

const steps = ["身高", "体重", "活动水平", "健身频率", "减重目标"];

const ProfileWizard = ({ onComplete }: ProfileWizardProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [activity, setActivity] = useState("light");
  const [workoutFreq, setWorkoutFreq] = useState(3);
  const [lossSpeed, setLossSpeed] = useState("0.5");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        height: parseFloat(height) || null,
        weight: parseFloat(weight) || null,
        body_fat: parseFloat(bodyFat) || null,
        activity_level: activity,
        workout_frequency: workoutFreq,
        weight_loss_speed: parseFloat(lossSpeed),
      });
      if (error) throw error;
      toast.success("身体档案已保存！");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!height;
    if (step === 1) return !!weight;
    return true;
  };

  const stepIcons = [Ruler, User, Activity, Calendar, TrendingDown];

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center px-6">
      <div className="bg-card w-full max-w-md rounded-[32px] p-8 shadow-elevated mindful-border">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= step ? "gradient-mindful" : "bg-muted"}`} />
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {(() => { 
            const Icon = stepIcons[step]; 
            return (
              <div className="w-14 h-14 rounded-[24px] gradient-mindful flex items-center justify-center shadow-glow-blue">
                <Icon className="w-7 h-7 text-primary-foreground" strokeWidth={1.5} />
              </div>
            ); 
          })()}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-1">步骤 {step + 1} / {steps.length}</p>
            <h3 className="text-xl font-bold text-foreground">{steps[step]}</h3>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-foreground mb-2">你的身高是多少？</h4>
              <p className="text-sm text-muted-foreground">这将帮助我们计算你的个人目标</p>
            </div>
            <div>
              <input 
                type="number" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)} 
                placeholder="170"
                className="w-full px-6 py-5 rounded-[24px] bg-muted text-center text-2xl font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-mindful mindful-border" 
                autoFocus 
              />
              <p className="text-center text-sm text-muted-foreground mt-2">厘米 (cm)</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-foreground mb-2">你的体重是多少？</h4>
              <p className="text-sm text-muted-foreground">我们会为你制定专属计划</p>
            </div>
            <div className="space-y-4">
              <div>
                <input 
                  type="number" 
                  step="0.1" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                  placeholder="68.5"
                  className="w-full px-6 py-5 rounded-[24px] bg-muted text-center text-2xl font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-mindful mindful-border" 
                  autoFocus 
                />
                <p className="text-center text-sm text-muted-foreground mt-2">公斤 (kg)</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-semibold mb-2 block text-center">
                  体脂率 <span className="text-muted-foreground/60">（选填）</span>
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={bodyFat} 
                    onChange={(e) => setBodyFat(e.target.value)} 
                    placeholder="22.5"
                    className="w-full px-6 py-4 rounded-[24px] bg-muted text-center text-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-mindful mindful-border" 
                  />
                  <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-foreground mb-2">你的活动水平如何？</h4>
              <p className="text-sm text-muted-foreground">选择最符合你日常状态的选项</p>
            </div>
            <div className="space-y-3">
              {activityOptions.map((opt) => (
                <button 
                  key={opt.value} 
                  onClick={() => setActivity(opt.value)}
                  className={`w-full text-left px-6 py-5 rounded-[24px] transition-all mindful-interaction ${
                    activity === opt.value ? "gradient-mindful text-primary-foreground shadow-glow-blue" : "bg-muted text-foreground hover:bg-border mindful-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className="font-bold text-base">{opt.label}</p>
                      <p className={`text-sm mt-0.5 ${activity === opt.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-foreground mb-2">每周计划健身几天？</h4>
              <p className="text-sm text-muted-foreground">选择一个可持续的频率</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button 
                  key={n} 
                  onClick={() => setWorkoutFreq(n)}
                  className={`aspect-square rounded-[20px] font-bold text-xl transition-all mindful-interaction ${
                    workoutFreq === n ? "gradient-mindful text-primary-foreground shadow-glow-blue" : "bg-muted text-foreground hover:bg-border mindful-border"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {workoutFreq <= 2 ? "🌱 稳步开始，循序渐进" : workoutFreq <= 4 ? "💪 黄金频率，推荐！" : workoutFreq <= 5 ? "🔥 高频训练，注意恢复" : "⚡ 运动达人，记得休息日"}
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-foreground mb-2">每周目标减重多少？</h4>
              <p className="text-sm text-muted-foreground">选择健康可持续的速度</p>
            </div>
            <div className="space-y-3">
              {["0.2", "0.5", "0.75", "1.0"].map((speed) => (
                <button 
                  key={speed} 
                  onClick={() => setLossSpeed(speed)}
                  className={`w-full text-left px-6 py-5 rounded-[24px] transition-all mindful-interaction ${
                    lossSpeed === speed ? "gradient-mindful text-primary-foreground shadow-glow-blue" : "bg-muted text-foreground hover:bg-border mindful-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-base">{speed} kg / 周</p>
                      <p className={`text-sm mt-0.5 ${lossSpeed === speed ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {speed === "0.2" ? "温和减重" : speed === "0.5" ? "推荐速度" : speed === "0.75" ? "较快减重" : "极速减重"}
                      </p>
                    </div>
                    <span className="text-2xl">
                      {speed === "0.2" ? "🐢" : speed === "0.5" ? "⭐" : speed === "0.75" ? "🚀" : "⚡"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 rounded-[24px] bg-muted text-muted-foreground font-bold flex items-center justify-center gap-2 mindful-interaction"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> 上一步
            </button>
          )}
          {step < steps.length - 1 ? (
            <button 
              onClick={() => canNext() && setStep(step + 1)} 
              disabled={!canNext()}
              className="flex-1 gradient-mindful text-primary-foreground py-4 rounded-[24px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow-blue mindful-interaction"
            >
              下一步 <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 gradient-mindful text-primary-foreground py-4 rounded-[24px] font-bold disabled:opacity-50 shadow-glow-blue mindful-interaction"
            >
              {saving ? "保存中..." : "完成设置 🎉"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileWizard;
