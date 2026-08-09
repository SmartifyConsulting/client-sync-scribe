import { useEffect, useState } from "react";
import { FileText, Pill, Receipt, Users, Send, Pencil, Check, Save } from "lucide-react";
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

const DOC_ICONS: Record<string, typeof FileText> = {
  medcert: FileText,
  prescription: Pill,
  invoice: Receipt,
  referral: Users,
};

export type DocStepType = "prescription" | "medcert" | "referral" | "invoice";

interface PostSessionStepDialogProps {
  open: boolean;
  stepType: DocStepType;
  doc: GeneratedDoc | null;
  onSend: (doc: GeneratedDoc) => Promise<void>;
  onSaveEdit: (doc: GeneratedDoc, newContent: string) => Promise<void>;
  /** Move on to the next step in the post-session queue. */
  onAdvance: () => void;
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
export function PostSessionStepDialog({
  open,
  stepType,
  doc,
  onSend,
  onSaveEdit,
  onAdvance,
}: PostSessionStepDialogProps) {
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [anim, setAnim] = useState<"idle" | "sending" | "sent" | "saving" | "saved">("idle");
  const [invoiceStage, setInvoiceStage] = useState<"summary" | "detail">("summary");

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setAnim("idle");
    setInvoiceStage("summary");
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
    </Dialog>
  );
}
