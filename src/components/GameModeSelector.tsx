import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Users, Gamepad2 } from "lucide-react";

interface GameModeSelectorProps {
  onSelectMode: (mode: "ai" | "online" | "local") => void;
}

export const GameModeSelector = ({ onSelectMode }: GameModeSelectorProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-pulse-glow">
        CYBER CHESS
      </h1>
      <p className="text-muted-foreground mb-12 text-lg">Select Your Battle Mode</p>
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          <Card 
            className="glass p-8 cursor-pointer hover:scale-105 transition-all duration-300 glow-primary border-primary/30 animate-slide-in"
            onClick={() => onSelectMode("local")}
            style={{ animationDelay: "0.05s" }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-6 rounded-full bg-primary/10 glow-primary">
                <Gamepad2 className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">2 Player Local</h2>
              <p className="text-muted-foreground text-center">Play with a friend on same device</p>
              <Button className="w-full bg-primary hover:bg-primary/80 text-primary-foreground glow-primary">
                Start Local Game
              </Button>
            </div>
          </Card>

          <Card
            className="glass p-8 cursor-pointer hover:scale-105 transition-all duration-300 glow-accent border-accent/30 animate-slide-in"
            onClick={() => onSelectMode("ai")}
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-6 rounded-full bg-accent/10 glow-accent">
                <Bot className="w-16 h-16 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Play vs AI</h2>
              <p className="text-muted-foreground text-center">Challenge our advanced AI opponents</p>
              <Button className="w-full bg-accent hover:bg-accent/80 text-accent-foreground glow-accent">
                Start AI Game
              </Button>
            </div>
          </Card>

          <Card 
            className="glass p-8 cursor-pointer hover:scale-105 transition-all duration-300 glow-secondary border-secondary/30 animate-slide-in"
            onClick={() => onSelectMode("online")}
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="p-6 rounded-full bg-secondary/10 glow-secondary">
                <Users className="w-16 h-16 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Play Online</h2>
              <p className="text-muted-foreground text-center">Challenge a friend online</p>
              <Button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground glow-secondary">
                Start Online Game
              </Button>
            </div>
          </Card>
        </div>
    </div>
  );
};
