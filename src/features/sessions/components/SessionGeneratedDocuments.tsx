import { useState } from "react";
import { FileText, Wallet as Pill, Receipt, Users, Send, Eye, Loader2, BookmarkCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GeneratedDoc, GeneratedDocKey } from "./GeneratedDocumentsDialog";

const DOC_ICONS: Record<GeneratedDocKey, typeof FileText> = {
  medcert: FileText,
  prescription: Pill,
  invoice: Receipt,
  referral: Users,
};

/** Strip HTML to a short plain-text teaser for the card preview. */
function snippet(html: string, max = 180) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

interface SessionGeneratedDocumentsProps {
  documents: GeneratedDoc[];
  onPreview: (doc: GeneratedDoc) => void;
  onSend: (doc: GeneratedDoc) => Promise<void>;
  onSaveForReview: (doc: GeneratedDoc) => void;
}

/**
 * Inline "Documents from this session" section shown on the session screen once
 * the AI has extracted documents from the transcript. Each card previews the
 * document and offers Preview / Send / Save for review.
 */
export function SessionGeneratedDocuments({
  documents,
  onPreview,
  onSend,
  onSaveForReview,
}: SessionGeneratedDocumentsProps) {
  const [busyKey, setBusyKey] = useState<GeneratedDocKey | null>(null);

  if (documents.length === 0) return null;

  const handleSend = async (doc: GeneratedDoc) => {
    setBusyKey(doc.key);
    try {
      await onSend(doc);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Documents from this consultation</h3>
        <Badge variant="secondary" className="text-[10px]">{documents.length}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {documents.map((doc) => {
          const Icon = DOC_ICONS[doc.key];
          const busy = busyKey === doc.key;
          return (
            <div key={doc.key} className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                  {doc.recipientName && (
                    <p className="text-[11px] text-muted-foreground truncate">For {doc.recipientName}</p>
                  )}
                </div>
                {doc.sent && (
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Sent
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {snippet(doc.content)}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onPreview(doc)}>
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
                {doc.recipientEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={busy || doc.sent}
                    onClick={() => handleSend(doc)}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {doc.sent ? "Sent" : "Send"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onSaveForReview(doc)}>
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Save for review
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
