import { useState, useEffect } from "react";
import { format } from "date-fns";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<"notifications" | "messages" | "sent">("notifications");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mailboxEmail, setMailboxEmail] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
        title: "Error",
        description: "Failed to load notifications",
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
        title: "Done",
        description: "All notifications marked as read",
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
        title: "Error",
        description: "Failed to load messages",
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
        title: "Message Deleted",
        description: "The message has been deleted",
      });
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <p className="mt-1 text-muted-foreground">
          Messages, documents, and alerts
        </p>
        {mailboxEmail && (
          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
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
      </div>

      {selectedMessage ? (
        <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {activeTab === "messages" ? "Messages" : "Sent"}
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
                  {activeTab === "messages" ? "From" : "To"}: <span className="font-medium text-foreground">
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
                  <User className="h-3 w-3" />
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
                  Alerts
                  {unreadNotificationsCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 justify-center">
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Messages
                  {unreadMessagesCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 justify-center">
                      {unreadMessagesCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-2">
                  <Send className="h-4 w-4" />
                  Sent
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {activeTab === "notifications" && unreadNotificationsCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllNotificationsAsRead}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark all read
                  </Button>
                )}
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
            </div>

            <TabsContent value="notifications" className="mt-4">
              <NotificationList 
                notifications={notifications.filter(n => 
                  !searchQuery || 
                  n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  n.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                onMarkAsRead={markNotificationAsRead}
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
  onMarkAsRead 
}: { 
  notifications: Notification[]; 
  onMarkAsRead: (id: string) => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bell className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No notifications</p>
        <p className="text-sm">You're all caught up!</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'document_received':
        return <FileText className="h-5 w-5 text-primary" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
          className={cn(
            "flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/50",
            !notification.is_read && "bg-primary/5"
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
                "text-sm truncate",
                !notification.is_read ? "text-foreground" : "text-muted-foreground"
              )}>
                {notification.description}
              </p>
            )}
          </div>
          {!notification.is_read && (
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
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Mail className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No messages</p>
        <p className="text-sm">Your {showSender ? "inbox" : "sent messages"} is empty</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
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
