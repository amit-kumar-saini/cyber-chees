import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft } from "lucide-react";

interface TimeControlSelectorProps {
  onSelect: (timeControl: { name: string; seconds: number }) => void;
  onBack?: () => void;
}

const timeControls = [
  { name: "Bullet", seconds: 180, description: "3 min" },
  { name: "Blitz", seconds: 300, description: "5 min" },
  { name: "Rapid", seconds: 600, description: "10 min" },
  { name: "Classical", seconds: 1800, description: "30 min" },
];

export const TimeControlSelector = ({ onSelect, onBack }: TimeControlSelectorProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {onBack && (
        <Button 
          variant="ghost" 
          className="mb-4 text-foreground hover:text-primary"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-primary">
        Select Time Control
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {timeControls.map((control) => (
          <Card
            key={control.name}
            className="p-6 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => onSelect(control)}
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">{control.name}</h3>
            </div>
            <p className="text-muted-foreground">{control.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
