import { Mic, Camera, BarChart3 } from "lucide-react";

interface BottomNavProps {
  onAddPhoto: () => void;
  onVoice: () => void;
  onStats: () => void;
}

const BottomNav = ({ onAddPhoto, onVoice, onStats }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border px-6 py-3 flex items-center justify-around z-40">
      <button
        onClick={onVoice}
        className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Mic className="w-5 h-5" />
        </div>
        <span className="text-xs">语音补录</span>
      </button>

      <button
        onClick={onAddPhoto}
        className="flex flex-col items-center gap-1 -mt-4"
      >
        <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-elevated">
          <Camera className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-xs font-medium text-primary">拍照识别</span>
      </button>

      <button
        onClick={onStats}
        className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <BarChart3 className="w-5 h-5" />
        </div>
        <span className="text-xs">统计</span>
      </button>
    </nav>
  );
};

export default BottomNav;
