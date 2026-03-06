import { Bot, Sparkles } from "lucide-react";

interface AICoachProps {
  message: string;
}

const AICoach = ({ message }: AICoachProps) => {
  return (
    <div className="mx-4 mt-4 gradient-coach rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-[hsl(var(--coach))] flex items-center justify-center">
          <Bot className="w-4 h-4 text-[hsl(var(--coach-foreground))]" />
        </div>
        <span className="font-semibold text-sm text-[hsl(var(--coach))]">AI 教练建议</span>
        <Sparkles className="w-3.5 h-3.5 text-accent" />
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed pl-9">
        {message}
      </p>
    </div>
  );
};

export default AICoach;
