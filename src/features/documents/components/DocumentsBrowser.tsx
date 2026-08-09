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
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = documents.filter((doc) => {
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
  }, [documents, search, groupBy]);

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

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be signed in to upload");

        for (const file of Array.from(files)) {
          if (file.size > 20 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds the 20MB limit`,
              variant: "destructive",
            });
            continue;
          }

          const path = `${patientId || user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("patient-media")
            .upload(path, file, { upsert: true });
          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("patient-media").getPublicUrl(path);

          const isImage = file.type.startsWith("image/");
          const isPdf = file.type === "application/pdf";

          let content = `[Uploaded File] ${file.name}`;
          let transcribed = false;

          if (isImage || isPdf) {
            try {
              const { data, error } = await supabase.functions.invoke(
                "transcribe-record",
                { body: { fileUrl: publicUrl, mimeType: file.type, fileName: file.name } },
              );
              if (!error && data?.text) {
                content = data.text;
                transcribed = true;
              }
            } catch {
              /* fall back to the plain upload record */
            }
          }

          const { error: insertError } = await supabase.from("documents").insert({
            user_id: user.id,
            patient_id: patientId || null,
            patient_name: patientName || null,
            name: file.name,
            content,
            template_name: transcribed ? "Historical Record" : "Upload",
            media_url: publicUrl,
            media_type: isImage ? "image" : isPdf ? "pdf" : "file",
            source_file_url: publicUrl,
            source_file_name: file.name,
            is_transcribed: transcribed,
          } as any);
          if (insertError) throw insertError;
        }

        toast({ title: "Upload complete" });
        fetchDocuments();
      } catch (err: any) {
        toast({
          title: "Upload failed",
          description: err?.message || "Could not upload the file",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [patientId, patientName, toast, fetchDocuments],
  );

  return (
    <div className={cn("space-y-4", className)}>
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
            <SelectItem value="patient">Group by Patient</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="gap-2"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        Drop files here to upload. Photos or scans of handwritten records are
        transcribed automatically by AI.
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
          <p className="text-xs text-muted-foreground">No documents yet</p>
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
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 py-2 px-1 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openPreview(doc)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 overflow-hidden shrink-0">
                        {isImageDoc ? (
                          <img src={mediaUrl} alt={doc.name} className="h-8 w-8 object-cover" />
                        ) : (
                          <FileText className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), "MMM d, yyyy")}
                          {doc.patient_name && groupBy !== "patient" ? ` · ${doc.patient_name}` : ""}
                        </p>
                      </div>
                      {(doc as any).is_transcribed && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
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
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setInformDoc(previewDoc)}
            >
              <Link2 className="h-4 w-4" />
              Inform
            </Button>
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
    </div>
  );
}
