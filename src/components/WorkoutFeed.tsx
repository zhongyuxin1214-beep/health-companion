import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Camera, X, Loader2, MapPin, Heart } from "lucide-react";

interface WorkoutShot {
  id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string | null;
  user_id: string | null;
}

const WorkoutFeed = () => {
  const { user } = useAuth();
  const [shots, setShots] = useState<WorkoutShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchShots = async () => {
    const { data } = await supabase
      .from("workout_shots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setShots(data);
    setLoading(false);
  };

  useEffect(() => { fetchShots(); }, []);

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
      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("workouts").upload(path, selectedFile);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("workouts").getPublicUrl(path);

      const { error: insertErr } = await supabase.from("workout_shots").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: caption || null,
      });
      if (insertErr) throw insertErr;

      toast.success("打卡成功！💪");
      setShowUpload(false);
      setCaption("");
      setPreview(null);
      setSelectedFile(null);
      fetchShots();
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="mx-4 mt-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-base text-foreground">🏋️ 健身打卡</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow-glow-pink flex items-center gap-1.5"
        >
          <Camera className="w-3.5 h-3.5" /> 打卡
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : shots.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground text-sm shadow-card">
          还没有打卡记录，拍张照开始吧！📸
        </div>
      ) : (
        <div className="columns-2 gap-3 space-y-3">
          {shots.map((shot) => (
            <div key={shot.id} className="break-inside-avoid bg-card rounded-2xl overflow-hidden shadow-card">
              {shot.image_url && (
                <img src={shot.image_url} alt="workout" className="w-full object-cover" loading="lazy" />
              )}
              <div className="p-3">
                {shot.caption && (
                  <p className="text-xs text-foreground font-medium mb-1.5">{shot.caption}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{formatTime(shot.created_at)}</span>
                  <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      {showUpload && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowUpload(false)}>
          <div className="bg-card w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-foreground">健身打卡</h3>
              <button onClick={() => setShowUpload(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {preview ? (
              <div className="relative rounded-2xl overflow-hidden mb-4">
                <img src={preview} alt="preview" className="w-full max-h-64 object-cover" />
                <button onClick={() => { setPreview(null); setSelectedFile(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/70 flex items-center justify-center">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-secondary/40 bg-secondary/5 p-8 flex flex-col items-center gap-2 mb-4 hover:border-secondary/70 transition-colors">
                <Camera className="w-8 h-8 text-secondary" />
                <p className="text-sm font-bold text-foreground">拍照 / 选择照片</p>
              </button>
            )}

            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="记录一下今天的运动..."
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring mb-4"
            />

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full gradient-teal text-secondary-foreground py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50 shadow-glow-teal"
            >
              {uploading ? "上传中..." : "发布打卡 💪"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutFeed;
