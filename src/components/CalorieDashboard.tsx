interface CalorieDashboardProps {
  consumed: number;
  target: number;
}

const CalorieDashboard = ({ consumed, target }: CalorieDashboardProps) => {
  const remaining = Math.max(0, target - consumed);
  const progress = Math.min((consumed / target) * 100, 100);
  const isOver = consumed > target;

  return (
    <div className="mx-4 -mt-4 bg-card rounded-2xl shadow-elevated p-6 relative z-10">
      <p className="text-sm text-muted-foreground text-center mb-4 font-medium">今日热量进度</p>
      
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">{consumed}</p>
          <p className="text-xs text-muted-foreground">已摄入</p>
        </div>
        <div className="text-muted-foreground text-2xl font-light">/</div>
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{target}</p>
          <p className="text-xs text-muted-foreground">目标 kcal</p>
        </div>
      </div>

      <div className="w-full h-4 rounded-full gauge-track overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isOver ? 'bg-destructive' : 'gauge-fill'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className={`text-center mt-3 text-sm font-medium ${isOver ? 'text-destructive' : 'text-primary'}`}>
        {isOver ? `已超标 ${consumed - target} kcal` : `剩余: ${remaining} kcal`}
      </p>
    </div>
  );
};

export default CalorieDashboard;
