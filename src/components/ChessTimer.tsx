import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface ChessTimerProps {
  whiteTime: number;
  blackTime: number;
  isWhiteTurn: boolean;
  isActive: boolean;
  onTimeUp: (color: 'white' | 'black') => void;
}

export const ChessTimer = ({ 
  whiteTime, 
  blackTime, 
  isWhiteTurn, 
  isActive,
  onTimeUp 
}: ChessTimerProps) => {
  const [displayWhiteTime, setDisplayWhiteTime] = useState(whiteTime);
  const [displayBlackTime, setDisplayBlackTime] = useState(blackTime);

  useEffect(() => {
    setDisplayWhiteTime(whiteTime);
    setDisplayBlackTime(blackTime);
  }, [whiteTime, blackTime]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (isWhiteTurn) {
        setDisplayWhiteTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            onTimeUp('white');
            return 0;
          }
          return newTime;
        });
      } else {
        setDisplayBlackTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            onTimeUp('black');
            return 0;
          }
          return newTime;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isWhiteTurn, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Mobile Layout - Top Left and Bottom Right */}
      <div className="sm:hidden">
        <Card className={`absolute top-2 left-2 p-2 text-center transition-all z-10 ${
          isWhiteTurn && isActive ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-green-500/20'
        }`}>
          <div className="text-[10px] text-muted-foreground mb-0.5">Black</div>
          <div className={`text-base font-bold ${
            displayBlackTime < 30 ? 'text-destructive' : 'text-foreground'
          }`}>
            {formatTime(displayBlackTime)}
          </div>
        </Card>
        
        <Card className={`absolute bottom-2 right-2 p-2 text-center transition-all z-10 ${
          !isWhiteTurn && isActive ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-green-500/20'
        }`}>
          <div className="text-[10px] text-muted-foreground mb-0.5">White</div>
          <div className={`text-base font-bold ${
            displayWhiteTime < 30 ? 'text-destructive' : 'text-foreground'
          }`}>
            {formatTime(displayWhiteTime)}
          </div>
        </Card>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden sm:flex justify-between gap-4 mt-4">
        <Card className={`flex-1 p-3 sm:p-4 text-center transition-all ${
          !isWhiteTurn && isActive ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-green-500/20'
        }`}>
          <div className="text-xs sm:text-sm text-muted-foreground mb-1">White</div>
          <div className={`text-xl sm:text-2xl font-bold ${
            displayWhiteTime < 30 ? 'text-destructive' : 'text-foreground'
          }`}>
            {formatTime(displayWhiteTime)}
          </div>
        </Card>
        
        <Card className={`flex-1 p-3 sm:p-4 text-center transition-all ${
          isWhiteTurn && isActive ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-green-500/20'
        }`}>
          <div className="text-xs sm:text-sm text-muted-foreground mb-1">Black</div>
          <div className={`text-xl sm:text-2xl font-bold ${
            displayBlackTime < 30 ? 'text-destructive' : 'text-foreground'
          }`}>
            {formatTime(displayBlackTime)}
          </div>
        </Card>
      </div>
    </>
  );
};
