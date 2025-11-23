import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchFriend from "./SearchFriend";
import FriendsList from "./FriendsList";
import { FriendsWithChallenges } from "./FriendsWithChallenges";

interface OnlineGameLobbyProps {
  onGameStart: (gameId: string, playerColor: "white" | "black") => void;
  onBack: () => void;
}

export const OnlineGameLobby = ({ onGameStart, onBack }: OnlineGameLobbyProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [friendId, setFriendId] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      // Load user profile
      supabase
        .from('profiles')
        .select('display_name, friend_id')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setPlayerName(data.display_name);
            setFriendId(data.friend_id);
          }
          setLoading(false);
        });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Subscribe to game updates
  useEffect(() => {
    if (!currentGameId) return;

    const channel = supabase
      .channel(`game:${currentGameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${currentGameId}`
        },
        (payload: any) => {
          if (payload.new.status === 'active') {
            const isWhite = payload.new.white_player_id === user?.id;
            toast.success("Match found! Starting game...");
            onGameStart(currentGameId, isWhite ? "white" : "black");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGameId, onGameStart, user?.id]);


  const handleStartGame = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    setSearching(true);
    try {
      // First, check if there's a waiting game to join
      const { data: waitingGames, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'waiting')
        .not('white_player_id', 'is', null)
        .is('black_player_id', null)
        .neq('white_player_id', user.id)
        .limit(1);

      if (fetchError) {
        console.error("Error fetching games:", fetchError);
      }

      // If there's a waiting game, join it
      if (waitingGames && waitingGames.length > 0) {
        const gameToJoin = waitingGames[0];
        
        const { error: updateError } = await supabase
          .from('games')
          .update({
            black_player_id: user.id,
            status: 'active'
          })
          .eq('id', gameToJoin.id);

        if (updateError) throw updateError;

        toast.success("Matched with opponent!");
        onGameStart(gameToJoin.id, "black");
        return;
      }

      // No waiting games, create a new one
      const { data: newGame, error: createError } = await supabase
        .from('games')
        .insert({
          white_player_id: user.id,
          status: 'waiting'
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentGameId(newGame.id);
      setWaitingForOpponent(true);
      toast.info("Searching for opponent...");

      // Wait 5 seconds for an opponent
      setTimeout(async () => {
        // Check if opponent joined
        const { data: gameCheck } = await supabase
          .from('games')
          .select('*')
          .eq('id', newGame.id)
          .single();

        if (gameCheck && !gameCheck.black_player_id) {
          // No opponent found, play with AI
          const { error: updateError } = await supabase
            .from('games')
            .update({
              black_player_id: 'ai',
              status: 'active'
            })
            .eq('id', newGame.id);

          if (!updateError) {
            toast.success("Playing with AI opponent!");
            onGameStart(newGame.id, "white");
          }
        }
      }, 5000);

    } catch (error: any) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game");
      setSearching(false);
      setWaitingForOpponent(false);
    }
  };

  const handleCancelSearch = async () => {
    if (currentGameId) {
      // Delete the waiting game
      await supabase
        .from('games')
        .delete()
        .eq('id', currentGameId);
    }
    setSearching(false);
    setWaitingForOpponent(false);
    setCurrentGameId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (waitingForOpponent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-bold">Finding Opponent...</h2>
            <p className="text-muted-foreground">
              Searching for online players or will match with AI
            </p>
          </div>
        </Card>
        <Button onClick={handleCancelSearch} variant="outline">
          Cancel Search
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="p-8 max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Online Chess
          </h1>
          <p className="text-muted-foreground">Welcome, {playerName}!</p>
          <p className="text-sm text-muted-foreground">Your ID: {friendId}</p>
        </div>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick">Quick Match</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="add">Add Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Match with an online player or play against AI
              </p>
              <Button
                onClick={handleStartGame}
                disabled={searching}
                className="w-full h-16 text-lg"
                size="lg"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Start Game"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            <FriendsWithChallenges
              userId={user?.id || ""}
              onGameStart={onGameStart}
            />
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <SearchFriend />
            <div className="mt-6">
              <FriendsList />
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={onBack} variant="outline" className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Menu
        </Button>
      </Card>
    </div>
  );
};
