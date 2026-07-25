import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SmilePlus } from "lucide-react";

const EMOTICONS = ["ðŸ‘", "ðŸ’ª", "â¤ï¸", "ðŸŒŸ", "ðŸ‘", "ðŸŽ‰", "ðŸ™", "ðŸ˜Š"];

interface EmoticonSenderProps {
  recipientId: string;
  patientId: string;
  recipientName: string;
}

export function EmoticonSender({ recipientId, patientId, recipientName }: EmoticonSenderProps) {
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const sendEmoticon = async (emoticon: string) => {
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
      const isAiFlagged = !profileViewed || tooManyEmoticons;
      const vulasAwarded = isAiFlagged ? 0 : 1;

      // Insert emoticon message
      await supabase.from('emoticon_messages' as any).insert({
        sender_id: user.id,
        recipient_id: recipientId,
        patient_id: patientId,
        emoticon,
        vulas_awarded: vulasAwarded,
        is_ai_flagged: isAiFlagged,
        profile_viewed: profileViewed,
      });

      // Create notification for recipient
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'emoticon_received',
        title: `${emoticon} from your doctor`,
        description: `Your healthcare provider sent you a check-in emoticon`,
        is_read: false,
      });

      // Award doctor vulas if not flagged
      if (!isAiFlagged) {
        await supabase.from('doctor_rewards' as any).insert({
          doctor_id: user.id,
          reward_type: 'emoticon_checkin',
          description: `Sent ${emoticon} to ${recipientName}`,
          vulas_count: vulasAwarded,
          reference_id: patientId,
        });
      }

      toast({
        title: `${emoticon} Sent!`,
        description: isAiFlagged
          ? "Emoticon sent (no Vulas â€” view profile first or daily limit reached)"
          : `Emoticon sent to ${recipientName} (+1 â“‚ï¸)`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Error sending emoticon:", error);
      toast({
        title: "Error",
        description: "Failed to send emoticon",
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
      <PopoverContent className="w-auto p-3" align="end">
        <p className="text-sm text-muted-foreground mb-2">Send a check-in emoticon</p>
        <div className="flex gap-1.5 flex-wrap max-w-[200px]">
          {EMOTICONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendEmoticon(emoji)}
              disabled={sending}
              className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

