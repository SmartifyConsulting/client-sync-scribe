import { useState } from "react";
import { Loader2, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { buildDocumentEmailHtml } from "@/features/documents/utils/documentEmailHtml";
import { buildDocumentPdfBase64, pdfFileName } from "@/features/documents/utils/documentPdf";

interface PharmacyOption {
  id: string;
  name: string;
  email: string;
  branch?: string;
  is_primary?: boolean;
}

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
   * (if on file) is automatically cc'd.
   */
  insuranceOverrideField?: "claims_email";
  /**
   * Prescriptions: email the patient's pharmacy instead of `preferredField`.
   * If the patient has multiple pharmacies on file, the doctor is asked to
   * pick one (defaulting to whichever is marked primary) before sending.
   * The patient is always cc'd in this mode. Falls back to the legacy
   * pharmacy_name/pharmacy_email fields when no `pharmacies` entries exist.
   */
  pharmacyMode?: boolean;
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
  pharmacyMode,
  documentId,
  headerFooter,
  fontFamily,
  logoUrl,
  onSent,
  disabled,
}: SendDocumentButtonProps) {
  const [sending, setSending] = useState(false);
  const [pharmacyOptions, setPharmacyOptions] = useState<PharmacyOption[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [showPharmacyPicker, setShowPharmacyPicker] = useState(false);
  const [patientCcEmail, setPatientCcEmail] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const deliver = async (recipient: string, ccPatient?: string) => {
    if (!recipient) {
      toast({
        title: "No recipient email",
        description: `Add an email address for ${patientName} before sending.`,
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
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
      setShowPharmacyPicker(false);
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

  const handleSend = async () => {
    if (pharmacyMode) {
      setSending(true);
      try {
        const { data: patient } = await supabase
          .from("patients")
          .select("email, pharmacy_name, pharmacy_email, pharmacies")
          .eq("id", patientId)
          .maybeSingle();

        const patientEmail = (patient as any)?.email || undefined;
        const pharmacies: PharmacyOption[] = Array.isArray((patient as any)?.pharmacies)
          ? (patient as any).pharmacies
          : [];

        if (pharmacies.length > 1) {
          setPharmacyOptions(pharmacies);
          setPatientCcEmail(patientEmail);
          const primary = pharmacies.find((p) => p.is_primary) || pharmacies[0];
          setSelectedPharmacyId(primary?.id ?? null);
          setShowPharmacyPicker(true);
          setSending(false);
          return;
        }

        const single = pharmacies[0];
        const recipient = single?.email || (patient as any)?.pharmacy_email || "";
        setSending(false);
        await deliver(recipient, patientEmail);
      } catch (err: any) {
        setSending(false);
        toast({
          title: "Send failed",
          description: err?.message || "Could not look up the pharmacy",
          variant: "destructive",
        });
      }
      return;
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("email, pharmacy_email, claims_email, reporting_to_email")
      .eq("id", patientId)
      .maybeSingle();

    const insuranceEmail = insuranceOverrideField ? (patient as any)?.[insuranceOverrideField] : "";
    const recipient =
      insuranceEmail || (patient as any)?.[preferredField] || (patient as any)?.email || "";
    const ccPatient = insuranceEmail && (patient as any)?.email ? (patient as any).email : undefined;

    await deliver(recipient, ccPatient);
  };

  const selectedPharmacy = pharmacyOptions.find((p) => p.id === selectedPharmacyId);

  return (
    <>
      <Button
        variant="outline"
        onClick={handleSend}
        className="gap-2"
        disabled={sending || disabled}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send
      </Button>

      <Dialog open={showPharmacyPicker} onOpenChange={setShowPharmacyPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send prescription to which pharmacy?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {pharmacyOptions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPharmacyId(p.id)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                  selectedPharmacyId === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {p.name}
                    {p.is_primary && (
                      <span className="text-[10px] font-medium text-primary uppercase tracking-wide">Primary</span>
                    )}
                  </p>
                  {p.branch && <p className="text-xs text-muted-foreground">{p.branch}</p>}
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                {selectedPharmacyId === p.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPharmacyPicker(false)}>Cancel</Button>
            <Button
              disabled={!selectedPharmacy || sending}
              onClick={() => selectedPharmacy && deliver(selectedPharmacy.email, patientCcEmail)}
              className="gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
