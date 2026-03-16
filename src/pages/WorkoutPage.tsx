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
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const fetchShots = useCallback(async () => {
    const { data } = await supabase.from("workout_shots").select("*").order("created_at", { ascending: false });
    if (data) {
      setShots(data);
      setMonthCount(data.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchShots(); }, [user, fetchShots]);

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}.jpg`;
      await supabase.storage.from("workouts").upload(path, selectedFile);
      const { data: { publicUrl } } = supabase.storage.from("workouts").getPublicUrl(path);
      await supabase.from("workout_shots").insert({ user_id: user.id, image_url: publicUrl, caption });
      toast.success("打卡成功！💪");
      setShowUpload(false); setPreview(null); fetchShots();
    } catch (err) {
      toast.error("上传失败");
    } finally { setUploading(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto relative pb-40 overflow-y-auto">
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#1E293B] flex items-center gap-2">
          <Dumbbell className="w-7 h-7 text-[#10B981]" /> 健身频道
        </h1>
      </div>

      <div className="mx-6 mb-6">
         <WorkoutPlanCard />
      </div>

      <div className="mx-6 mb-6 bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-[#10B981]" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase">本月已打卡</p>
          <p className="text-3xl font-black text-[#1E293B]">{monthCount} 次</p>
        </div>
      </div>

      <div className="px-6 mb-8">
        <button onClick={() => setShowUpload(true)}
          className="w-full h-16 bg-gradient-to-r from-[#10B981] to-[#3B82F6] text-white rounded-[24px] font-black text-sm shadow-lg flex items-center justify-center gap-2">
          <Camera className="w-5 h-5" /> 点击开始今日打卡
        </button>
      </div>

      <div className="px-6">
        <h2 className="font-black text-xs text-slate-400 uppercase mb-4">打卡足迹</h2>
        <div className="columns-2 gap-3 space-y-3">
          {shots.map((s) => (
            <div key={s.id} className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-slate-50">
              {s.image_url && <img src={s.image_url} className="w-full" alt="workout" />}
              <p className="p-2 text-[10px] text-slate-600 font-bold">{s.caption || "运动打卡"}</p>
            </div>
          ))}
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
           <div className="bg-white w-full rounded-[32px] p-6">
              <input type="file" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setSelectedFile(file); setPreview(URL.createObjectURL(file)); }
              }} />
              {preview && <img src={preview} className="w-full h-40 object-cover rounded-2xl my-4" />}
              <button onClick={handleUpload} disabled={uploading} className="w-full bg-[#10B981] text-white py-4 rounded-2xl font-bold">
                {uploading ? "正在上传..." : "确认发布"}
              </button>
              <button onClick={() => setShowUpload(false)} className="w-full mt-2 text-slate-400 text-sm">取消</button>
           </div>
        </div>
      )}

      <BottomNav onAdd={() => navigate("/")} />
    </div>
  );
};

export default WorkoutPage;
