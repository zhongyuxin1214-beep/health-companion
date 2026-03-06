import { Mic, Camera, BarChart3 } from "lucide-react";

interface BottomNavProps {
  onAddPhoto: () => void;
  onVoice: () => void;
  onStats: () => void;
}

const BottomNav = ({ onAddPhoto, onVoice, onStats }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/80 backdrop-blur-xl border-t border-border px-6 py-3 flex items-center justify-around z-40">
      <button
        onClick={onVoice}
        className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
          <Mic className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-semibold">语音补录</span>
      </button>

      <button
        onClick={onAddPhoto}
        className="flex flex-col items-center gap-1 -mt-6"
      >
        <div className="w-16 h-16 rounded-full gradient-teal flex items-center justify-center shadow-glow-teal border-4 border-background">
          <Camera className="w-7 h-7 text-secondary-foreground" />
        </div>
        <span className="text-[10px] font-bold text-secondary">拍照识别</span>
      </button>

      <button
        onClick={onStats}
        className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
          <BarChart3 className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-semibold">统计</span>
      </button>
    </nav>
  );
};

export default BottomNav;
