import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadListProps {
  patientId: string;
  documentKind: string;
  accept?: string;
  addLabel?: string;
}

/** Upload + list documents of a specific kind (e.g. "Will", "Health Record") for a client. */
export function DocumentUploadList({ patientId, documentKind, accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png", addLabel }: DocumentUploadListProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["client-documents", patientId, documentKind],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id,name,media_url,created_at")
        .eq("patient_id", patientId)
        .eq("document_kind", documentKind)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${patientId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("patient-media").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("patient-media").getPublicUrl(path);

      const docName = file.name.replace(/\.[^/.]+$/, "");
      const { error: docError } = await supabase.from("documents").insert({
        name: docName,
        content: `[FILE] ${docName}`,
        user_id: user.id,
        patient_id: patientId,
        media_url: publicUrl,
        media_type: file.type.startsWith("image/") ? "image" : "application/octet-stream",
        document_kind: documentKind,
      });
      if (docError) throw docError;

      toast.success(`${documentKind} uploaded`);
      qc.invalidateQueries({ queryKey: ["client-documents", patientId, documentKind] });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDoc = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error("Couldn't remove the document.");
    qc.invalidateQueries({ queryKey: ["client-documents", patientId, documentKind] });
  };

  return (
    <div className="space-y-2">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : docs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing uploaded yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
              <a href={d.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 hover:underline">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{d.name}</span>
              </a>
              <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => removeDoc(d.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
        {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
        {addLabel ?? `Upload ${documentKind.toLowerCase()}`}
      </Button>
    </div>
  );
}
