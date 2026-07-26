import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Mail,
  MailOpen,
  Send,
  Loader2,
  User,
  Search,
  Trash2,
  ArrowLeft,
  Reply,
  Bell,
  FileText,
  CheckCircle2,
  UserPlus,
  UserCheck,
  UserX,
  Volume2,
  VolumeX,
  MessageCircle,
  Star,
} from "lucide-react";
import { CheckInReply } from "@/components/notifications/CheckInReply";
import { StarRatingDialog } from "@/components/sessions/StarRatingDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { 
  triggerNotification, 
  requestNotificationPermission, 
  areNotificationsEnabled 
} from "@/utils/notificationSound";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  patient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string | null } | null;
  recipient?: { full_name: string | null } | null;
  patient?: { name: string } | null;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<"notifications" | "messages" | "sent">("notifications");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mailboxEmail, setMailboxEmail] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(areNotificationsEnabled());

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      toast({
        title: t("notifications.enabled"),
        description: t("notifications.enabledDescription"),
      });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const getMailboxEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('mailbox_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.mailbox_id) {
        // Format: docs-{mailbox_id}@inbox.miri.health
        setMailboxEmail(`docs-${profile.mailbox_id.slice(0, 8)}@inbox.miri.health`);
      }
    };
    getMailboxEmail();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      if (activeTab === "notifications") {
        fetchNotifications();
      } else {
        fetchMessages();
      }

      // Subscribe to realtime notifications
      const channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          async (payload) => {
            console.log("New notification:", payload);
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            
            // Trigger sound and browser notification
            await triggerNotification(
              newNotification.title,
              newNotification.description || "You have a new notification"
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === (payload.new as Notification).id ? (payload.new as Notification) : n
              )
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, activeTab]);

  const fetchNotifications = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({
        title: t("common.done"),
        description: t("notifications.markedAsRead"),
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchMessages = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          patient:patients(name)
        `)
        .order('created_at', { ascending: false });

      if (activeTab === "messages") {
        query = query.eq('recipient_id', currentUserId);
      } else {
        query = query.eq('sender_id', currentUserId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch sender/recipient profiles separately
      const messagesWithProfiles = await Promise.all((data || []).map(async (msg) => {
        const profileId = activeTab === "messages" ? msg.sender_id : msg.recipient_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', profileId)
          .maybeSingle();
        
        return {
          ...msg,
          sender: activeTab === "messages" ? profile : null,
          recipient: activeTab === "sent" ? profile : null,
        };
      }));
      
      setMessages(messagesWithProfiles);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.loadMessagesError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, is_read: true } : m
      ));
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      setSelectedMessage(null);
      
      toast({
        title: t("notifications.messageDeleted"),
        description: t("notifications.messageDeletedDescription"),
      });
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.deleteError"),
        variant: "destructive",
      });
    }
  };

  const openMessage = (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read && activeTab === "messages") {
      markAsRead(message.id);
    }
  };

  const filteredMessages = messages.filter(message => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      message.subject.toLowerCase().includes(search) ||
      message.content.toLowerCase().includes(search) ||
      message.sender?.full_name?.toLowerCase().includes(search) ||
      message.recipient?.full_name?.toLowerCase().includes(search) ||
      message.patient?.name?.toLowerCase().includes(search)
    );
  });

  const unreadMessagesCount = messages.filter(m => !m.is_read).length;
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

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
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Messages, documents, and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!notificationsEnabled ? (
            <Button variant="outline" size="sm" onClick={handleEnableNotifications} className="gap-2">
              <Volume2 className="h-4 w-4" />
              Enable Alerts
            </Button>
          ) : (
            <Badge variant="secondary" className="gap-1.5 py-1.5">
              <Volume2 className="h-3.5 w-3.5" />
              Alerts On
            </Badge>
          )}
          <InviteUserDialog />
        </div>
      </div>
      
      {mailboxEmail && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Document Mailbox:</span>
            <code className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">{mailboxEmail}</code>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            External parties can email documents to this address and you'll be notified here.
          </p>
        </div>
      )}

      {selectedMessage ? (
        <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t(`notifications.backTo${activeTab === "messages" ? "Messages" : "Sent"}`)}
            </Button>
            <div className="flex items-center gap-2">
              {activeTab === "messages" && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/patients/${selectedMessage.patient_id}?tab=doctors&reply=${selectedMessage.sender_id}`}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Link>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMessage(selectedMessage.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{selectedMessage.subject}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>
                  {t(activeTab === "messages" ? "notifications.from" : "notifications.to")}: <span className="font-medium text-foreground">
                    {activeTab === "messages" ? selectedMessage.sender?.full_name : selectedMessage.recipient?.full_name}
                  </span>
                </span>
                <span>•</span>
                <span>{format(new Date(selectedMessage.created_at), 'dd MMM yyyy, HH:mm')}</span>
              </div>
              {selectedMessage.patient && (
                <Link 
                  to={`/patients/${selectedMessage.patient_id}`}
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                >
                  <User className="h-4 w-4" />
                  Re: {selectedMessage.patient.name}
                </Link>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {selectedMessage.content}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "notifications" | "messages" | "sent")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="h-4 w-4" />
                  {t("notifications.alerts")}
                  {unreadNotificationsCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 justify-center">
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-2">
                  <Mail className="h-4 w-4" />
                  {t("notifications.messages")}
                  {unreadMessagesCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 justify-center">
                      {unreadMessagesCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-2">
                  <Send className="h-4 w-4" />
                  {t("notifications.sent")}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {activeTab === "notifications" && unreadNotificationsCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllNotificationsAsRead}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("notifications.markAllRead")}
                  </Button>
                )}
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("common.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
              </div>
            </div>

            <TabsContent value="notifications" className="mt-4">
              <NotificationList 
                notifications={notifications.filter(n => 
                  !searchQuery || 
                  n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  n.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                onMarkAsRead={markNotificationAsRead}
                onRefresh={fetchNotifications}
              />
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <MessageList 
                messages={filteredMessages} 
                onSelect={openMessage}
                showSender
              />
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              <MessageList 
                messages={filteredMessages} 
                onSelect={openMessage}
                showSender={false}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function NotificationList({ 
  notifications, 
  onMarkAsRead,
  onRefresh,
}: { 
  notifications: Notification[]; 
  onMarkAsRead: (id: string) => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [ratingNotification, setRatingNotification] = useState<Notification | null>(null);
  const [ratedDoctorName, setRatedDoctorName] = useState("");
  const [ratedDoctorId, setRatedDoctorId] = useState("");

  const handleInvitationResponse = async (notification: Notification, accept: boolean) => {
    if (!notification.reference_id) return;
    
    setProcessingId(notification.id);
    
    try {
      // Update invitation status
      const { error: inviteError } = await supabase
        .from("user_invitations")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", notification.reference_id);

      if (inviteError) throw inviteError;

      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      // If accepted, create notification for sender
      if (accept) {
        const { data: invitation } = await supabase
          .from("user_invitations")
          .select("sender_id")
          .eq("id", notification.reference_id)
          .single();

        if (invitation) {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user?.id)
            .single();

          await supabase.from("notifications").insert({
            user_id: invitation.sender_id,
            type: "invitation_accepted",
            title: "Invitation Accepted",
            description: `${profile?.full_name || "A user"} has accepted your connection invitation`,
            reference_id: notification.reference_id,
            is_read: false,
          });
        }
      }

      toast({
        title: t(accept ? "notifications.invitationAccepted" : "notifications.invitationDeclined"),
        description: t(accept ? "notifications.nowConnected" : "notifications.invitationDeclinedDesc"),
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error responding to invitation:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.respondError"),
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bell className="h-12 w-12 mb-4" />
        <p className="text-sm font-medium">{t("notifications.noNotifications")}</p>
        <p className="text-sm">{t("notifications.allCaughtUp")}</p>
      </div>
    );
  }

  const handleRateDoctor = async (notification: Notification) => {
    if (!notification.reference_id) return;
    // reference_id is the session_id, fetch session to get doctor (user_id)
    try {
      const { data: session } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('id', notification.reference_id)
        .single();
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user_id)
        .single();
      setRatedDoctorId(session.user_id);
      setRatedDoctorName(profile?.full_name || "Your Doctor");
      setRatingNotification(notification);
    } catch (err) {
      console.error("Error fetching session for rating:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sos_alert':
        return <Bell className="h-5 w-5 text-red-600 animate-pulse" />;
      case 'document_received':
        return <FileText className="h-5 w-5 text-primary" />;
      case 'invitation_received':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'invitation_accepted':
        return <UserCheck className="h-5 w-5 text-green-500" />;
      case 'emoticon_received':
        return <MessageCircle className="h-5 w-5 text-pink-500" />;
      case 'task_completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'session_completed':
        return <Star className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden divide-y divide-border">
      {ratingNotification && (
        <StarRatingDialog
          open={!!ratingNotification}
          onOpenChange={(open) => { if (!open) setRatingNotification(null); }}
          sessionId={ratingNotification.reference_id || ""}
          ratedUserId={ratedDoctorId}
          ratedUserName={ratedDoctorName}
          raterRole="patient"
          onRated={() => {
            onMarkAsRead(ratingNotification.id);
            setRatingNotification(null);
          }}
        />
      )}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => {
            if (!notification.is_read && notification.type !== 'invitation_received') {
              onMarkAsRead(notification.id);
            }
            if (notification.type === 'sos_alert' && notification.reference_id) {
              window.location.href = `/patient/holarchelp/incident/${notification.reference_id}`;
            }
          }}
          className={cn(
            "flex items-start gap-4 p-4 transition-colors",
            !notification.is_read && "bg-primary/5",
            notification.type === 'sos_alert' && "border-l-4 border-red-600 bg-red-50 dark:bg-red-950/30",
            notification.type !== 'invitation_received' && "cursor-pointer hover:bg-accent/50"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={cn(
                "text-sm truncate",
                !notification.is_read ? "font-semibold text-foreground" : "text-foreground"
              )}>
                {notification.title}
              </p>
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(notification.created_at), 'dd MMM')}
              </span>
            </div>
            {notification.description && (
              <p className={cn(
                "text-sm",
                !notification.is_read ? "text-foreground" : "text-muted-foreground"
              )}>
                {notification.description}
              </p>
            )}
            
            {/* Invitation action buttons */}
            {notification.type === 'invitation_received' && !notification.is_read && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInvitationResponse(notification, true);
                  }}
                  disabled={processingId === notification.id}
                  className="gap-1.5"
                >
                  {processingId === notification.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  {t("common.accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInvitationResponse(notification, false);
                  }}
                  disabled={processingId === notification.id}
                  className="gap-1.5"
                >
                  <UserX className="h-3.5 w-3.5" />
                  {t("common.decline")}
                </Button>
              </div>
            )}

            {/* Rate visit button for session_completed notifications */}
            {notification.type === 'session_completed' && !notification.is_read && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRateDoctor(notification);
                  }}
                  className="gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  <Star className="h-3.5 w-3.5" />
                  {t("notifications.rateVisit")}
                </Button>
              </div>
            )}

            {/* Patient reply to a doctor's check-in */}
            {notification.type === 'emoticon_received' && (
              <CheckInReply patientId={notification.reference_id} />
            )}
          </div>

          {!notification.is_read && notification.type !== 'invitation_received' && (
            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
          )}
        </div>
      ))}
    </div>
  );
}

function MessageList({ 
  messages, 
  onSelect,
  showSender 
}: { 
  messages: Message[]; 
  onSelect: (message: Message) => void;
  showSender: boolean;
}) {
  if (messages.length === 0) {
    const { t } = useTranslation();
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Mail className="h-12 w-12 mb-4" />
        <p className="text-sm font-medium">{t("notifications.noMessages")}</p>
        <p className="text-sm">{t(`notifications.${showSender ? "inboxEmpty" : "sentEmpty"}`)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden divide-y divide-border">
      {messages.map((message) => (
        <div
          key={message.id}
          onClick={() => onSelect(message)}
          className={cn(
            "flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/50",
            !message.is_read && showSender && "bg-primary/5"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            {message.is_read || !showSender ? (
              <MailOpen className="h-5 w-5 text-primary" />
            ) : (
              <Mail className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={cn(
                "text-sm truncate",
                !message.is_read && showSender ? "font-semibold text-foreground" : "text-foreground"
              )}>
                {showSender ? message.sender?.full_name : message.recipient?.full_name}
              </p>
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(message.created_at), 'dd MMM')}
              </span>
            </div>
            <p className={cn(
              "text-sm truncate",
              !message.is_read && showSender ? "font-medium text-foreground" : "text-muted-foreground"
            )}>
              {message.subject}
            </p>
            {message.patient && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Re: {message.patient.name}
              </p>
            )}
          </div>
          {!message.is_read && showSender && (
            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
          )}
        </div>
      ))}
    </div>
  );
}
