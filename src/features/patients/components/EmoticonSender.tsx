import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SmilePlus, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOTICONS = ["👍", "💪", "❤️", "🌟", "👏", "🎉", "🙏", "😊"];

interface EmoticonSenderProps {
  recipientId: string;
  patientId: string;
  recipientName: string;
}

export function EmoticonSender({ recipientId, patientId, recipientName }: EmoticonSenderProps) {
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [emoticon, setEmoticon] = useState<string>(EMOTICONS[0]);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const sendCheckIn = async () => {
    if (!message.trim()) {
      toast({
        title: "Check-In Message required",
        description: "Write a short, meaningful note for your client.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check profile view in last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: views } = await supabase
        .from('profile_view_log' as any)
        .select('id')
        .eq('viewer_id', user.id)
        .eq('patient_id', patientId)
        .gte('viewed_at', twentyFourHoursAgo);

      const profileViewed = (views?.length || 0) > 0;

      // Check emoticon frequency (anti-gaming)
      const { data: recentEmoticons } = await supabase
        .from('emoticon_messages' as any)
        .select('id')
        .eq('sender_id', user.id)
        .eq('recipient_id', recipientId)
        .gte('created_at', twentyFourHoursAgo);

      const tooManyEmoticons = (recentEmoticons?.length || 0) >= 5;

      // AI genuineness check — points are only earned for real check-ins
      let aiGenuine = true;
      let aiReason = "";
      try {
        const { data: verdict, error: verdictError } = await supabase.functions.invoke(
          "validate-checkin-message",
          { body: { message, patientName: recipientName } },
        );
        if (verdictError) throw verdictError;
        aiGenuine = !!verdict?.genuine;
        aiReason = verdict?.reason || "";
      } catch (e) {
        console.error("Check-in validation failed:", e);
      }

      const isAiFlagged = !profileViewed || tooManyEmoticons || !aiGenuine;
      const vulasAwarded = isAiFlagged ? 0 : 1;

      // Insert check-in
      await supabase.from('emoticon_messages' as any).insert({
        sender_id: user.id,
        recipient_id: recipientId,
        patient_id: patientId,
        emoticon,
        message,
        ai_verdict: aiGenuine ? 'genuine' : 'not_genuine',
        ai_reason: aiReason,
        vulas_awarded: vulasAwarded,
        is_ai_flagged: isAiFlagged,
        profile_viewed: profileViewed,
      });

      // Create notification for recipient (patient can reply from Notifications)
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'emoticon_received',
        title: `${emoticon} Check-in from your doctor`,
        description: message,
        reference_id: patientId,
        is_read: false,
      });

      toast({
        title: `${emoticon} Check-in sent`,
        description: isAiFlagged
          ? aiReason || "Sent"
          : `Sent to ${recipientName}`,
      });

      setMessage("");
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending check-in:", error);
      toast({
        title: "Error",
        description: "Failed to send check-in",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SmilePlus className="h-4 w-4" />}
          Check In
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <p className="text-xs text-muted-foreground mb-2">Choose an emoticon</p>
        <div className="flex gap-1.5 flex-wrap">
          {EMOTICONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setEmoticon(emoji)}
              disabled={sending}
              className={cn(
                "text-2xl transition-transform p-1 rounded hover:scale-125 hover:bg-accent",
                emoticon === emoji && "bg-primary/10 ring-1 ring-primary scale-110",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>

        <p className="text-xs font-medium text-foreground mt-3 mb-1">Check-In Message</p>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`How is ${recipientName} doing since the last visit?`}
          className="min-h-[80px] text-xs"
          disabled={sending}
        />

        <Button size="sm" className="mt-2 w-full gap-2" onClick={sendCheckIn} disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Check-In
        </Button>
      </PopoverContent>
    </Popover>
  );
}

