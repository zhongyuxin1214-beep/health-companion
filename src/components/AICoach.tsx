import { Bot, Sparkles } from "lucide-react";

interface AICoachProps {
  message: string;
}

const AICoach = ({ message }: AICoachProps) => {
  return (
    <div className="mx-4 mt-4 gradient-coach rounded-3xl p-4 shadow-card border border-secondary/30">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center shadow-glow-teal">
          <Bot className="w-4.5 h-4.5 text-secondary-foreground" />
        </div>
        <span className="font-bold text-sm text-secondary-foreground">AI 教练建议</span>
        <Sparkles className="w-3.5 h-3.5 text-accent" />
      </div>
      <p className="text-sm text-foreground/75 leading-relaxed pl-[2.625rem]">
        {message}
      </p>
    </div>
  );
};

export default AICoach;
