import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Gamepad2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  display_name: string;
  friend_id: string;
  user_id: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  status: string;
  sender: Profile;
}

interface Friend {
  friend_id: string;
  friend: Profile;
}

export default function FriendsList({ onChallengeGame }: { onChallengeGame?: (friendId: string) => void }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadFriendsAndRequests();
  }, []);

  const loadFriendsAndRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load friends - get friend_ids first, then fetch profiles
      const { data: friendsData } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", user.id);

      let friendsList: Friend[] = [];
      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map(f => f.friend_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", friendIds);

        if (profiles) {
          friendsList = friendsData.map(f => ({
            friend_id: f.friend_id,
            friend: profiles.find(p => p.user_id === f.friend_id)!
          })).filter(f => f.friend);
        }
      }

      // Load pending requests - get sender_ids first, then fetch profiles
      const { data: requestsData } = await supabase
        .from("friend_requests")
        .select("id, sender_id, status")
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      let requestsList: FriendRequest[] = [];
      if (requestsData && requestsData.length > 0) {
        const senderIds = requestsData.map(r => r.sender_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", senderIds);

        if (profiles) {
          requestsList = requestsData.map(r => ({
            id: r.id,
            sender_id: r.sender_id,
            status: r.status,
            sender: profiles.find(p => p.user_id === r.sender_id)!
          })).filter(r => r.sender);
        }
      }

      setFriends(friendsList);
      setRequests(requestsList);
    } catch (error: any) {
      toast.error("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase.rpc("accept_friend_request", {
        request_id: requestId,
      });

      if (error) throw error;

      toast.success("Friend request accepted!");
      loadFriendsAndRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Friend request rejected");
      loadFriendsAndRequests();
    } catch (error: any) {
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Friend Requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Friend Requests ({requests.length})
          </h3>
          {requests.map((request) => (
            <Card key={request.id} className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{request.sender.display_name}</div>
                  <div className="text-xs text-muted-foreground">ID: {request.sender.friend_id}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={processingId === request.id}
                    className="h-8"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRequest(request.id)}
                    disabled={processingId === request.id}
                    className="h-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Your Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <Card className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No friends yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Search for friends to add them
            </p>
          </Card>
        ) : (
          friends.map((friend) => (
            <Card key={friend.friend_id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{friend.friend.display_name}</div>
                  <div className="text-xs text-muted-foreground">ID: {friend.friend.friend_id}</div>
                </div>
                {onChallengeGame && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onChallengeGame(friend.friend.user_id)}
                  >
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    Challenge
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
