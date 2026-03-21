import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const PantryManager = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string; ingredient_name: string }[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("user_pantry")
        .select("id, ingredient_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setItems([]);
        toast.error(error.message);
        return;
      }
      setItems(data ?? []);
    };
    fetch();
  }, [user]);

  const addItem = async () => {
    if (!user || !newItem.trim()) return;
    const name = newItem.trim();
    if (items.some((i) => i.ingredient_name === name)) {
      toast.error("食材已存在");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_pantry")
      .insert({ user_id: user.id, ingredient_name: name })
      .select("id, ingredient_name")
      .single();
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data) setItems((prev) => [data, ...prev]);
    setNewItem("");
    setLoading(false);
    toast.success(`已添加「${name}」`);
  };

  const removeItem = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_pantry")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Package className="w-3.5 h-3.5" />
        食材箱 ({items.length})
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-muted rounded-xl space-y-2">
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="添加食材（如：鸡胸肉）"
              className="flex-1 px-3 py-1.5 rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <button
              onClick={addItem}
              disabled={loading || !newItem.trim()}
              className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-secondary-foreground" />
            </button>
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 bg-background px-2.5 py-1 rounded-lg text-xs font-medium text-foreground"
                >
                  🥬 {item.ingredient_name}
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {items.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-1">添加食材后，AI 会优先用它们生成食谱</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PantryManager;
