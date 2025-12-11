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

export default function Inbox() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const getEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getEmail();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchMessages();
    }
  }, [currentUserId, activeTab]);

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

      if (activeTab === "inbox") {
        query = query.eq('recipient_id', currentUserId);
      } else {
        query = query.eq('sender_id', currentUserId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch sender/recipient profiles separately
      const messagesWithProfiles = await Promise.all((data || []).map(async (msg) => {
        const profileId = activeTab === "inbox" ? msg.sender_id : msg.recipient_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', profileId)
          .maybeSingle();
        
        return {
          ...msg,
          sender: activeTab === "inbox" ? profile : null,
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
    if (!message.is_read && activeTab === "inbox") {
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

  const unreadCount = messages.filter(m => !m.is_read && activeTab === "inbox").length;

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
        <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
        <p className="mt-1 text-muted-foreground">
          Messages from other doctors about shared patients
        </p>
        {userEmail && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Mailbox:</span>
            <span className="font-medium text-foreground">{userEmail}</span>
          </div>
        )}
      </div>

      {selectedMessage ? (
        <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {activeTab === "inbox" ? "Inbox" : "Sent"}
            </Button>
            <div className="flex items-center gap-2">
              {activeTab === "inbox" && (
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
                  {activeTab === "inbox" ? "From" : "To"}: <span className="font-medium text-foreground">
                    {activeTab === "inbox" ? selectedMessage.sender?.full_name : selectedMessage.recipient?.full_name}
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "inbox" | "sent")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="inbox" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Inbox
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-2">
                  <Send className="h-4 w-4" />
                  Sent
                </TabsTrigger>
              </TabsList>

              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <TabsContent value="inbox" className="mt-4">
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
