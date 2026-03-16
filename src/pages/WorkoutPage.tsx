import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Camera, X, Loader2, Dumbbell, Trophy, GitCompareArrows, Check } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WorkoutPlanCard from "@/components/WorkoutPlanCard";
import { useNavigate } from "react-router-dom";

interface WorkoutShot {
  id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string | null;
  user_id: string | null;
}

const addWatermark = (file: File, dayCount: number, weight: number | null): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);
      const line1 = `第 ${dayCount} 天打卡`;
      const line2 = weight ? `今日体重：${weight} kg` : "";
      const fontSize = Math.max(16, Math.floor(img.width / 28));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const padding = fontSize * 0.8;
      const lineHeight = fontSize * 1.4;
      const lines = line2 ? [line1, line2] : [line1];
      const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const boxW = maxW + padding * 2;
      const boxH = lines.length * lineHeight + padding * 1.2;
      const x = img.width - boxW - fontSize * 0.5;
      const y = img.height - boxH - fontSize * 0.5;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, fontSize * 0.4);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillText(line, x + padding, y + padding * 0.6 + i * lineHeight);
      });
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/jpeg", 0.9);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

const WorkoutPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [shots, setShots] = useState<WorkoutShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [monthCount, setMonthCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const fetchShots = useCallback(async () => {
    const { data } = await supabase
      .from("workout_shots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setShots(data);
      setTotalCount(data.length);
      const now = new Date();
      setMonthCount(data.filter((s) => {
        if (!s.created_at) return false;
        const d = new Date(s.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchShots(); }, [fetchShots]);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    try {
      const dayCount = totalCount + 1;
      const watermarked = await addWatermark(selectedFile, dayCount, profile?.weight ?? null);
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from("workouts").upload(path, watermarked, { contentType: "image/jpeg" });
      if (uploadErr) {
        if (uploadErr.message?.includes("not found")) throw new Error("上传失败：请检查 Storage Bucket 'workouts' 是否已创建");
        throw uploadErr;
      }
      const { data: { publicUrl } } = supabase.storage.from("workouts").getPublicUrl(path);
      const { error: insertErr } = await supabase.from("workout_shots").insert({ user_id: user.id, image_url: publicUrl, caption: caption || null });
      if (insertErr) throw insertErr;
      toast.success("打卡成功！💪");
      setShowUpload(false); setCaption(""); setPreview(null); setSelectedFile(null);
      fetchShots();
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally { setUploading(false); }
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      const next = [...prev, id];
      if (next.length === 2) setTimeout(() => setShowCompare(true), 200);
      return next;
    });
  };

  const compareShots = selected.map((id) => shots.find((s) => s.id === id)).filter(Boolean) as WorkoutShot[];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1E293B] flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-secondary" /> 健身频道
        </h1>
        {shots.length >= 2 && (
          <button onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
              compareMode ? "bg-secondary text-secondary-foreground" : "bg-muted text-[#1E293B]"
            }`}>
            <GitCompareArrows className="w-3.5 h-3.5" />
            {compareMode ? "退出对比" : "身材对比"}
          </button>
        )}
      </div>

      {/* Workout Plan Card at top */}
      <WorkoutPlanCard />

      {/* Stats card */}
      <div className="mx-4 mt-4 mb-4 bg-card rounded-[24px] p-5 shadow-card-lg border border-border flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl gradient-teal flex items-center justify-center shadow-glow-teal">
          <Trophy className="w-7 h-7 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-[#1E293B]/70 font-medium">本月打卡</p>
          <p className="text-3xl font-extrabold text-[#1E293B] tabular-nums">
            {monthCount} <span className="text-sm font-semibold text-[#1E293B]/60">次</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#1E293B]/70 font-medium">累计</p>
          <p className="text-xl font-extrabold text-[#1E293B] tabular-nums">{totalCount}</p>
        </div>
      </div>

      {compareMode && (
        <div className="mx-4 mb-3 bg-accent/10 rounded-xl px-4 py-2.5 text-xs text-[#1E293B]/70 font-medium">
          请选择 2 张照片进行身材对比 ({selected.length}/2)
        </div>
      )}

      {!compareMode && (
        <div className="mx-4 mb-6">
          <button onClick={() => setShowUpload(true)}
            className="w-full gradient-primary text-primary-foreground py-4 rounded-[24px] font-bold text-base shadow-glow-pink flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Camera className="w-5 h-5" /> 拍照打卡
          </button>
        </div>
      )}

      <div className="mx-4">
        <h2 className="font-bold text-sm text-[#1E293B] mb-3">📸 打卡记录</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : shots.length === 0 ? (
          <div className="bg-card rounded-[24px] p-10 text-center shadow-card border border-border">
            <div className="text-5xl mb-4">🏋️‍♀️</div>
            <p className="font-bold text-[#1E293B] mb-1">虚位以待</p>
            <p className="text-sm text-[#1E293B]/70">拍下你的第一张健身照</p>
          </div>
        ) : (
          <div className="columns-2 gap-3 space-y-3">
            {shots.map((shot) => {
              const isSelected = selected.includes(shot.id);
              return (
                <div key={shot.id}
                  className={`break-inside-avoid bg-card rounded-[20px] overflow-hidden shadow-card border border-border relative transition-all ${compareMode ? "cursor-pointer" : ""} ${isSelected ? "ring-2 ring-secondary" : ""}`}
                  onClick={() => compareMode && toggleSelect(shot.id)}>
                  {compareMode && isSelected && (
                    <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                      <Check className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                  {shot.image_url && <img src={shot.image_url} alt="workout" className="w-full object-cover" loading="lazy" />}
                  <div className="p-3">
                    {shot.caption && <p className="text-xs text-[#1E293B] font-medium mb-1.5">{shot.caption}</p>}
                    <span className="text-[10px] text-[#1E293B]/60">{formatTime(shot.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      {showUpload && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowUpload(false)}>
          <div className="bg-card w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-[#1E293B]">健身打卡</h3>
              <button onClick={() => { setShowUpload(false); setPreview(null); setSelectedFile(null); setCaption(""); }} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-[#1E293B]/60" />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {preview ? (
              <>
                <div className="relative rounded-[20px] overflow-hidden mb-4">
                  <img src={preview} alt="preview" className="w-full max-h-64 object-cover" />
                  <button onClick={() => { setPreview(null); setSelectedFile(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/70 flex items-center justify-center">
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="写下今日感受...（选填）" rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-[#1E293B] placeholder:text-[#1E293B]/40 focus:outline-none focus:ring-2 focus:ring-ring mb-4 resize-none" />
                <button onClick={handleUpload} disabled={uploading}
                  className="w-full gradient-teal text-secondary-foreground py-3.5 rounded-[24px] font-bold text-sm disabled:opacity-50 shadow-glow-teal active:scale-95 transition-transform">
                  {uploading ? "正在添加水印并上传..." : "确认发布 💪"}
                </button>
              </>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-secondary/40 bg-secondary/5 p-10 flex flex-col items-center gap-2 hover:border-secondary/70 transition-colors">
                <Camera className="w-10 h-10 text-secondary" />
                <p className="text-sm font-bold text-[#1E293B]">拍照 / 选择照片</p>
                <p className="text-xs text-[#1E293B]/60">选择后可预览并填写感受</p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compare Dialog */}
      {showCompare && compareShots.length === 2 && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col" onClick={() => { setShowCompare(false); setSelected([]); setCompareMode(false); }}>
          <div className="flex items-center justify-between px-4 pt-12 pb-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-[#1E293B]">身材对比</h3>
            <button onClick={() => { setShowCompare(false); setSelected([]); setCompareMode(false); }}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X className="w-4 h-4 text-[#1E293B]/60" />
            </button>
          </div>
          <div className="flex-1 flex items-center px-2 gap-2" onClick={(e) => e.stopPropagation()}>
            {compareShots.map((shot) => (
              <div key={shot.id} className="flex-1 flex flex-col items-center">
                {shot.image_url && <img src={shot.image_url} alt="compare" className="w-full rounded-[20px] object-cover max-h-[60vh]" />}
                <span className="text-xs text-[#1E293B]/60 mt-2 font-medium">{formatTime(shot.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default WorkoutPage;
