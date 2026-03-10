import { useNavigate, useLocation } from "react-router-dom";
import { Home, BookOpen, Plus, Dumbbell, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onAdd?: () => void;
}

const BottomNav = ({ onAdd }: BottomNavProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { key: "/", icon: Home, label: "概览" },
    { key: "/log", icon: BookOpen, label: "日志" },
    { key: "add", icon: Plus, label: "记录" },
    { key: "/workout", icon: Dumbbell, label: "健身" },
    { key: "/stats", icon: TrendingUp, label: "趋势" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-6 pt-2 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* 导航栏容器 - 使用纯白背景与强阴影，解决模糊和遮挡感 */}
        <div className="bg-white rounded-[32px] shadow-nav border border-slate-100 px-2 py-2 flex items-center justify-around relative">
          
          {tabs.map((tab) => {
            // 中心“记录”大按钮
            if (tab.key === "add") {
              return (
                <button
                  key="add"
                  onClick={onAdd}
                  className="flex flex-col items-center -mt-12 transition-transform active:scale-90"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] flex items-center justify-center shadow-glow-blue border-[6px] border-white">
                    <Plus className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                </button>
              );
            }

            const isActive = pathname === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.key)}
                className="flex flex-col items-center gap-1.5 transition-all py-1 px-3 relative group active:scale-95"
              >
                {/* 仿图 2 的图标背景呼吸感 */}
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-inner" 
                    : "bg-transparent text-slate-400 group-hover:text-slate-600"
                )}>
                  <Icon 
                    className={cn("transition-all", isActive ? "w-6 h-6" : "w-5 h-5")} 
                    strokeWidth={isActive ? 2.5 : 1.8} 
                  />
                </div>
                
                {/* 文字加深颜色，确保清晰可读 */}
                <span className={cn(
                  "text-[10px] font-black tracking-tighter transition-colors",
                  isActive ? "text-primary" : "text-slate-400"
                )}>
                  {tab.label}
                </span>

                {/* 选中后下方的小指示条 */}
                {isActive && (
                  <div className="absolute -bottom-1 w-1.5 h-1.5 bg-primary rounded-full shadow-sm"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
