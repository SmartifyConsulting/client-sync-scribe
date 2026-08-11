import { useEffect, useState } from "react";
import { FileText, Pill, Receipt, Users, Send, Pencil, Check, Save, Eye, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GeneratedDoc } from "./GeneratedDocumentsDialog";
import { FollowUpAppointmentDialog } from "./FollowUpAppointmentDialog";
import { VisitCategoryDialog } from "./VisitCategoryDialog";
import { ClinicianNotesAccordion } from "./ClinicianNotesAccordion";
import { DocumentPreview } from "./DocumentPreview";
import { useProfile } from "@/hooks/useProfile";
import { useHeaderFooterTemplates } from "@/hooks/useHeaderFooterTemplates";

const DOC_ICONS: Record<string, typeof FileText> = {
  medcert: FileText,
  prescription: Pill,
  invoice: Receipt,
  referral: Users,
};

export type DocStepType = "prescription" | "medcert" | "referral" | "invoice";
export type PostSessionStepType = DocStepType | "schedule" | "vula";

interface PostSessionStepDialogProps {
  open: boolean;
  stepType: DocStepType;
  doc: GeneratedDoc | null;
  onSend: (doc: GeneratedDoc) => Promise<void>;
  onSaveEdit: (doc: GeneratedDoc, newContent: string) => Promise<void>;
  /** Move on to the next step in the post-session queue. */
  onAdvance: () => void;
  /** Cleaned AI Clinician notes, reviewable from the prescription step. */
  clinicianNotes?: string | null;
}

function extractInvoiceTotal(content: string): string {
  const match = content.match(/Total:\s*R\s*([\d,.]+)/i);
  return match ? `R ${match[1]}` : "—";
}

/**
 * Renders exactly one post-session step at a time (prescription / medcert /
 * referral / invoice). Send and Save each play a brief confirmation
 * animation before auto-advancing the queue.
 */
function DocStepDialog({
  open,
  stepType,
  doc,
  onSend,
  onSaveEdit,
  onAdvance,
  clinicianNotes,
}: PostSessionStepDialogProps) {
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [anim, setAnim] = useState<"idle" | "sending" | "sent" | "saving" | "saved">("idle");
  const [invoiceStage, setInvoiceStage] = useState<"summary" | "detail">("summary");
  const [showPreview, setShowPreview] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const { profile } = useProfile();
  const { templates: headerFooterTemplates } = useHeaderFooterTemplates();
  // Preview the document exactly as it will be printed/emailed — with the
  // practice letterhead and footer applied, not as bare content.
  const headerFooter =
    (headerFooterTemplates || []).find((t) => /header and footer|default/i.test(t.name || "")) ||
    (headerFooterTemplates || [])[0] ||
    null;

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setAnim("idle");
    setInvoiceStage("summary");
    setShowPreview(false);
    setShowNotes(false);
    setDraftContent(doc?.content || "");
  }, [open, doc?.key]);

  if (!doc) return null;
  const Icon = DOC_ICONS[stepType] || FileText;

  const handleSend = async () => {
    setBusy(true);
    setAnim("sending");
    try {
      await onSend(doc);
    } finally {
      setBusy(false);
    }
    setTimeout(() => {
      setAnim("sent");
      setTimeout(() => onAdvance(), 900);
    }, 1000);
  };

  const handleSave = async (content?: string) => {
    setBusy(true);
    setAnim("saving");
    try {
      await onSaveEdit(doc, content ?? doc.content);
    } finally {
      setBusy(false);
    }
    setTimeout(() => {
      setAnim("saved");
      setTimeout(() => onAdvance(), 900);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[560px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {anim === "sending" || anim === "saving" ? (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            {anim === "sending" ? (
              <Send className="h-10 w-10 text-primary animate-plane-send" />
            ) : (
              <Save className="h-10 w-10 text-primary animate-disk-save" />
            )}
            <p className="text-sm text-muted-foreground">{anim === "sending" ? "Sending..." : "Saving..."}</p>
          </div>
        ) : anim === "sent" || anim === "saved" ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 animate-scale-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {anim === "sent" ? (stepType === "invoice" ? "Invoice sent" : "Sent") : "Saved"}
            </p>
          </div>
        ) : stepType === "invoice" && invoiceStage === "summary" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Invoice
              </DialogTitle>
              <DialogDescription>Ready to review and send this session's invoice.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-bold text-foreground">{extractInvoiceTotal(doc.content)}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setInvoiceStage("detail")} className="w-full sm:w-auto gap-1.5">
                Preview Invoice
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {doc.label}
              </DialogTitle>
              {doc.recipientName && <DialogDescription>For {doc.recipientName}</DialogDescription>}
            </DialogHeader>

            <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border bg-white p-4">
              {editing ? (
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={12}
                  className="text-sm font-mono"
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: doc.content }} />
              )}
            </div>

            <DialogFooter className="flex-row gap-2 sm:justify-between flex-wrap">
              {editing ? (
                <div className="flex gap-2 w-full justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setDraftContent(doc.content);
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleSave(draftContent)} disabled={busy} className="gap-1.5">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 w-full justify-end flex-wrap">
                  <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-1.5">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  {stepType === "prescription" && clinicianNotes && (
                    <Button variant="outline" onClick={() => setShowNotes(true)} className="gap-1.5">
                      <Brain className="h-4 w-4" />
                      Review AI Clinician notes
                    </Button>
                  )}
                  {stepType !== "invoice" && (
                    <Button variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  {doc.recipientEmail && (
                    <Button
                      variant="outline"
                      onClick={handleSend}
                      disabled={busy || doc.sent}
                      className="gap-1.5"
                    >
                      <Send className="h-4 w-4" />
                      {doc.sent ? "Sent" : "Send"}
                    </Button>
                  )}
                  {stepType !== "invoice" && (
                    <Button onClick={() => handleSave()} disabled={busy} className="gap-1.5">
                      <Check className="h-4 w-4" />
                      Save &amp; Continue
                    </Button>
                  )}
                </div>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {showPreview && (
        <DocumentPreview
          title={doc.label}
          content={doc.content}
          logoUrl={profile?.logo_url || undefined}
          fontFamily={headerFooter?.font_family || undefined}
          headerFooter={headerFooter}
          onClose={() => setShowPreview(false)}
          closeLabel="Back"
        />
      )}

      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Clinician notes
            </DialogTitle>
            <DialogDescription>
              Review before finalising the prescription. Decision support only.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <ClinicianNotesAccordion notes={clinicianNotes} />
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}


interface PostSessionQueueDialogProps {
  /** Ordered post-session steps to run, one at a time. */
  queue: PostSessionStepType[];
  index: number;
  documents: GeneratedDoc[];
  onSend: (doc: GeneratedDoc) => Promise<void>;
  onSaveEdit: (doc: GeneratedDoc, newContent: string) => Promise<void>;
  onAdvance: () => void;
  onFinish: () => void;
  currentPatient: { id: string; name: string; patient_user_id: string | null } | null;
  doctorId: string;
  doctorName?: string;
  extractedFollowUp?: { follow_up_date?: string; follow_up_time?: string; notes?: string } | null;
  patientName?: string;
  transcript?: string;
  onVulaConfirm: (categories: string[] | null) => Promise<void> | void;
  /** AI Clinician notes surfaced on the prescription step. */
  clinicianNotes?: string | null;
}

/**
 * Drives the sequential post-session queue: document steps render the step
 * dialog above, while schedule and vula steps delegate to their own dialogs.
 */
export function PostSessionStepDialog({
  queue,
  index,
  documents,
  onSend,
  onSaveEdit,
  onAdvance,
  onFinish,
  currentPatient,
  doctorId,
  doctorName,
  extractedFollowUp,
  patientName,
  transcript,
  onVulaConfirm,
  clinicianNotes,
}: PostSessionQueueDialogProps) {
  const step = queue[index];
  if (!step) return null;

  if (step === "schedule") {
    if (!currentPatient || !doctorId) {
      return null;
    }
    return (
      <FollowUpAppointmentDialog
        open
        onOpenChange={(o) => {
          if (!o) onAdvance();
        }}
        doctorId={doctorId}
        doctorName={doctorName}
        patientId={currentPatient.id}
        patientUserId={currentPatient.patient_user_id}
        patientName={patientName || currentPatient.name}
        suggestedDate={extractedFollowUp?.follow_up_date}
        suggestedTime={extractedFollowUp?.follow_up_time}
        onDone={onAdvance}
      />
    );
  }

  if (step === "vula") {
    return (
      <VisitCategoryDialog
        open
        onOpenChange={(o) => {
          if (!o) onFinish();
        }}
        patientName={patientName}
        transcript={transcript}
        onConfirm={async (categories) => {
          await onVulaConfirm(categories);
          onFinish();
        }}
      />
    );
  }

  const doc = documents.find((d) => d.key === step) || null;
  if (!doc) return null;

  return (
    <DocStepDialog
      open
      stepType={step}
      doc={doc}
      onSend={onSend}
      onSaveEdit={onSaveEdit}
      onAdvance={onAdvance}
      clinicianNotes={clinicianNotes}
    />
  );
}
