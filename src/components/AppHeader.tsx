import { Flame } from "lucide-react";

interface AppHeaderProps {
  name: string;
  streak: number;
}

const AppHeader = ({ name, streak }: AppHeaderProps) => {
  const today = new Date();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;

  return (
    <header className="gradient-header px-5 pt-12 pb-20 rounded-b-[2.5rem]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-primary-foreground/80 text-sm font-medium">{dateStr}</p>
          <h1 className="text-2xl font-extrabold text-primary-foreground mt-1">
            Hi, {name} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3.5 py-2">
            <Flame className="w-4 h-4 text-accent" />
            <span className="font-extrabold text-sm text-primary-foreground">{streak}</span>
            <span className="text-xs text-primary-foreground/80">天连胜</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-primary-foreground/25 border-2 border-primary-foreground/40 flex items-center justify-center text-lg font-bold text-primary-foreground">
            {name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
