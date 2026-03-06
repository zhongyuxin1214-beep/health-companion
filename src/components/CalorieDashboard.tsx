interface CalorieDashboardProps {
  consumed: number;
  target: number;
}

const CalorieDashboard = ({ consumed, target }: CalorieDashboardProps) => {
  const remaining = Math.max(0, target - consumed);
  const progress = Math.min((consumed / target) * 100, 100);
  const isOver = consumed > target;
  const angle = (progress / 100) * 270;

  return (
    <div className="mx-4 -mt-14 bg-card rounded-3xl shadow-elevated p-6 relative z-10">
      <p className="text-xs text-muted-foreground text-center mb-2 font-semibold tracking-wider uppercase">
        今日热量进度
      </p>

      {/* Circular gauge */}
      <div className="flex justify-center mb-4">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-[135deg]">
            <circle
              cx="90" cy="90" r="76"
              fill="none"
              stroke="hsl(20 6% 25%)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${270 * (Math.PI * 152 / 360)} ${Math.PI * 152}`}
            />
            <circle
              cx="90" cy="90" r="76"
              fill="none"
              stroke={isOver ? "hsl(0 72% 55%)" : "url(#gaugeGradient)"}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(angle / 360) * Math.PI * 152} ${Math.PI * 152}`}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(174 55% 35%)" />
                <stop offset="100%" stopColor="hsl(174 45% 50%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-foreground">{consumed}</span>
            <span className="text-xs text-muted-foreground font-medium">/ {target} kcal</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-8">
        <div className="text-center">
          <div className="w-2 h-2 rounded-full bg-secondary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{consumed}</p>
          <p className="text-xs text-muted-foreground">已摄入</p>
        </div>
        <div className="text-center">
          <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${isOver ? 'bg-destructive' : 'bg-primary'}`} />
          <p className={`text-lg font-bold ${isOver ? 'text-destructive' : 'text-primary'}`}>
            {isOver ? `+${consumed - target}` : remaining}
          </p>
          <p className="text-xs text-muted-foreground">{isOver ? '已超标' : '剩余'}</p>
        </div>
        <div className="text-center">
          <div className="w-2 h-2 rounded-full bg-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{target}</p>
          <p className="text-xs text-muted-foreground">目标</p>
        </div>
      </div>
    </div>
  );
};

export default CalorieDashboard;
