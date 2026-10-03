import { SignedImage } from "./SignedImage";
import { useCallback, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Eye,
  FileText,
  Link2,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SECTION_CONTENT_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
} from "@/components/ui/section-accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDocuments, type Document } from "@/hooks/useDocuments";
import { DocumentPreview } from "@/features/sessions/components/DocumentPreview";
import { resolveDocumentPreviewContent } from "@/lib/resolveDocumentPreviewContent";
import { InformDocumentDialog } from "./InformDocumentDialog";
import { AiUploadZone } from "./AiUploadZone";
import { ApplyHistoryDialog, type ExtractedHistory } from "./ApplyHistoryDialog";
import { parseStorageUrl } from "../lib/signedMediaUrl";


import { cn } from "@/lib/utils";

type GroupBy = "type" | "date" | "patient";

interface DocumentsBrowserProps {
  /** Restrict to a single patient's documents. */
  patientId?: string;
  patientName?: string;
  /** Show documents from every owner the RLS policies allow. */
  allOwners?: boolean;
  /** Only list documents whose template name matches one of these (case-insensitive). */
  templateFilter?: string[];
  /** Copy shown when nothing matches. */
  emptyLabel?: string;
  className?: string;
}

const groupLabel = (doc: Document, groupBy: GroupBy) => {
  if (groupBy === "patient") return doc.patient_name || "Unassigned";
  if (groupBy === "date") return format(new Date(doc.created_at), "MMMM yyyy");
  return doc.template_name || "Uploaded / Other";
};

/**
 * Shared document list used by the Documents screen and by a patient profile's
 * Documents tab so both behave identically: search, grouping (by type by
 * default, newest first), inline preview, upload with optional AI transcription
 * of handwritten records, and link-only sharing via Inform.
 */
export function DocumentsBrowser({
  patientId,
  patientName,
  allOwners,
  templateFilter,
  emptyLabel,
  className,
}: DocumentsBrowserProps) {
  const { toast } = useToast();
  const { documents, loading, fetchDocuments, deleteDocument } = useDocuments(
    patientId,
    { allOwners },
  );

  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("type");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [informDoc, setInformDoc] = useState<Document | null>(null);
  const [analysingId, setAnalysingId] = useState<string | null>(null);
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [pendingHistory, setPendingHistory] = useState<{
    history: ExtractedHistory;
    patientId: string | null;
  } | null>(null);



  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const wanted = templateFilter?.map((t) => t.toLowerCase());
    const filtered = documents.filter((doc) => {
      if (wanted) {
        const name = (doc.template_name || "").toLowerCase();
        if (!wanted.some((w) => name.includes(w))) return false;
      }
      if (!term) return true;
      return (
        doc.name.toLowerCase().includes(term) ||
        (doc.template_name || "").toLowerCase().includes(term) ||
        (doc.patient_name || "").toLowerCase().includes(term)
      );
    });

    const map = new Map<string, Document[]>();
    for (const doc of filtered) {
      const key = groupLabel(doc, groupBy);
      const bucket = map.get(key) ?? [];
      bucket.push(doc);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).map(([label, docs]) => ({
      label,
      docs: docs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    }));
  }, [documents, search, groupBy, templateFilter]);

  const openPreview = async (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    try {
      const resolved = await resolveDocumentPreviewContent(doc as any);
      setPreviewContent(resolved.resolvedContent || doc.content || "");
    } catch {
      setPreviewContent(doc.content || "");
    } finally {
      setPreviewLoading(false);
    }
  };

  /** Categories already used on existing documents, offered again on upload. */
  const knownCategories = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      const name = (doc.template_name || "").trim();
      if (name && name.toLowerCase() !== "upload") set.add(name);
    }
    return Array.from(set).sort();
  }, [documents]);

  const analyseDocument = useCallback(
    async (doc: Document) => {
      const url = (doc as any).media_url as string | undefined;
      if (!url) return;
      setAnalysingId(doc.id);
      try {
        const { error } = await supabase.functions.invoke("analyze-medical-image", {
          body: { imageUrl: url, documentId: doc.id },
        });
        if (error) throw error;
        toast({ title: "AI description ready" });
        fetchDocuments();
        const resolved = await resolveDocumentPreviewContent(doc as any);
        setPreviewContent(resolved.resolvedContent || doc.content || "");
      } catch (err: any) {
        toast({
          title: "Could not describe the image",
          description: err?.message || "The AI analysis failed",
          variant: "destructive",
        });
      } finally {
        setAnalysingId(null);
      }
    },
    [toast, fetchDocuments],
  );

  /**
   * Re-runs the transcription/extraction on an already-uploaded record so the
   * clinical history it contains can be confirmed and applied again (records
   * uploaded before extraction existed never had that step).
   */
  const reExtractHistory = useCallback(
    async (doc: Document) => {
      const url = ((doc as any).media_url || (doc as any).source_file_url) as string | undefined;
      const ref = parseStorageUrl(url);
      if (!ref) {
        toast({ title: "No original file to re-read", variant: "destructive" });
        return;
      }
      setExtractingId(doc.id);
      try {
        const { data, error } = await supabase.functions.invoke("transcribe-record", {
          body: {
            storagePath: ref.path,
            bucket: ref.bucket,
            mimeType: (doc as any).media_type === "pdf" ? "application/pdf" : undefined,
            fileName: doc.name,
          },
        });
        if (error) throw error;
        const history = (data as any)?.history;
        if (!history) throw new Error("No clinical history could be read from this record");

        const rd = history.record_date;
        const updates: Record<string, unknown> = {};
        if ((data as any)?.text) {
          updates.content = (data as any).text;
          updates.is_transcribed = true;
        }
        if (!(doc as any).record_date && typeof rd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rd)) {
          updates.record_date = rd;
        }
        if (Object.keys(updates).length) {
          await supabase.from("documents").update(updates as any).eq("id", doc.id);
        }
        setPendingHistory({ history, patientId: (doc as any).patient_id || patientId || null });
        void fetchDocuments();
      } catch (err: any) {
        toast({
          title: "Could not re-extract the history",
          description: err?.message || "The AI extraction failed",
          variant: "destructive",
        });
      } finally {
        setExtractingId(null);
      }
    },
    [toast, fetchDocuments, patientId],
  );

  const handleUploaded = useCallback(
    (lastId: string | null) => {
      void fetchDocuments();
      if (lastId) setLastUploaded(lastId);
    },
    [fetchDocuments],
  );




  return (
    <div className={cn("space-y-4", className)}>
      <AiUploadZone
        patientId={patientId}
        patientName={patientName}
        knownCategories={knownCategories}
        onUploaded={handleUploaded}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="pl-9"
          />
        </div>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="type">Group by Type</SelectItem>
            <SelectItem value="date">Group by Date</SelectItem>
            <SelectItem value="patient">Group by Client</SelectItem>
          </SelectContent>
        </Select>
      </div>


      {/* List */}
      {loading ? (
        <div className="p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-card p-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{emptyLabel || "No documents yet"}</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={groups.map((g) => g.label)}
          className={SECTION_FRAME_CLASS}
        >
          {groups.map((group) => (
            <AccordionItem key={group.label} value={group.label} className={SECTION_ITEM_CLASS}>
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <span className="text-sm font-semibold">
                  {group.label} ({group.docs.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
              <div className="divide-y divide-border/50">
                {group.docs.map((doc) => {
                  const mediaUrl = (doc as any).media_url as string | undefined;
                  const isImageDoc =
                    !!mediaUrl && (doc as any).media_type === "image";
                  const hasAnalysis = !!(doc as any).ai_analysis;
                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex items-center gap-3 py-2 px-1 hover:bg-muted/30 transition-colors cursor-pointer",
                        lastUploaded === doc.id && "bg-primary/5 rounded-lg",
                      )}
                      onClick={() => openPreview(doc)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 overflow-hidden shrink-0">
                        {isImageDoc ? (
                          <SignedImage src={mediaUrl} alt={doc.name} className="h-10 w-10 object-cover" />
                        ) : (
                          <FileText className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date((doc as any).record_date || doc.created_at),
                            "MMM d, yyyy",
                          )}
                          {doc.patient_name && groupBy !== "patient" ? ` · ${doc.patient_name}` : ""}
                        </p>
                      </div>
                      {hasAnalysis && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-2xs font-medium text-primary">
                          <Sparkles className="h-3 w-3" /> AI described
                        </span>
                      )}
                      {(doc as any).is_transcribed && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-2xs font-medium text-violet-700">
                          <Sparkles className="h-3 w-3" /> AI transcribed
                        </span>
                      )}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Open"
                          onClick={() => openPreview(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="h-7 w-7 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                          title="Inform a colleague"
                          onClick={() => setInformDoc(doc)}
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                        <button
                          className="h-7 w-7 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {previewDoc && (
        <DocumentPreview
          title={previewDoc.name}
          subtitle={previewDoc.patient_name || undefined}
          content={previewLoading ? "Loading…" : previewContent}
          onClose={() => setPreviewDoc(null)}
          extraActions={
            <>
              {(previewDoc as any).media_url &&
                (previewDoc as any).media_type === "image" &&
                !(previewDoc as any).ai_analysis && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={analysingId === previewDoc.id}
                    onClick={() => analyseDocument(previewDoc)}
                  >
                    {analysingId === previewDoc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Analyse with AI
                  </Button>
                )}
              {((previewDoc as any).is_transcribed ||
                (previewDoc as any).media_type === "pdf") && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={extractingId === previewDoc.id}
                  onClick={() => reExtractHistory(previewDoc)}
                >
                  {extractingId === previewDoc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Re-extract history
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setInformDoc(previewDoc)}
              >
                <Link2 className="h-4 w-4" />
                Inform
              </Button>
            </>
          }
        />
      )}

      {informDoc && (
        <InformDocumentDialog
          documentId={informDoc.id}
          documentName={informDoc.name}
          open={!!informDoc}
          onOpenChange={(open) => !open && setInformDoc(null)}
        />
      )}

      {pendingHistory?.patientId && (
        <ApplyHistoryDialog
          open
          onOpenChange={(o) => !o && setPendingHistory(null)}
          patientId={pendingHistory.patientId}
          history={pendingHistory.history}
          recordDate={pendingHistory.history.record_date || undefined}
          onApplied={() => {
            setPendingHistory(null);
            void fetchDocuments();
          }}
        />
      )}
    </div>
  );
}
