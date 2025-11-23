import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, User, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  display_name: string;
  friend_id: string;
  user_id: string;
}

export default function SearchFriend() {
  const [searchId, setSearchId] = useState("");
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      toast.error("Please enter a Friend ID");
      return;
    }

    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("friend_id", searchId.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Check if it's the user's own ID
        if (data.user_id === user.id) {
          toast.error("You cannot add yourself as a friend");
          setFoundProfile(null);
          return;
        }
        setFoundProfile(data);
        toast.success("Friend found!");
      } else {
        setFoundProfile(null);
        toast.error("No user found with this Friend ID");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to search");
      setFoundProfile(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!foundProfile) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        return;
      }

      // Check if request already exists
      const { data: existing } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("sender_id", user.id)
        .eq("receiver_id", foundProfile.user_id)
        .maybeSingle();

      if (existing) {
        toast.error("Friend request already sent");
        return;
      }

      // Check if already friends
      const { data: alreadyFriends } = await supabase
        .from("friends")
        .select("*")
        .eq("user_id", user.id)
        .eq("friend_id", foundProfile.user_id)
        .maybeSingle();

      if (alreadyFriends) {
        toast.error("You are already friends");
        return;
      }

      // Send friend request
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          sender_id: user.id,
          receiver_id: foundProfile.user_id,
        });

      if (error) throw error;

      toast.success(`Friend request sent to ${foundProfile.display_name}!`);
      setFoundProfile(null);
      setSearchId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Enter a Friend ID to find and add players
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter Friend ID (e.g., 12345678)"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          maxLength={9}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="h-11"
        />
        <Button onClick={handleSearch} disabled={searching} className="h-11 px-6">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {foundProfile && (
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">{foundProfile.display_name}</div>
              <div className="text-sm text-muted-foreground">
                ID: {foundProfile.friend_id}
              </div>
            </div>
            <Button 
              onClick={handleSendRequest} 
              disabled={sending}
              className="h-10"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
