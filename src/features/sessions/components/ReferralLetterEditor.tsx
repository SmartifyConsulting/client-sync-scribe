import { useEffect, useState } from "react";
import { X, FileText, Loader2, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { buildGreeting } from "@/lib/greeting";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTemplateWithHeaderFooter } from "@/hooks/useTemplateWithHeaderFooter";
import { DocumentPreview } from "./DocumentPreview";
import { Checkbox } from "@/components/ui/checkbox";
import { Paperclip, Send } from "lucide-react";

interface ReferralLetterEditorProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (letter: { content: string }) => void;
}

const FALLBACK_TEMPLATE = `REFERRAL LETTER

[PRACTICE_ADDRESS]
Practice No: [PRACTICE_NUMBER]
Registration No: [DOCTOR_NUMBER]

Date: [DATE]
Patient: [PATIENT_NAME]
Referring Doctor: [DOCTOR_NAME]

─────────────────────────────────────

[GREETING],

I am referring the above-named patient for your expert opinion and management.

Referred To: [REFERRED_TO]

[REFERRAL_CONTENT]

─────────────────────────────────────

Thank you for seeing this patient.

Yours sincerely,

Signature: ___________________
           [DOCTOR_NAME]
`;

export function ReferralLetterEditor({ 
  patientId,
  patientName,
  sessionId,
  onClose, 
  onSave 
}: ReferralLetterEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { formattedContent: savedTemplate, headerFooter, isLoading: templateLoading } = useTemplateWithHeaderFooter("Referral Letter");
  
  const doctorName = profile?.full_name || "Doctor";
  const practiceNumber = profile?.practice_number || "";
  const practiceAddress = profile?.practice_address || "";
  const doctorNumber = profile?.doctor_number || "";
  
  const [referredTo, setReferredTo] = useState("");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [currentDiagnosis, setCurrentDiagnosis] = useState("");
  const [reasonForReferral, setReasonForReferral] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Documents on file for this patient that can be emailed together with the referral.
  const [availableDocs, setAvailableDocs] = useState<Array<{ id: string; name: string }>>([]);
  const [attachedIds, setAttachedIds] = useState<string[]>([]);

  const baseTemplate = savedTemplate || FALLBACK_TEMPLATE;

  const [referralOptions, setReferralOptions] = useState<
    Array<{ id: string; label: string; specialty: string | null; address: string | null; email: string | null }>
  >([]);
  const [selectedReferralId, setSelectedReferralId] = useState<string>("");

  // Load the doctor's saved referral doctors so the user can pick one
  // instead of typing the name from scratch.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("referral_doctors")
        .select("id, first_name, last_name, specialty, address, email")
        .eq("user_id", user.id)
        .order("last_name", { ascending: true });
      setReferralOptions(
        (data || []).map((d: any) => ({
          id: d.id,
          label: `Dr ${[d.first_name, d.last_name].filter(Boolean).join(" ")}`.trim(),
          specialty: d.specialty,
          address: d.address,
          email: d.email,
        })),
      );
    })();
  }, []);

  // Documents already on file for this patient — these can be attached so they
  // are emailed together with the referral letter.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, name")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(30);
      setAvailableDocs((data || []) as Array<{ id: string; name: string }>);
    })();
  }, [patientId]);

  // Auto-populate a referral summary from the latest session for this patient.
  useEffect(() => {
    if (clinicalHistory || currentDiagnosis) return; // don't overwrite user input
    (async () => {
      const query = supabase
        .from("sessions")
        .select("started_at, summary, transcript, notes")
        .eq("patient_id", patientId)
        .order("started_at", { ascending: false })
        .limit(1);
      const { data } = sessionId
        ? await supabase
            .from("sessions")
            .select("started_at, summary, transcript, notes")
            .eq("id", sessionId)
            .maybeSingle()
            .then((r) => ({ data: r.data ? [r.data] : [] }))
        : await query;
      const s = (data || [])[0] as any;
      if (!s) return;
      const dateStr = s.started_at ? new Date(s.started_at).toLocaleDateString() : "";
      const summary = s.summary || s.notes || (s.transcript ? String(s.transcript).slice(0, 600) : "");
      if (!summary) return;
      setClinicalHistory(
        `Appointment on ${dateStr}.\n\n${summary}`.trim(),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, sessionId]);

  const generateReferralContent = () => {
    let content = "";
    if (clinicalHistory) content += `Clinical History:\n${clinicalHistory}\n\n`;
    if (currentDiagnosis) content += `Current Diagnosis:\n${currentDiagnosis}\n\n`;
    if (reasonForReferral) content += `Reason for Referral:\n${reasonForReferral}`;
    return content.trim();
  };

  const generateContent = () => {
    return baseTemplate
      .replace(/\[DATE\]/g, new Date().toLocaleDateString())
      .replace(/\[ReferralDate\]/g, new Date().toLocaleDateString())
      .replace(/\[PATIENT_NAME\]/g, patientName)
      .replace(/\[PatientName\]/g, patientName)
      .replace(/\[DOCTOR_NAME\]/g, doctorName)
      .replace(/\[DoctorName\]/g, doctorName)
      .replace(/\[PRACTICE_NUMBER\]/g, practiceNumber)
      .replace(/\[PracticeNumber\]/g, practiceNumber)
      .replace(/\[PRACTICE_ADDRESS\]/g, practiceAddress)
      .replace(/\[PracticeAddress\]/g, practiceAddress)
      .replace(/\[DOCTOR_NUMBER\]/g, doctorNumber)
      .replace(/\[DoctorNumber\]/g, doctorNumber)
      .replace(/\[GREETING\]/g, buildGreeting({ fullName: referredTo, isPractitioner: true }))
      .replace("[REFERRED_TO]", referredTo)
      .replace("[REFERRAL_CONTENT]", generateReferralContent());
  };

  /** Persists the referral and returns the created document id. */
  const persistReferral = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("documents")
      .insert({
        name: `Referral Letter - ${patientName} - ${new Date().toLocaleDateString()}`,
        content: generateContent(),
        patient_id: patientId,
        patient_name: patientName,
        template_name: "Referral Letter",
        user_id: user.id,
        linked_document_ids: attachedIds,
      } as any)
      .select("id")
      .single();
    if (error) throw error;
    return (data as any)?.id ?? null;
  };

  /** Saves the referral and emails it — with any attached documents — to the
   *  referring doctor in one message. */
  const handleSendToReferringDoctor = async () => {
    const recipient =
      referralOptions.find((o) => o.id === selectedReferralId)?.email || "";
    if (!recipient) {
      toast({
        title: "No email address",
        description: "Pick a referral doctor that has an email address on file.",
        variant: "destructive",
      });
      return;
    }
    if (!referredTo.trim() || !reasonForReferral.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the specialist/hospital and reason for referral",
        variant: "destructive",
      });
      return;
    }
    setIsSending(true);
    try {
      const documentId = await persistReferral();
      const { error } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: recipient,
          subject: `Referral Letter for ${patientName}`,
          documentName: `Referral Letter - ${patientName}`,
          documentContent: generateContent(),
          senderName: doctorName,
          attachedDocumentIds: attachedIds,
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
        title: "Referral sent",
        description: `Emailed to ${recipient}${attachedIds.length ? ` with ${attachedIds.length} attachment(s)` : ""}`,
      });
      onSave({ content: generateContent() });
      onClose();
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: err?.message || "Could not send the referral letter",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSave = async () => {
    if (!referredTo.trim() || !reasonForReferral.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the specialist/hospital and reason for referral",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const content = generateContent();

      const { error } = await supabase
        .from('documents')
        .insert({
          name: `Referral Letter - ${patientName} - ${new Date().toLocaleDateString()}`,
          content: content,
          patient_id: patientId,
          patient_name: patientName,
          template_name: 'Referral Letter',
          user_id: user.id,
          linked_document_ids: attachedIds,
        } as any);

      if (error) throw error;

      onSave({ content });
      toast({
        title: "Referral Letter Saved",
        description: "The referral letter has been saved",
      });
      onClose();
    } catch (error: any) {
      console.error("Error saving referral letter:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save referral letter",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (showPreview) {
    return (
      <DocumentPreview
        title="Referral Letter"
        subtitle={`Patient: ${patientName}`}
        content={generateContent()}
        logoUrl={profile?.logo_url || undefined}
        fontFamily={headerFooter?.font_family || undefined}
        headerFooter={headerFooter}
        onClose={() => setShowPreview(false)}
        closeLabel="Back to Form"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Referral Letter</h2>
              <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="referred-to">Referred To (Specialist/Hospital) *</Label>
            {referralOptions.length > 0 && (
              <Select
                value={selectedReferralId}
                onValueChange={(id) => {
                  setSelectedReferralId(id);
                  const opt = referralOptions.find((o) => o.id === id);
                  if (opt) {
                    setReferredTo(
                      [opt.label, opt.specialty].filter(Boolean).join(" — "),
                    );
                  }
                }}
              >
                <SelectTrigger id="referred-to-picker">
                  <SelectValue placeholder="Pick from your referral doctors…" />
                </SelectTrigger>
                <SelectContent>
                  {referralOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}{o.specialty ? ` — ${o.specialty}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              id="referred-to"
              value={referredTo}
              onChange={(e) => setReferredTo(e.target.value)}
              placeholder="Or type the name (e.g., Dr Smith — Cardiologist)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinical-history">Clinical History</Label>
            <Textarea
              id="clinical-history"
              value={clinicalHistory}
              onChange={(e) => setClinicalHistory(e.target.value)}
              placeholder="Brief clinical history..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-diagnosis">Current Diagnosis</Label>
            <Textarea
              id="current-diagnosis"
              value={currentDiagnosis}
              onChange={(e) => setCurrentDiagnosis(e.target.value)}
              placeholder="Current diagnosis or suspected condition..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason-for-referral">Reason for Referral *</Label>
            <Textarea
              id="reason-for-referral"
              value={reasonForReferral}
              onChange={(e) => setReasonForReferral(e.target.value)}
              placeholder="Why is this referral being made..."
              className="min-h-[80px]"
            />
          </div>

          {availableDocs.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                Attach documents
              </Label>
              <p className="text-xs text-muted-foreground">
                Attached documents are emailed together with this referral.
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                {availableDocs.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={attachedIds.includes(d.id)}
                      onCheckedChange={(checked) =>
                        setAttachedIds((prev) =>
                          checked ? [...prev, d.id] : prev.filter((id) => id !== d.id),
                        )
                      }
                    />
                    <span className="truncate">{d.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={handleSendToReferringDoctor}
              disabled={isSending}
              className="gap-2"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to Referring Doctor
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save for Later
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
