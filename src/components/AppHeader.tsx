import { Flame } from "lucide-react";

interface AppHeaderProps {
  name: string;
  streak: number;
}

const AppHeader = ({ name, streak }: AppHeaderProps) => {
  return (
    <header className="gradient-header px-5 py-4 flex items-center justify-between text-primary-foreground">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-lg font-semibold">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-sm opacity-80">Hi,</p>
          <p className="font-semibold text-lg leading-tight">{name}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1.5">
        <Flame className="w-4 h-4 text-accent" />
        <span className="font-bold text-sm">{streak}天</span>
        <span className="text-xs opacity-80">连胜</span>
      </div>
    </header>
  );
};

export default AppHeader;
