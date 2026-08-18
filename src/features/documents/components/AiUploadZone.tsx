import { useCallback, useRef, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UploadProgressBar, type UploadProgressState } from "./UploadProgressBar";
import { ApplyHistoryDialog, type ExtractedHistory } from "./ApplyHistoryDialog";
import { UploadDocumentsDialog, type UploadDetails } from "./UploadDocumentsDialog";

interface AiUploadZoneProps {
  patientId?: string;
  patientName?: string;
  /** Categories offered in the dialog, taken from documents already stored. */
  knownCategories?: string[];
  /** Called after every batch so the caller can refresh its list. */
  onUploaded?: (lastDocumentId: string | null) => void;
  className?: string;
}

/**
 * The prominent "upload a file and let AI describe it" drop zone.
 * Shared by the Documents screen and every patient Documents tab so both
 * behave identically: category prompt, live stage feedback, AI analysis of
 * images and transcription of handwritten PDFs.
 */
export function AiUploadZone({
  patientId,
  patientName,
  knownCategories = [],
  onUploaded,
  className,
}: AiUploadZoneProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState>({ stage: "idle", percent: 0 });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingHistory, setPendingHistory] = useState<ExtractedHistory | null>(null);
  const [recordDate, setRecordDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[], details: UploadDetails) => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be signed in to upload");

        let index = 0;
        let lastId: string | null = null;
        for (const file of files) {
          index += 1;
          const meta = { fileName: file.name, current: index, total: files.length };
          setProgress({ stage: "uploading", percent: 20, ...meta });
          if (file.size > 20 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds the 20MB limit`,
              variant: "destructive",
            });
            continue;
          }

          // Storage RLS requires the first folder to be the uploader's user id.
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
          const path = `${user.id}/${patientId || "self"}/${Date.now()}-${safeName}`;
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
          let detectedRecordDate: string | null = null;

          if (isPdf) {
            setProgress({ stage: "transcribing", percent: 60, ...meta });
            try {
              const { data, error } = await supabase.functions.invoke("transcribe-record", {
                body: {
                  storagePath: path,
                  bucket: "patient-media",
                  mimeType: file.type,
                  fileName: file.name,
                },
              });
              if (!error && data?.text) {
                content = data.text;
                transcribed = true;
                setProgress({ stage: "extracting", percent: 75, ...meta });
                const rd = (data?.history as any)?.record_date;
                if (typeof rd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rd)) detectedRecordDate = rd;
                if (patientId && data?.history) setPendingHistory(data.history as ExtractedHistory);
              }
            } catch {
              /* fall back to the plain upload record */
            }
          }


          setProgress({ stage: "saving", percent: 85, ...meta });
          const { data: inserted, error: insertError } = await supabase
            .from("documents")
            .insert({
              user_id: user.id,
              patient_id: patientId || null,
              patient_name: patientName || null,
              name: file.name,
              content,
              template_name: details.category || "Upload",
              media_url: publicUrl,
              media_type: isImage ? "image" : isPdf ? "pdf" : "file",
              source_file_url: publicUrl,
              source_file_name: file.name,
              is_transcribed: transcribed,
              record_date: details.recordDate || detectedRecordDate || null,
            } as any)
            .select("id")
            .maybeSingle();
          if (insertError) throw insertError;
          lastId = inserted?.id || lastId;

          if (isImage && inserted?.id) {
            setProgress({ stage: "analysing", percent: 92, ...meta });
            const { data: aiData, error: aiError } = await supabase.functions.invoke(
              "analyze-medical-image",
              {
                body: {
                  imageUrl: publicUrl,
                  storagePath: path,
                  bucket: "patient-media",
                  documentId: inserted.id,
                },
              },
            );
            const failure = aiError ? (aiData as any)?.error || aiError.message : null;
            if (aiError) {
              toast({
                title: "Uploaded, but AI description failed",
                description: `${file.name}: ${failure}. Open the file and use “Analyse with AI”.`,
                variant: "destructive",
              });
            }
          }
        }

        setProgress({ stage: "done", percent: 100 });
        toast({ title: "Upload complete" });
        onUploaded?.(lastId);
      } catch (err: any) {
        const message = err?.message || "Could not upload the file";
        setProgress((prev) => ({ ...prev, stage: "error", message }));
        toast({ title: "Upload failed", description: message, variant: "destructive" });
      } finally {
        setUploading(false);
        setTimeout(
          () => setProgress((prev) => (prev.stage === "error" ? prev : { stage: "idle", percent: 0 })),
          2500,
        );
      }
    },
    [patientId, patientName, toast, onUploaded],
  );

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
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
          "rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-primary/40 bg-primary/[0.03]",
        )}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">
          Upload a file to have AI describe it
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Drag an X-ray, CT, MRI, photo or PDF here — or choose a file. Images are
          interpreted by AI, PDFs of handwritten notes are transcribed. You'll be
          asked for a category next.
        </p>
        <Button
          className="mt-4 gap-2"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Choose file
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

      {pendingFiles.length > 0 && (
        <UploadDocumentsDialog
          files={pendingFiles}
          knownCategories={knownCategories}
          onCancel={() => setPendingFiles([])}
          onConfirm={(details) => {
            const files = pendingFiles;
            setPendingFiles([]);
            setRecordDate(details.recordDate);
            void uploadFiles(files, details);
          }}
        />
      )}

      <UploadProgressBar state={progress} />

      {patientId && pendingHistory && (
        <ApplyHistoryDialog
          open
          onOpenChange={(o) => !o && setPendingHistory(null)}
          patientId={patientId}
          history={pendingHistory}
          recordDate={recordDate || undefined}
          onApplied={() => {
            setPendingHistory(null);
            onUploaded?.(null);
          }}
        />
      )}
    </div>
  );
}
