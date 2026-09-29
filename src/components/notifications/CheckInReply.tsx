import { useState } from "react";
import { Loader2, Reply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CheckInReplyProps {
  /** patients.id carried on the check-in notification. */
  patientId: string | null;
}

/**
 * Lets a patient reply to a doctor's check-in straight from the notification.
 * The reply is stored against the original check-in and notifies the doctor.
 */
export function CheckInReply({ patientId }: CheckInReplyProps) {
  const [openReply, setOpenReply] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const send = async () => {
    if (!text.trim() || !patientId) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: parent } = await supabase
        .from("emoticon_messages" as any)
        .select("id, sender_id, patient_id")
        .eq("recipient_id", user.id)
        .eq("patient_id", patientId)
        .is("reply_to_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!parent) throw new Error("Original check-in not found");

      const { error } = await supabase.from("emoticon_messages" as any).insert({
        sender_id: user.id,
        recipient_id: (parent as any).sender_id,
        patient_id: patientId,
        emoticon: "💬",
        message: text,
        reply_to_id: (parent as any).id,
        vulas_awarded: 0,
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: (parent as any).sender_id,
        type: "checkin_reply",
        title: "Reply to your check-in",
        description: text,
        reference_id: patientId,
        is_read: false,
      });

      toast({ title: "Reply sent", description: "Your wealth manager has been notified." });
      setText("");
      setOpenReply(false);
    } catch (err: any) {
      toast({
        title: "Could not send reply",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!patientId) return null;

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      {!openReply ? (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpenReply(true)}>
          <Reply className="h-3.5 w-3.5" />
          Reply
        </Button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply to your wealth manager..."
            className="min-h-[70px] text-xs"
            disabled={sending}
          />
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={send} disabled={sending || !text.trim()}>
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpenReply(false)} disabled={sending}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
