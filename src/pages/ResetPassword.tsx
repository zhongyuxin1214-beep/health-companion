import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("新密码至少 6 位");
      return;
    }
    if (password !== confirm) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("密码已更新，请使用新密码登录");
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "重置密码失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm bg-card rounded-[32px] p-6 shadow-card-lg mindful-border">
        <h1 className="text-xl font-extrabold text-foreground mb-2 text-center">设置新密码</h1>
        <p className="text-xs text-muted-foreground text-center mb-6">
          这是一个安全页面，请为你的 MindfulFit 账户设置一个全新的密码。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1 ml-1">新密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="至少 6 位"
              className="w-full px-4 py-3 rounded-[24px] bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-mindful"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 ml-1">确认新密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              placeholder="再次输入新密码"
              className="w-full px-4 py-3 rounded-[24px] bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-mindful"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full gradient-mindful text-primary-foreground py-3 rounded-[24px] font-bold disabled:opacity-50 shadow-glow-blue mindful-interaction mt-2"
          >
            {submitting ? "正在更新..." : "确认修改密码"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

