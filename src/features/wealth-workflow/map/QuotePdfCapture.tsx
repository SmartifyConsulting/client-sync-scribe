import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DocPreviewDialog } from "./DocumentTray";

export function QuotePdfCapture({ workflowId, patientId, insurer, onActivity }: { workflowId: string; patientId: string; insurer: string; onActivity?: (insurer: string, phase: "saving" | "saved" | "pdf-error", detail?: string) => void }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const processing = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const { data: docs = [] } = useQuery({ queryKey: ["quote-pdfs", workflowId], queryFn: async () => {
    const { data, error } = await supabase.from("documents").select("id,name,media_url,created_at").eq("patient_id", patientId).like("document_kind", `quote_pdf:${workflowId}:%`).order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } });
  const save = async (d: any) => {
      if (processing.current.has(d.captureId)) return;
      processing.current.add(d.captureId);
      setBusy(true);
      onActivity?.(d.insurer, "saving");
      try {
        const { data, error } = await supabase.functions.invoke("capture-insurer-quote", { body: { workflowId, insurer: d.insurer, filename: d.filename, base64: d.base64 } });
        if (error || data?.error) throw new Error(data?.error ?? "Could not attach PDF.");
        toast.success(data.duplicate ? "Quote PDF is already filed." : "Quote PDF attached to Working Window and Documents.");
        onActivity?.(d.insurer, "saved", data.duplicate ? "Already filed, so the document count does not increase." : undefined);
        await Promise.all(["quote-pdfs", "wealth-map-records", "wealth-doc-tray", "patient-documents", "documents"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
        window.postMessage({ source: "holarc", type: "insurer-pdf-ack", workflowId, captureId: d.captureId, ok: true }, location.origin);
      } catch (e) {
        const message = e instanceof Error ? e.message : "PDF capture failed. Upload the downloaded file instead.";
        onActivity?.(d.insurer, "pdf-error", message);
        toast.error(message);
        processing.current.delete(d.captureId);
      } finally { setBusy(false); }
    };
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== window || e.origin !== location.origin || d?.source !== "holarc-extension" || d.workflowId !== workflowId) return;
      if (d.type === "insurer-pdf" && typeof d.base64 === "string" && d.base64.length <= 6990508 && typeof d.filename === "string" && typeof d.insurer === "string") void save(d);
      if (d.type === "insurer-pdf-error") toast.error("Automatic capture unavailable for this PDF. Upload the downloaded file here.");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [workflowId, qc]);
  const upload = async (file: File) => {
    if (!insurer) return toast.error("Choose an insurer first.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Choose a PDF up to 5MB.");
    const reader = new FileReader();
    reader.onload = () => void save({ insurer, filename: file.name, base64: String(reader.result).split(",")[1], captureId: crypto.randomUUID() });
    reader.readAsDataURL(file);
  };
  return <div className="space-y-1.5 text-xs" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) void upload(file); }}>
    <input ref={input} type="file" accept="application/pdf,.pdf" aria-label="Upload quote PDF" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
    <Button size="sm" variant="outline" disabled={busy || !insurer} onClick={() => input.current?.click()}>{busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}Upload quote PDF</Button>
    {docs.map((d) => <Button key={d.id} variant="ghost" size="sm" className="flex h-auto w-full justify-start text-xs" onClick={() => setPreview({ id: d.id, title: d.name, date: d.created_at, kind: "file", url: d.media_url })}><FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" /><span className="truncate">{d.name}</span></Button>)}
    <DocPreviewDialog doc={preview} onClose={() => setPreview(null)} />
  </div>;
}