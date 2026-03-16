import { useNavigate, useLocation } from "react-router-dom";
import { Home, BookOpen, Dumbbell, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { key: "/", icon: Home, label: "概览" },
    { key: "/log", icon: BookOpen, label: "日志" },
    { key: "/workout", icon: Dumbbell, label: "健身" },
    { key: "/stats", icon: TrendingUp, label: "趋势" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-6 pt-2 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-white rounded-[32px] shadow-nav border border-slate-100 px-3 py-2 flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = pathname === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.key)}
                className="flex flex-col items-center gap-1.5 transition-all py-1 px-4 relative group active:scale-95"
              >
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
                
                <span className={cn(
                  "text-[10px] font-black tracking-tighter transition-colors",
                  isActive ? "text-primary" : "text-slate-400"
                )}>
                  {tab.label}
                </span>

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
