import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Swords, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Friend {
  id: string;
  friend_id: string;
  friend_profile: {
    display_name: string;
    user_id: string;
  };
}

interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  game_id: string | null;
  status: string;
  challenger_profile: {
    display_name: string;
  };
}

interface FriendsWithChallengesProps {
  userId: string;
  onGameStart: (gameId: string, playerColor: "white" | "black") => void;
}

export function FriendsWithChallenges({ userId, onGameStart }: FriendsWithChallengesProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFriends = async () => {
    const { data, error } = await supabase
      .from("friends")
      .select(`
        id,
        friend_id,
        friend_profile:profiles!friends_friend_id_fkey(display_name, user_id)
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading friends:", error);
      return;
    }

    setFriends(data || []);
  };

  const loadChallenges = async () => {
    const { data, error } = await supabase
      .from("game_challenges")
      .select(`
        id,
        challenger_id,
        challenged_id,
        game_id,
        status,
        challenger_profile:profiles!game_challenges_challenger_id_fkey(display_name)
      `)
      .eq("challenged_id", userId)
      .eq("status", "pending");

    if (error) {
      console.error("Error loading challenges:", error);
      return;
    }

    setChallenges(data || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadFriends(), loadChallenges()]);
      setLoading(false);
    };

    init();

    // Subscribe to challenges
    const challengesChannel = supabase
      .channel("game-challenges")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_challenges",
          filter: `challenged_id=eq.${userId}`,
        },
        () => {
          loadChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengesChannel);
    };
  }, [userId]);

  const handleChallenge = async (friendUserId: string, friendName: string) => {
    try {
      // Create game first
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .insert({
          white_player_id: userId,
          black_player_id: friendUserId,
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
          challenged_id: friendUserId,
          game_id: gameData.id,
          status: "pending",
        });

      if (challengeError) throw challengeError;

      // Subscribe to game status updates for when friend accepts
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
                description: `${friendName} accepted! Starting game...`,
              });
              onGameStart(gameData.id, "white");
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      toast({
        title: "Challenge Sent!",
        description: `Waiting for ${friendName} to accept...`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAcceptChallenge = async (challenge: Challenge) => {
    try {
      // Fetch game data to determine player colors
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("id", challenge.game_id)
        .single();

      if (gameError) throw gameError;

      // Update challenge status
      const { error: updateError } = await supabase
        .from("game_challenges")
        .update({ status: "accepted" })
        .eq("id", challenge.id);

      if (updateError) throw updateError;

      // Update game status to active
      const { error: gameUpdateError } = await supabase
        .from("games")
        .update({ status: "active" })
        .eq("id", challenge.game_id);

      if (gameUpdateError) throw gameUpdateError;

      // Determine player color based on game data
      const isWhite = gameData.white_player_id === userId;
      
      toast({
        title: "Challenge Accepted!",
        description: "Starting game...",
      });

      onGameStart(challenge.game_id!, isWhite ? "white" : "black");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from("game_challenges")
        .update({ status: "declined" })
        .eq("id", challengeId);

      if (error) throw error;

      toast({
        title: "Challenge Declined",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading friends...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Incoming Challenges */}
      {challenges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Incoming Challenges</h3>
          {challenges.map((challenge) => (
            <Card key={challenge.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {challenge.challenger_profile?.display_name}
                  </span>
                  <span className="text-muted-foreground">challenges you!</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptChallenge(challenge)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeclineChallenge(challenge.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Friends</h3>
        {friends.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No friends yet. Add friends to challenge them!
          </p>
        ) : (
          friends.map((friend) => {
            return (
              <Card key={friend.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {friend.friend_profile?.display_name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleChallenge(
                        friend.friend_profile?.user_id,
                        friend.friend_profile?.display_name
                      )
                    }
                  >
                    <Swords className="h-4 w-4 mr-1" />
                    Challenge
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
