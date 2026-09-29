import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Loader2, Send, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  specialty: string | null;
  role: string | null;
}

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [emailForNewUser, setEmailForNewUser] = useState("");
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchMode, setSearchMode] = useState<"search" | "email">("search");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearchMode("search");
      return;
    }

    setIsSearching(true);
    setSelectedUser(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, specialty, role")
        .neq("id", user?.id)
        .or(`full_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
      
      if (!data || data.length === 0) {
        setSearchMode("email");
      } else {
        setSearchMode("search");
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchMode("search");
      return;
    }
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleSendInvitation = async () => {
    if (!user) return;

    if (!selectedUser && !emailForNewUser) {
      toast({
        title: "No recipient",
        description: "Please select a user or enter an email address",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if sending to new user
    if (!selectedUser && emailForNewUser) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailForNewUser)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-user-invitation", {
        body: {
          recipientId: selectedUser?.id || null,
          recipientEmail: selectedUser ? null : emailForNewUser,
          message: message.trim() || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: selectedUser 
          ? `Invitation sent to ${selectedUser.full_name || "user"}`
          : `Invitation email sent to ${emailForNewUser}`,
      });

      // Reset and close
      resetForm();
      setOpen(false);
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setEmailForNewUser("");
    setMessage("");
    setSearchMode("search");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite User to Connect</DialogTitle>
          <DialogDescription>
            Search for an existing user or invite someone new via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Section */}
          <div className="space-y-2">
            <Label>Search for user</Label>
            <div className="relative">
              <Input
                placeholder="Start typing a name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Results</Label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => {
                      setSelectedUser(result);
                      setSearchMode("search");
                      setEmailForNewUser("");
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent",
                      selectedUser?.id === result.id && "bg-primary/10 border-l-2 border-l-primary"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(result.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {result.full_name || "Unknown User"}
                      </p>
                      {result.specialty && (
                        <p className="text-sm text-muted-foreground truncate">
                          {result.specialty}
                        </p>
                      )}
                    </div>
                    {result.role && (
                      <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                        {result.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results - Email Option */}
          {searchMode === "email" && searchResults.length === 0 && searchQuery && (
            <div className="rounded-lg border border-border p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">User not found on platform</p>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Send an email invitation to invite them to join Indigro.
              </p>
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailForNewUser}
                onChange={(e) => {
                  setEmailForNewUser(e.target.value);
                  setSelectedUser(null);
                }}
              />
            </div>
          )}

          {/* Or Divider */}
          {!selectedUser && searchResults.length === 0 && !searchQuery && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or invite by email</span>
              </div>
            </div>
          )}

          {/* Direct Email Input */}
          {!selectedUser && searchResults.length === 0 && !searchQuery && (
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={emailForNewUser}
                onChange={(e) => setEmailForNewUser(e.target.value)}
              />
            </div>
          )}

          {/* Selected User Display */}
          {selectedUser && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {selectedUser.full_name || "Unknown User"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Will receive notification in-app
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Message */}
          {(selectedUser || emailForNewUser) && (
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Add a personal message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvitation}
            disabled={isSending || (!selectedUser && !emailForNewUser)}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
