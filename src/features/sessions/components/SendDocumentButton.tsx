import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendDocumentButtonProps {
  patientId: string;
  patientName: string;
  /** Human readable document name, e.g. "Prescription". */
  documentLabel: string;
  /** Produces the HTML/text content that gets emailed. */
  getContent: () => string;
  /**
   * Which patient field to prefer as recipient. Falls back to the patient's
   * own email address when the preferred field is empty.
   */
  preferredField?: "email" | "pharmacy_email" | "claims_email" | "reporting_to_email";
  /** Existing document row to stamp as sent. */
  documentId?: string | null;
  /** Called after a successful send. */
  onSent?: () => void;
  disabled?: boolean;
}

/**
 * Shared "Send" action used by every post-session document editor so that all
 * editors expose the same Cancel · Preview · Send · Save footer.
 */
export function SendDocumentButton({
  patientId,
  patientName,
  documentLabel,
  getContent,
  preferredField = "email",
  documentId,
  onSent,
  disabled,
}: SendDocumentButtonProps) {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    setSending(true);
    try {
      const { data: patient } = await supabase
        .from("patients")
        .select("email, pharmacy_email, claims_email, reporting_to_email")
        .eq("id", patientId)
        .maybeSingle();

      const recipient =
        (patient as any)?.[preferredField] || (patient as any)?.email || "";

      if (!recipient) {
        toast({
          title: "No recipient email",
          description: `Add an email address for ${patientName} before sending.`,
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      let senderName = "Your healthcare provider";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        senderName = profile?.full_name || senderName;
      }

      const { error } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: recipient,
          subject: `${documentLabel} for ${patientName}`,
          documentName: `${documentLabel} - ${patientName}`,
          documentContent: getContent(),
          senderName,
        },
      });
      if (error) throw error;

      if (documentId) {
        await supabase
          .from("documents")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", documentId);
      }

      toast({ title: `${documentLabel} sent`, description: `Emailed to ${recipient}` });
      onSent?.();
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: err?.message || `Could not send the ${documentLabel.toLowerCase()}`,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSend}
      className="gap-2"
      disabled={sending || disabled}
    >
      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Send
    </Button>
  );
}
