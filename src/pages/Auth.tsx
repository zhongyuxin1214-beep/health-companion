import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Brain, Mail, Lock, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // 忘记密码模式：只发送重置邮件
    if (isResetMode) {
      setSubmitting(true);
      try {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (error) throw error;
        toast.success("重置邮件已发送，请检查邮箱中的链接");
      } catch (err: any) {
        toast.error(err.message || "发送重置邮件失败");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!password) return;
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("登录成功！");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("注册成功！请查看邮箱验证链接。");
      }
    } catch (err: any) {
      toast.error(err.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 rounded-[32px] gradient-mindful flex items-center justify-center shadow-glow-blue mb-6">
            <Brain className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">MindfulFit</h1>
          <p className="text-sm text-muted-foreground">让健康成为一种冥想</p>
        </div>

        {/* Tabs */}
        {!isResetMode && (
          <div className="flex gap-3 mb-8 bg-card p-2 rounded-[32px] mindful-border shadow-mindful">
            {[true, false].map((login) => (
              <button
                key={String(login)}
                onClick={() => setIsLogin(login)}
                className={`flex-1 py-3 rounded-[24px] text-sm font-bold transition-all mindful-interaction ${
                  isLogin === login
                    ? "gradient-mindful text-primary-foreground shadow-glow-blue"
                    : "text-muted-foreground"
                }`}
              >
                {login ? "登录" : "注册"}
              </button>
            ))}
          </div>
        )}
        {isResetMode && (
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">重置密码</p>
            <p className="text-xs text-muted-foreground">
              我们会向你的邮箱发送一个重置链接，请通过链接返回后设置新密码。
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱地址"
              className="w-full pl-14 pr-5 py-4 rounded-[32px] bg-card mindful-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-mindful"
              required
            />
          </div>

          {!isResetMode && (
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码 (至少6位)"
                minLength={6}
                className="w-full pl-14 pr-14 py-4 rounded-[32px] bg-card mindful-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-mindful"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-5 top-1/2 -translate-y-1/2">
                {showPw ? <EyeOff className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} /> : <Eye className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />}
              </button>
            </div>
          )}

          {isLogin && !isResetMode && (
            <button
              type="button"
              onClick={() => {
                setIsResetMode(true);
                setPassword("");
              }}
              className="text-xs text-primary font-semibold ml-1"
            >
              忘记密码？
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full gradient-mindful text-primary-foreground py-4 rounded-[32px] font-bold disabled:opacity-50 shadow-glow-blue mindful-interaction mt-6"
          >
            {submitting
              ? "处理中..."
              : isResetMode
                ? "发送重置邮件"
                : isLogin
                  ? "开启冥想之旅 →"
                  : "创建账户 →"}
          </button>
        </form>

        {!isResetMode && (
          <p className="text-xs text-center text-muted-foreground mt-6">
            {isLogin ? "还没有账户？" : "已有账户？"}
            <button onClick={() => setIsLogin(!isLogin)} className="ml-1 text-primary font-semibold">
              {isLogin ? "立即注册" : "立即登录"}
            </button>
          </p>
        )}
        {isResetMode && (
          <p className="text-xs text-center text-muted-foreground mt-6">
            想起密码了？
            <button
              onClick={() => {
                setIsResetMode(false);
                setPassword("");
              }}
              className="ml-1 text-primary font-semibold"
            >
              返回登录
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
