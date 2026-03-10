import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const useDailyWeight = () => {
  const { user } = useAuth();
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchWeight = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("daily_body_logs")
      .select("weight")
      .eq("user_id", user.id)
      .eq("date", todayStr())
      .maybeSingle();

    if (data) {
      setTodayWeight(data.weight);
    } else {
      setTodayWeight(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWeight(); }, [fetchWeight]);

  const saveWeight = async (weight: number) => {
    if (!user) return;
    
    if (todayWeight !== null) {
      // Update existing record
      const { error } = await supabase
        .from("daily_body_logs")
        .update({ weight })
        .eq("user_id", user.id)
        .eq("date", todayStr());
      if (error) {
        toast.error("更新失败");
        return;
      }
      toast.success("体重已更新");
    } else {
      // Insert new record
      const { error } = await supabase.from("daily_body_logs").insert({
        user_id: user.id,
        date: todayStr(),
        weight,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("记录冲突，正在刷新");
          await fetchWeight();
        } else {
          toast.error("保存失败");
        }
        return;
      }
      toast.success("体重已记录");
    }
    setTodayWeight(weight);
    setEditing(false);
  };

  return { todayWeight, loading, editing, setEditing, saveWeight };
};
