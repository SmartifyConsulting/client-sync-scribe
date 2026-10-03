import { useEffect, useState } from "react";
import { FileText, Wallet as Pill, Receipt, Users, Send, Pencil, Check, Loader2, ArrowLeft, Eye } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GeneratedDocKey = "medcert" | "prescription" | "invoice" | "referral";

export interface GeneratedDoc {
  key: GeneratedDocKey;
  label: string;
  documentId: string | null;
  content: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  sent?: boolean;
}

const DOC_ICONS: Record<GeneratedDocKey, typeof FileText> = {
  medcert: FileText,
  prescription: Pill,
  invoice: Receipt,
  referral: Users,
};

interface GeneratedDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: GeneratedDoc[];
  onSend: (doc: GeneratedDoc) => Promise<void>;
  onSaveEdit: (doc: GeneratedDoc, newContent: string) => Promise<void>;
  onContinue: () => void;
  /** When set, the dialog opens straight into this document's preview. */
  openDocKey?: GeneratedDocKey | null;
}

export function GeneratedDocumentsDialog({
  open,
  onOpenChange,
  documents,
  onSend,
  onSaveEdit,
  onContinue,
  openDocKey = null,
}: GeneratedDocumentsDialogProps) {
  const [viewingKey, setViewingKey] = useState<GeneratedDocKey | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [busyKey, setBusyKey] = useState<GeneratedDocKey | null>(null);

  useEffect(() => {
    if (!open) return;
    setViewingKey(openDocKey);
    setEditing(false);
    const doc = documents.find((d) => d.key === openDocKey);
    if (doc) setDraftContent(doc.content);
  }, [open, openDocKey, documents]);

  const viewingDoc = documents.find((d) => d.key === viewingKey) || null;

  const openView = (doc: GeneratedDoc) => {
    setViewingKey(doc.key);
    setEditing(false);
    setDraftContent(doc.content);
  };

  const backToList = () => {
    setViewingKey(null);
    setEditing(false);
  };

  const handleSend = async (doc: GeneratedDoc) => {
    setBusyKey(doc.key);
    try {
      await onSend(doc);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveEdit = async (doc: GeneratedDoc) => {
    setBusyKey(doc.key);
    try {
      await onSaveEdit(doc, draftContent);
      setEditing(false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setViewingKey(null);
      setEditing(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        {viewingDoc ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1.5" onClick={backToList}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {viewingDoc.label}
              </DialogTitle>
              {viewingDoc.recipientName && (
                <DialogDescription>For {viewingDoc.recipientName}</DialogDescription>
              )}
            </DialogHeader>

            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-border bg-card p-4">
              {editing ? (
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={12}
                  className="text-sm font-mono"
                />
              ) : (
                <div
                  className="whitespace-pre-wrap text-sm"
                  dangerouslySetInnerHTML={{ __html: viewingDoc.content }}
                />
              )}
            </div>

            <DialogFooter className="flex-row gap-2 sm:justify-between">
              {editing ? (
                <div className="flex gap-2 w-full justify-end">
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={busyKey === viewingDoc.key}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleSaveEdit(viewingDoc)} disabled={busyKey === viewingDoc.key} className="gap-1.5">
                    {busyKey === viewingDoc.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 w-full justify-end flex-wrap">
                  <Button variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  {viewingDoc.recipientEmail && (
                    <Button
                      variant="outline"
                      onClick={() => handleSend(viewingDoc)}
                      disabled={busyKey === viewingDoc.key || viewingDoc.sent}
                      className="gap-1.5"
                    >
                      {busyKey === viewingDoc.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {viewingDoc.sent ? "Sent" : "Send"}
                    </Button>
                  )}
                  <Button onClick={backToList} className="gap-1.5">
                    <Check className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Documents Generated</DialogTitle>
              <DialogDescription>
                These documents were created from this session. View each to edit, send, or save it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {documents.map((doc) => {
                const Icon = DOC_ICONS[doc.key];
                return (
                  <div
                    key={doc.key}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                      {doc.sent && (
                        <Badge variant="secondary" className="text-2xs bg-sky-50 text-primary dark:bg-primary/15 dark:text-primary mt-0.5">
                          Sent
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openView(doc)} className="gap-1.5 shrink-0">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button onClick={onContinue} className={cn("w-full sm:w-auto")}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
