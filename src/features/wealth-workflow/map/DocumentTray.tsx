import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileSignature, FileText, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import folderAsset from "@/assets/documents-folder-3d.png.asset.json";

const db = supabase as any;
type Doc = { id: string; kind: "signed" | "transcript" | "file"; title: string; date: string; html?: string; text?: string; url?: string };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

export function useClientDocuments(patientId?: string) {
  return useQuery({
    queryKey: ["wealth-doc-tray", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<Doc[]> => {
      const [signed, sessions, files] = await Promise.all([
        db.from("wealth_signed_documents").select("id,title,content_html,signed_at,version").eq("patient_id", patientId).order("signed_at", { ascending: false }),
        db.from("sessions").select("id,title,transcript,created_at").eq("patient_id", patientId).not("transcript", "is", null).order("created_at", { ascending: false }),
        db.from("documents").select("id,name,content,media_url,created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
      ]);
      return [
        ...((signed.data ?? []) as any[]).map((d) => ({ id: d.id, kind: "signed" as const, title: `${d.title} (signed v${d.version})`, date: d.signed_at, html: d.content_html })),
        ...((sessions.data ?? []) as any[]).map((s) => ({ id: s.id, kind: "transcript" as const, title: `${s.title || "Consultation"} transcript`, date: s.created_at, text: s.transcript })),
        ...((files.data ?? []) as any[]).map((f) => ({ id: f.id, kind: "file" as const, title: f.name || "Document", date: f.created_at, text: f.content || undefined, url: f.media_url || undefined })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    },
  });
}

export function downloadDoc(d: Doc) {
  if (d.url && !d.html && !d.text) { window.open(d.url, "_blank", "noopener,noreferrer"); return; }
  const isHtml = !!d.html;
  const blob = new Blob([isHtml ? d.html! : d.text ?? ""], { type: isHtml ? "text/html" : "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${d.title.replace(/[^\w\- ]+/g, "")}.${isHtml ? "html" : "txt"}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function DocPreviewDialog({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="text-base">{doc?.title}</DialogTitle></DialogHeader>
        {doc?.html ? (
          <iframe title={doc.title} srcDoc={doc.html} className="h-[70vh] w-full rounded-lg border border-border bg-card" />
        ) : doc?.text ? (
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 font-sans text-xs leading-relaxed">{doc.text}</pre>
        ) : doc?.url ? (
          <iframe title={doc.title} src={doc.url} className="h-[70vh] w-full rounded-lg border border-border" />
        ) : <p className="text-sm text-muted-foreground">No preview available.</p>}
      </DialogContent>
    </Dialog>
  );
}

const ICON = { signed: FileSignature, transcript: Mic, file: FileText };

export function DocumentTray({ patientId, count }: { patientId?: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Doc | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { data = [], isLoading } = useClientDocuments(open ? patientId : undefined);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!preview && ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, preview]);

  // Izenzo-style "Filed!" bounce whenever a new document lands in the folder.
  const prev = useRef(count);
  const [filed, setFiled] = useState(false);
  useEffect(() => {
    if (count > prev.current) { setFiled(true); const t = setTimeout(() => setFiled(false), 1600); prev.current = count; return () => clearTimeout(t); }
    prev.current = count;
  }, [count]);

  return (
    <div ref={ref} className="relative">
      <button type="button" id="wealth-docs-tile" onClick={() => setOpen((o) => !o)} aria-label="Documents" aria-expanded={open} title="Documents"
        className={`relative -my-2 rounded-lg p-0.5 transition-transform hover:scale-105 ${filed ? "animate-bounce" : ""}`}>
        <img src={folderAsset.url} alt="" className="h-10 w-10 object-contain" />
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground ring-2 ring-card">{count}</span>
        {filed && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[hsl(var(--owner-client))] px-2 py-0.5 text-2xs font-semibold text-primary-foreground">Filed!</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg animate-in fade-in-0 zoom-in-95">
          <p className="px-2 pb-1.5 pt-1 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Documents</p>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
              : data.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">No documents yet.</p>
              : data.map((d) => {
                const Icon = ICON[d.kind];
                return (
                  <div key={d.kind + d.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{d.title}</p>
                      <p className="text-2xs text-muted-foreground">{fmt(d.date)}</p>
                    </div>
                    <button onClick={() => setPreview(d)} aria-label={`Preview ${d.title}`} className="rounded p-1 text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => downloadDoc(d)} aria-label={`Download ${d.title}`} className="rounded p-1 text-muted-foreground hover:text-primary"><Download className="h-4 w-4" /></button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      <DocPreviewDialog doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/** Opens the consultation transcript the financial information was captured from. */
export function TranscriptButton({ sessionId, patientId }: { sessionId?: string | null; patientId?: string }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const open = async () => {
    let q = db.from("sessions").select("id,title,transcript,created_at").not("transcript", "is", null);
    q = sessionId ? q.eq("id", sessionId) : q.eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1);
    const { data } = await q.maybeSingle();
    if (data) setDoc({ id: data.id, kind: "transcript", title: `${data.title || "Consultation"} transcript`, date: data.created_at, text: data.transcript });
  };
  return (
    <>
      <button type="button" onClick={open} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        <Mic className="h-3.5 w-3.5" /> View the meeting transcript
      </button>
      <DocPreviewDialog doc={doc} onClose={() => setDoc(null)} />
    </>
  );
}
