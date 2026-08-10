import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, UploadCloud, File as FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePatients } from "@/hooks/usePatients";
import { useUpload } from "@/features/uploads/useUpload";
import { supabase } from "@/integrations/supabase/client";
import { UploadProgressBar, type UploadProgressState } from "./components/UploadProgressBar";
import { ApplyHistoryDialog, type ExtractedHistory } from "./components/ApplyHistoryDialog";

const ACCEPT = "audio/*,video/*,.pdf,.doc,.docx,.jpg,.jpeg,.png,.bmp,.dicom,image/*";
const NO_PATIENT_VALUE = "__none__";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

function inferMediaType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return file.type || "application/octet-stream";
}

export function UploadDocumentDialog({ open, onOpenChange, onUploaded }: UploadDocumentDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { patients } = usePatients();
  const { upload, isUploading } = useUpload("patient-media", { maxBytes: 20 * 1024 * 1024 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [patientId, setPatientId] = useState<string>(NO_PATIENT_VALUE);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState>({ stage: "idle", percent: 0 });
  const [pendingHistory, setPendingHistory] = useState<ExtractedHistory | null>(null);
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setPatientId(NO_PATIENT_VALUE);
    setFile(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next && !isSaving) reset();
    onOpenChange(next);
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (!name.trim()) setName(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  };

  const handleUpload = async () => {
    if (!user || !file || !name.trim()) return;
    setIsSaving(true);
    try {
      const selectedPatient =
        patientId !== NO_PATIENT_VALUE ? patients.find((p) => p.id === patientId) : null;

      // Storage RLS requires the first folder to be the uploader's own user id.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const path = `${user.id}/${selectedPatient?.id || "self"}/${Date.now()}-${safeName}`;

      setProgress({ stage: "uploading", percent: 25, fileName: file.name });
      const result = await upload(file, path);
      if (!result) {
        toast({
          title: "Upload failed",
          description: "Could not upload the file",
          variant: "destructive",
        });
        return;
      }

      // Photos and scans of handwritten records get transcribed, then the
      // extracted history is offered for the patient record.
      let content = `[FILE] ${name.trim()}`;
      let transcribed = false;
      const canTranscribe = file.type.startsWith("image/") || file.type === "application/pdf";
      if (canTranscribe) {
        setProgress({ stage: "transcribing", percent: 55, fileName: file.name });
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
            setProgress({ stage: "extracting", percent: 70, fileName: file.name });
            if (selectedPatient?.id && data?.history) {
              setHistoryPatientId(selectedPatient.id);
              setPendingHistory(data.history as ExtractedHistory);
            }
          }
        } catch {
          /* keep the plain upload record */
        }
      }

      setProgress({ stage: "saving", percent: 85, fileName: file.name });
      const { error: docError } = await supabase.from("documents").insert({
        name: name.trim(),
        content,
        template_name: transcribed ? "Historical Record" : undefined,
        is_transcribed: transcribed,
        user_id: user.id,
        patient_id: selectedPatient?.id || null,
        patient_name: selectedPatient?.name || null,
        media_url: result.url,
        media_type: inferMediaType(file),
      } as any);
      if (docError) throw docError;

      setProgress({ stage: "done", percent: 100, fileName: file.name });
      toast({ title: "Document Uploaded", description: `"${name.trim()}" has been saved` });
      onUploaded?.();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      const message = err.message || "Failed to upload document";
      setProgress((prev) => ({ ...prev, stage: "error", message }));
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
      setTimeout(
        () => setProgress((prev) => (prev.stage === "error" ? prev : { stage: "idle", percent: 0 })),
        1500,
      );
    }
  };

  const busy = isSaving || isUploading;

  return (
    <>
    {historyPatientId && pendingHistory && (
      <ApplyHistoryDialog
        open
        onOpenChange={(o) => {
          if (!o) {
            setPendingHistory(null);
            setHistoryPatientId(null);
          }
        }}
        patientId={historyPatientId}
        history={pendingHistory}
        onApplied={() => {
          setPendingHistory(null);
          setHistoryPatientId(null);
          onUploaded?.();
        }}
      />
    )}
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload a document, image or media file to the documents library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm">Document Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blood Test Results"
            />
          </div>

          <div>
            <Label className="text-sm">Patient (optional)</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="No patient (practice document)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PATIENT_VALUE}>No patient (practice document)</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">File</Label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex flex-col items-center gap-1.5">
                  <FileIcon className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium truncate max-w-full">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a file here, or click to browse
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPT}
                onChange={handleFileChange}
              />
            </div>
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-auto p-0 text-xs text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </Button>
            )}
          </div>
          <UploadProgressBar state={progress} />
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleUpload} disabled={busy || !file || !name.trim()}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
