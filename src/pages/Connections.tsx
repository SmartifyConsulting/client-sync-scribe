import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Search,
  Loader2,
  UserMinus,
  UserCheck,
  Mail,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Connection {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  specialty: string | null;
  role: string | null;
  connected_at: string;
  invitation_id: string;
}

interface PendingInvitation {
  id: string;
  recipient_email: string;
  sender_id: string;
  recipient_id: string | null;
  status: string;
  created_at: string;
  message: string | null;
  direction: "sent" | "received";
  sender_name?: string | null;
}

export default function Connections() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"connections" | "pending">("connections");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; connection: Connection | null }>({
    open: false,
    connection: null,
  });
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConnections();
      fetchPendingInvitations();

      // Subscribe to realtime updates
      const channel = supabase
        .channel("connections-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_invitations",
          },
          () => {
            fetchConnections();
            fetchPendingInvitations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchConnections = async () => {
    if (!currentUserId) return;
    setLoading(true);

    try {
      // Get accepted invitations where user is sender or recipient
      const { data: sentInvitations, error: sentError } = await supabase
        .from("user_invitations")
        .select("id, recipient_id, updated_at")
        .eq("sender_id", currentUserId)
        .eq("status", "accepted");

      const { data: receivedInvitations, error: receivedError } = await supabase
        .from("user_invitations")
        .select("id, sender_id, updated_at")
        .eq("recipient_id", currentUserId)
        .eq("status", "accepted");

      if (sentError || receivedError) throw sentError || receivedError;

      // Get connected user profiles
      const connectedUserIds = [
        ...(sentInvitations || []).map((i) => ({ id: i.recipient_id, invitation_id: i.id, connected_at: i.updated_at })),
        ...(receivedInvitations || []).map((i) => ({ id: i.sender_id, invitation_id: i.id, connected_at: i.updated_at })),
      ];

      if (connectedUserIds.length === 0) {
        setConnections([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, specialty, role")
        .in("id", connectedUserIds.map((u) => u.id));

      if (profileError) throw profileError;

      const connectionsWithProfiles: Connection[] = connectedUserIds.map((conn) => {
        const profile = profiles?.find((p) => p.id === conn.id);
        return {
          id: conn.id,
          user_id: conn.id,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          specialty: profile?.specialty || null,
          role: profile?.role || null,
          connected_at: conn.connected_at,
          invitation_id: conn.invitation_id,
        };
      });

      setConnections(connectionsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching connections:", error);
      toast({
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    if (!currentUserId) return;

    try {
      // Sent invitations
      const { data: sent, error: sentError } = await supabase
        .from("user_invitations")
        .select("id, recipient_email, sender_id, recipient_id, status, created_at, message")
        .eq("sender_id", currentUserId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;

      // Received invitations
      const { data: received, error: receivedError } = await supabase
        .from("user_invitations")
        .select("id, recipient_email, sender_id, recipient_id, status, created_at, message")
        .eq("recipient_id", currentUserId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;

      // Get sender names for received invitations
      const senderIds = (received || []).map(r => r.sender_id);
      let senderProfiles: Record<string, string | null> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);
        (profiles || []).forEach(p => { senderProfiles[p.id] = p.full_name; });
      }

      const allPending: PendingInvitation[] = [
        ...(sent || []).map(i => ({ ...i, direction: "sent" as const })),
        ...(received || []).map(i => ({ ...i, direction: "received" as const, sender_name: senderProfiles[i.sender_id] })),
      ];

      setPendingInvitations(allPending);
    } catch (error: any) {
      console.error("Error fetching pending invitations:", error);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("user_invitations")
        .update({ status: "accepted", updated_at: new Date().toISOString(), recipient_id: currentUserId })
        .eq("id", invitationId);

      if (error) throw error;

      toast({ title: "Invitation accepted", description: "You are now connected" });
      fetchPendingInvitations();
      fetchConnections();
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({ title: "Error", description: "Failed to accept invitation", variant: "destructive" });
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("user_invitations")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", invitationId);

      if (error) throw error;

      toast({ title: "Invitation declined" });
      fetchPendingInvitations();
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast({ title: "Error", description: "Failed to decline invitation", variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectDialog.connection) return;
    setIsDisconnecting(true);

    try {
      // Delete the invitation record
      const { error } = await supabase
        .from("user_invitations")
        .delete()
        .eq("id", disconnectDialog.connection.invitation_id);

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: `You are no longer connected with ${disconnectDialog.connection.full_name || "this user"}`,
      });

      fetchConnections();
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
      setDisconnectDialog({ open: false, connection: null });
    }
  };

  const cancelPendingInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("user_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled",
      });

      fetchPendingInvitations();
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    }
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

  const filteredConnections = connections.filter((conn) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      conn.full_name?.toLowerCase().includes(search) ||
      conn.specialty?.toLowerCase().includes(search)
    );
  });

  const filteredPending = pendingInvitations.filter((inv) => {
    if (!searchQuery) return true;
    return inv.recipient_email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Connections</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage your professional network and connections
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "connections" | "pending")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-primary">
            <TabsTrigger value="connections" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-white">
              <UserCheck className="h-4 w-4" />
              Connected
              {connections.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {connections.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-white">
              <Clock className="h-4 w-4" />
              Pending
              {pendingInvitations.length > 0 && (
                <Badge variant="outline" className="ml-1 border-white/50 text-white data-[state=active]:border-border data-[state=active]:text-foreground">
                  {pendingInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
        </div>

        <TabsContent value="connections" className="mt-4">
          {filteredConnections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No connections yet</p>
              <p className="text-sm">Invite users to start building your network</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="rounded-xl border border-primary bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={connection.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(connection.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {connection.full_name || "Unknown User"}
                      </p>
                      {connection.specialty && (
                        <p className="text-sm text-muted-foreground truncate">
                          {connection.specialty}
                        </p>
                      )}
                      {connection.role && (
                        <Badge variant="secondary" className="mt-1 text-xs capitalize">
                          {connection.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Connected {format(new Date(connection.connected_at), "dd MMM yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDisconnectDialog({ open: true, connection })}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {filteredPending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No pending invitations</p>
              <p className="text-sm">All your invitations have been responded to</p>
            </div>
          ) : (
            <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden divide-y divide-border">
              {filteredPending.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      invitation.direction === "received" ? "bg-secondary/10" : "bg-primary/10"
                    )}>
                      <Mail className={cn(
                        "h-5 w-5",
                        invitation.direction === "received" ? "text-secondary" : "text-primary"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {invitation.direction === "received"
                          ? invitation.sender_name || "Unknown User"
                          : invitation.recipient_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invitation.direction === "received" ? "Received" : "Sent"}{" "}
                        {format(new Date(invitation.created_at), "dd MMM yyyy")}
                        {invitation.message && ` • "${invitation.message}"`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invitation.direction === "received" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => acceptInvitation(invitation.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => declineInvitation(invitation.id)}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => cancelPendingInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={disconnectDialog.open}
        onOpenChange={(open) => setDisconnectDialog({ open, connection: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect from {disconnectDialog.connection?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection between you and this user. You can always reconnect later by sending a new invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserMinus className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
