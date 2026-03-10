import { useMemo, useRef, useState } from "react";
import { Flame, Bell, Search, Sparkles, Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AppHeaderProps {
  name: string;
  streak: number;
  onAITextSubmit?: (text: string) => void;
}

const AppHeader = ({ name, streak, onAITextSubmit }: AppHeaderProps) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiText, setAiText] = useState("");

  const today = new Date();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  const avatarUrl = useMemo(() => {
    const metaUrl = (user as any)?.user_metadata?.avatar_url as string | undefined;
    return metaUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  }, [user, name]);

  const handleAvatarFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const dismiss = toast.loading("正在上传头像...");
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("无法获取头像链接");

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      toast.success("头像已更新");
    } catch (e: any) {
      toast.error(e?.message || "头像上传失败");
    } finally {
      dismiss();
    }
  };

  return (
    <header className="relative overflow-hidden bg-[#F8FAFC]">
      {/* 顶部主题渐变区域 */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] px-6 pt-8 pb-16 relative">
        {/* 背景装饰圆圈 */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        {/* 顶部：头像左上角 + 通知右上角 */}
        <div className="flex items-start justify-between relative z-10 mb-6">
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-12 h-12 rounded-[32px] bg-white/25 border border-white/40 backdrop-blur-md overflow-hidden shadow-elevated"
              aria-label="上传头像"
            >
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center border border-white">
                <Camera className="w-3.5 h-3.5 text-slate-700" />
              </div>
            </button>
            <div className="pt-1">
              <p className="text-white/80 text-[10px] font-bold tracking-widest uppercase">{dateStr}</p>
              <h1 className="text-xl font-black text-white leading-tight">Hi, {name}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 连胜天数 - 更加生动 */}
            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Flame className="w-4 h-4 text-orange-300 animate-pulse" strokeWidth={2.5} />
              <span className="text-white font-black text-sm">{streak}</span>
            </div>
            {/* 通知铃铛 */}
            <button className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
              <Bell className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 标题：What are you craving today 风格 */}
        <div className="relative z-10 mb-4">
          <p className="text-white/90 text-lg font-extrabold leading-tight">
            今天想吃点什么？
          </p>
          <p className="text-white/70 text-xs font-semibold mt-1">
            直接输入一句话，回车让 AI 帮你解析并准备记录
          </p>
        </div>
      </div>

      {/* AI 录入入口 - 悬浮在渐变层边缘 */}
      <div className="px-6 -mt-8 relative z-20">
        <div className="relative group shadow-2xl rounded-3xl overflow-hidden">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
          </div>
          <input 
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const text = aiText.trim();
              if (!text) return;
              onAITextSubmit?.(text);
              setAiText("");
            }}
            placeholder="比如：我吃了一个牛肉汉堡和一杯拿铁" 
            className="w-full py-5 pl-14 pr-14 bg-white border-none rounded-[32px] text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none shadow-[0_20px_50px_rgba(0,0,0,0.10)]"
          />
          {/* 渐变微光按钮 */}
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] flex items-center justify-center shadow-elevated transform group-hover:rotate-12 transition-all duration-300">
              <Sparkles className="w-5 h-5 text-white" fill="white" />
            </div>
          </div>
        </div>
      </div>

      {/* 底部凹形曲线 - 让头部与内容过渡更平滑 */}
      <div className="h-6 w-full bg-[#F8FAFC]"></div>
    </header>
  );
};

export default AppHeader;
