import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

const options = [
  { key: "energetic", emoji: "🔥", label: "活力满满", desc: "准备好挑战高强度" },
  { key: "normal", emoji: "😐", label: "一般般", desc: "正常训练没问题" },
  { key: "tired", emoji: "😴", label: "有点累", desc: "今天温和一些" },
] as const;

type EnergyLevel = (typeof options)[number]["key"];

interface Props {
  onComplete: (level: EnergyLevel) => void;
}

const MorningCheckIn = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSelect = async (level: EnergyLevel) => {
    if (!user || saving) return;
    setSaving(true);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Upsert energy_level into daily_recommendations
    const { data: existing } = await supabase
      .from("daily_recommendations")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("daily_recommendations")
        .update({ energy_level: level })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("daily_recommendations")
        .insert({ user_id: user.id, date: todayStr, energy_level: level });
    }

    onComplete(level);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 px-6">
      <div className="w-full max-w-sm bg-card rounded-[32px] p-8 shadow-elevated mindful-border animate-in zoom-in-95 duration-400">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-muted rounded-[24px] flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">☀️</span>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">早安！今天感觉如何？</h2>
          <p className="text-sm text-muted-foreground">深呼吸，感受一下现在的身体状态</p>
        </div>
        <div className="space-y-4">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              disabled={saving}
              className="w-full flex items-center gap-5 bg-muted hover:bg-white border border-transparent hover:border-border rounded-[24px] px-6 py-5 transition-all mindful-interaction disabled:opacity-50 shadow-sm"
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div className="text-left">
                <p className="font-bold text-base text-foreground">{opt.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MorningCheckIn;
