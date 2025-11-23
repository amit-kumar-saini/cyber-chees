import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Zap, Brain, Cpu, Lock } from "lucide-react";
import { useAIProgress } from "@/hooks/useAIProgress";
import { toast } from "sonner";

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: "easy" | "medium" | "hard") => void;
  onBack: () => void;
}

export const DifficultySelector = ({ onSelectDifficulty, onBack }: DifficultySelectorProps) => {
  const { progress, loading } = useAIProgress();

  const handleDifficultyClick = (difficulty: "easy" | "medium" | "hard") => {
    const isUnlocked = 
      (difficulty === "easy" && progress.unlocked_easy) ||
      (difficulty === "medium" && progress.unlocked_medium) ||
      (difficulty === "hard" && progress.unlocked_hard);

    if (!isUnlocked) {
      toast.error(`${difficulty === "medium" ? "Win easy mode to unlock medium!" : "Win medium mode to unlock hard!"}`);
      return;
    }

    onSelectDifficulty(difficulty);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Button 
        variant="ghost" 
        className="absolute top-4 left-4 text-foreground hover:text-primary"
        onClick={onBack}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
        Select Difficulty
      </h1>
      <p className="text-muted-foreground mb-12 text-lg">Choose your challenge level</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {/* Easy Mode - Always Unlocked */}
        <Card 
          className="glass p-8 cursor-pointer hover:scale-105 transition-all duration-300 glow-accent border-accent/30 animate-slide-in"
          onClick={() => handleDifficultyClick("easy")}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 rounded-full bg-accent/10 glow-accent">
              <Zap className="w-16 h-16 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Easy</h2>
            <p className="text-muted-foreground text-center">Perfect for beginners</p>
            <Button className="w-full bg-accent hover:bg-accent/80 text-accent-foreground glow-accent">
              Start Easy Game
            </Button>
          </div>
        </Card>

        {/* Medium Mode */}
        <Card 
          className={`glass p-8 transition-all duration-300 border-primary/30 animate-slide-in ${
            progress.unlocked_medium 
              ? "cursor-pointer hover:scale-105 glow-primary" 
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={() => handleDifficultyClick("medium")}
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex flex-col items-center space-y-4 relative">
            {!progress.unlocked_medium && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Lock className="w-12 h-12 text-primary" />
              </div>
            )}
            <div className={`p-6 rounded-full bg-primary/10 ${progress.unlocked_medium ? "glow-primary" : ""}`}>
              <Brain className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Medium</h2>
            <p className="text-muted-foreground text-center">
              {progress.unlocked_medium ? "Balanced challenge" : "Win Easy to unlock"}
            </p>
            <Button 
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground glow-primary"
              disabled={!progress.unlocked_medium}
            >
              {progress.unlocked_medium ? "Start Medium Game" : "🔒 Locked"}
            </Button>
          </div>
        </Card>

        {/* Hard Mode */}
        <Card 
          className={`glass p-8 transition-all duration-300 border-secondary/30 animate-slide-in ${
            progress.unlocked_hard 
              ? "cursor-pointer hover:scale-105 glow-secondary" 
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={() => handleDifficultyClick("hard")}
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex flex-col items-center space-y-4 relative">
            {!progress.unlocked_hard && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Lock className="w-12 h-12 text-secondary" />
              </div>
            )}
            <div className={`p-6 rounded-full bg-secondary/10 ${progress.unlocked_hard ? "glow-secondary" : ""}`}>
              <Cpu className="w-16 h-16 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Hard</h2>
            <p className="text-muted-foreground text-center">
              {progress.unlocked_hard ? "Ultimate challenge" : "Win Medium to unlock"}
            </p>
            <Button 
              className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground glow-secondary"
              disabled={!progress.unlocked_hard}
            >
              {progress.unlocked_hard ? "Start Hard Game" : "🔒 Locked"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
