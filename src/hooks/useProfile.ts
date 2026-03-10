import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  height: number | null;
  weight: number | null;
  body_fat: number | null;
  activity_level: string | null;
  weight_loss_speed: number | null;
  workout_frequency: number | null;
}

const activityFactors: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const calculateTDEE = (profile: Profile): number => {
  if (!profile.weight || !profile.height) return 1800;

  let bmr: number;
  if (profile.body_fat) {
    const lbm = profile.weight * (1 - profile.body_fat / 100);
    bmr = 370 + 21.6 * lbm;
  } else {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * 30 - 161;
  }

  const factor = activityFactors[profile.activity_level || "light"] || 1.375;
  const dailyDeficit = ((profile.weight_loss_speed || 0.5) * 7700) / 7;

  return Math.max(1200, Math.round(bmr * factor - dailyDeficit));
};

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data && data.height && data.weight) {
      setProfile({
        height: data.height,
        weight: data.weight,
        body_fat: data.body_fat,
        activity_level: data.activity_level,
        weight_loss_speed: data.weight_loss_speed,
        workout_frequency: (data as any).workout_frequency ?? 3,
      });
      setHasProfile(true);
    } else {
      setHasProfile(false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const tdee = profile ? calculateTDEE(profile) : 1800;

  return { profile, loading, hasProfile, tdee, refetch: fetchProfile };
};
