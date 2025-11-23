import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, Users, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OnlinePlayer {
  user_id: string;
  display_name: string;
}

interface QuickMatchProps {
  userId: string;
  onlineUsers: Set<string>;
  onGameStart: (gameId: string, playerColor: "white" | "black") => void;
}

export function QuickMatch({ userId, onlineUsers, onGameStart }: QuickMatchProps) {
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [challenging, setChallenging] = useState<string | null>(null);
  const { toast } = useToast();

  const loadOnlinePlayers = async () => {
    if (onlineUsers.size === 0) {
      setOnlinePlayers([]);
      setLoading(false);
      return;
    }

    const userIds = Array.from(onlineUsers).filter(id => id !== userId);
    
    if (userIds.length === 0) {
      setOnlinePlayers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    if (error) {
      console.error("Error loading online players:", error);
      setOnlinePlayers([]);
    } else {
      setOnlinePlayers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOnlinePlayers();
  }, [onlineUsers, userId]);

  const handleQuickChallenge = async (opponentId: string, opponentName: string) => {
    setChallenging(opponentId);
    try {
      // Create game
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .insert({
          white_player_id: userId,
          black_player_id: opponentId,
          status: "waiting",
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Create challenge
      const { error: challengeError } = await supabase
        .from("game_challenges")
        .insert({
          challenger_id: userId,
          challenged_id: opponentId,
          game_id: gameData.id,
          status: "pending",
        });

      if (challengeError) throw challengeError;

      // Subscribe to game status updates for when opponent accepts
      const channel = supabase
        .channel(`game-status:${gameData.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "games",
            filter: `id=eq.${gameData.id}`,
          },
          (payload: any) => {
            if (payload.new.status === "active") {
              toast({
                title: "Challenge Accepted!",
                description: "Starting game...",
              });
              onGameStart(gameData.id, "white");
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      toast({
        title: "Challenge Sent!",
        description: `Waiting for ${opponentName} to accept...`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChallenging(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Quick Match</h3>
        <Badge variant="secondary" className="ml-auto">
          <Users className="h-3 w-3 mr-1" />
          {onlinePlayers.length} Online
        </Badge>
      </div>

      {onlinePlayers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No other players online right now
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back later or invite friends!
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {onlinePlayers.map((player) => (
            <Card
              key={player.user_id}
              className="p-4 hover:shadow-md transition-all duration-200 border-border/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <p className="font-medium">{player.display_name}</p>
                    <p className="text-xs text-muted-foreground">Online now</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleQuickChallenge(player.user_id, player.display_name)}
                  disabled={challenging === player.user_id}
                  className="gap-2"
                >
                  {challenging === player.user_id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Challenge
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
