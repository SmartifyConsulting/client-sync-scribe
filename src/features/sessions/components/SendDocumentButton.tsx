import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { buildDocumentEmailHtml } from "@/features/documents/utils/documentEmailHtml";
import { buildDocumentPdfBase64, pdfFileName } from "@/features/documents/utils/documentPdf";

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
  /**
   * If the patient has a value in this field, it takes priority over
   * `preferredField` as the "to" recipient, and the patient's own email
   * (if on file) is automatically cc'd. Used e.g. by prescriptions so a
   * specified medical insurance gets the send and the patient stays looped in.
   */
  insuranceOverrideField?: "claims_email";
  /** Existing document row to stamp as sent. */
  documentId?: string | null;
  /** Letterhead used by the editor so the email matches the template exactly. */
  headerFooter?: any;
  /** Font key from the letterhead/template. */
  fontFamily?: string | null;
  /** Practice logo shown when no letterhead header exists. */
  logoUrl?: string | null;
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
  insuranceOverrideField,
  documentId,
  headerFooter,
  fontFamily,
  logoUrl,
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

      const insuranceEmail = insuranceOverrideField ? (patient as any)?.[insuranceOverrideField] : "";
      const recipient =
        insuranceEmail || (patient as any)?.[preferredField] || (patient as any)?.email || "";
      const ccPatient = insuranceEmail && (patient as any)?.email ? (patient as any).email : undefined;

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

      const content = getContent();
      const documentHtml = buildDocumentEmailHtml({
        content,
        headerFooter,
        fontFamily: fontFamily ?? headerFooter?.font_family ?? null,
        logoUrl,
        senderName,
      });

      const pdfBase64 = await buildDocumentPdfBase64(documentHtml);

      const { error } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: recipient,
          cc: ccPatient,
          subject: `${documentLabel} for ${patientName}`,
          documentName: `${documentLabel} - ${patientName}`,
          documentContent: content,
          documentHtml,
          senderName,
          attachments: pdfBase64
            ? [{ filename: pdfFileName(`${documentLabel}-${patientName}`), content: pdfBase64 }]
            : undefined,
        },
      });
      if (error) throw error;

      if (documentId) {
        await supabase
          .from("documents")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", documentId);
      }

      toast({
        title: `${documentLabel} sent`,
        description: ccPatient ? `Emailed to ${recipient}, cc ${ccPatient}` : `Emailed to ${recipient}`,
      });
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
