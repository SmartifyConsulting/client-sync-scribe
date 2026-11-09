import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileSignature, FileText, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import folderAsset from "@/assets/documents-folder-3d.png.asset.json";
import { PdfFromHtml } from "@/features/documents/components/PdfFromHtml";
import { StoredPdfPreview } from "@/features/documents/components/StoredPdfPreview";
import { downloadHtmlAsPdf } from "@/features/documents/utils/documentPdf";
import { sealedHtml } from "./onboardingTemplates";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
type Doc = { id: string; kind: "signed" | "transcript" | "file"; title: string; date: string; html?: string; text?: string; url?: string; clientId?: string; seal?: { at: string; ip: string | null; hash: string } | null };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

export function useClientDocuments(clientId?: string) {
  return useQuery({
    queryKey: ["wealth-doc-tray", clientId],
    enabled: !!clientId,
    staleTime: 60_000,
    queryFn: async (): Promise<Doc[]> => {
      const [signed, sessions, files] = await Promise.all([
        db.from("wealth_signed_documents").select("id,title,version,signed_at").eq("patient_id", clientId).order("signed_at", { ascending: false }),
        db.from("sessions").select("id,title,created_at").eq("patient_id", clientId).not("transcript", "is", null).order("created_at", { ascending: false }),
        // Exclude *_signed rows: sign-wealth-document auto-files a copy of every
        // signed Disclosure/LOA into `documents` for the firm's records, but
        // the authoritative signed copy is already listed from
        // wealth_signed_documents above — including both here doubled every
        // signed document in the tray.
        db.from("documents").select("id,name,created_at").eq("patient_id", clientId).or("document_kind.is.null,document_kind.not.in.(loa_signed,disclosure_signed,debit_order_signed,life_declaration_signed)").order("created_at", { ascending: false }).limit(50),
      ]);
      for (const result of [signed, sessions, files]) if (result.error) throw result.error;
      return [
        ...((signed.data ?? []) as any[]).map((d) => ({ id: d.id, kind: "signed" as const, title: `${d.title} (signed v${d.version})`, date: d.signed_at })),
        ...((sessions.data ?? []) as any[]).map((s) => ({ id: s.id, kind: "transcript" as const, title: `${s.title || "Meeting"} transcript`, date: s.created_at })),
        ...((files.data ?? []) as any[]).map((f) => ({ id: f.id, kind: "file" as const, title: f.name || "Document", date: f.created_at })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    },
  });
}

async function loadDocument(doc: Doc): Promise<Doc> {
  const table = doc.kind === "signed" ? "wealth_signed_documents" : doc.kind === "transcript" ? "sessions" : "documents";
  const columns = doc.kind === "signed" ? "*" : doc.kind === "transcript" ? "transcript,patient_id,transcript_sealed_at,transcript_sealed_ip,transcript_seal_hash" : "content,media_url";
  const { data, error } = await db.from(table).select(columns).eq("id", doc.id).single();
  if (error) throw error;
  if (doc.kind === "signed") return { ...doc, html: sealedHtml(data) };
  if (doc.kind === "transcript") return withSeal(doc, data);
  const pdf = data.media_url?.startsWith("data:application/pdf;");
  const html = !pdf && /<[a-z][\s\S]*>/i.test(data.content ?? "");
  return { ...doc, html: html ? data.content : undefined, text: html || pdf ? undefined : data.content, url: data.media_url };
}

const withSeal = (doc: Doc, d: any): Doc => ({ ...doc, text: d.transcript, clientId: d.patient_id,
  seal: d.transcript_seal_hash ? { at: d.transcript_sealed_at, ip: d.transcript_sealed_ip, hash: d.transcript_seal_hash } : null });

/** Recomputes the server seal over the stored text; false means the text no longer matches its seal. */
async function sealIntact(d: Doc) {
  if (!d.seal || !d.text || !d.clientId) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${d.clientId}|${new Date(d.seal.at).toISOString()}|${d.seal.ip ?? ""}|${d.text}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("") === d.seal.hash;
}

const sealStamp = (d: Doc, ok: boolean) => !d.seal
  ? `<div data-pdf-keep-together style="margin-top:22px;border:1.5px dashed #999;border-radius:10px;padding:10px 12px;font-size:10px;color:#666;text-align:center">Not sealed · recorded before evidentiary sealing was introduced</div>`
  : `<div data-pdf-keep-together style="margin-top:22px;display:flex;gap:14px;align-items:center;border:2px solid ${ok ? "#14532d" : "#991b1b"};border-radius:12px;padding:12px 14px;color:#111">
<div style="flex-shrink:0;width:74px;height:74px;border-radius:50%;border:3px double ${ok ? "#14532d" : "#991b1b"};display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:700;letter-spacing:.08em;color:${ok ? "#14532d" : "#991b1b"}">${ok ? "CERTIFIED<br/>ORIGINAL" : "SEAL<br/>BROKEN"}</div>
<div style="font-size:10px;line-height:1.55"><div style="font-weight:700;letter-spacing:.18em;font-size:11px;margin-bottom:3px">EVIDENTIARY SEAL</div>
Sealed: ${esc(fmtDate(d.seal.at))} (${esc(d.seal.at)})<br/>Recorded from IP address: ${esc(d.seal.ip ?? "not recorded")}<br/>
${ok ? "Certified original copy recorded in Holarc Wealth. The text has not changed since it was sealed." : "Warning: this text no longer matches its seal and is not an original copy."}
<div style="font-family:monospace;word-break:break-all;margin-top:3px">SHA-256 ${esc(d.seal.hash)}</div></div></div>`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const textHtml = (title: string, text: string) =>
  `<div id="holarc-document" style="width:794px;padding:48px 56px;background:#fff;font-family:Georgia,serif;color:#111"><h2 style="font-size:18px;margin:0 0 12px">${esc(title)}</h2><div style="white-space:pre-wrap;font-size:12px;line-height:1.6">${esc(text)}</div></div>`;

// Transcript PDF: header, running footer, Wealth Manager in bold, client in regular weight.
const fmtDate = (d?: string) => d ? new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const transcriptShell = (title: string, date: string | undefined, body: string, stamp = "") =>
  `<div id="holarc-document" data-document-running-title="${esc(title)}" style="width:794px;padding:40px 56px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:18px">
<div><div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#555">Consultation transcript</div><h2 style="font-size:18px;margin:4px 0 0">${esc(title)}</h2></div>
<div style="font-size:11px;color:#555;text-align:right">${esc(fmtDate(date))}<br/><b style="color:#111">Wealth Manager</b> in bold · Client in regular</div></div>
${body}
${stamp}
<div data-document-footer style="margin-top:28px;border-top:1px solid #ccc;padding-top:8px;font-size:9.5px;color:#666;text-align:center">Confidential · Holarc Wealth consultation transcript · Generated ${esc(fmtDate(new Date().toISOString()))}</div></div>`;
const transcriptHtml = (title: string, segments: { speaker: string; text: string }[], date?: string, stamp = "") => {
  const body = segments.map((s) => {
    const b = s.speaker === "broker";
    return `<div data-pdf-keep-together style="display:flex;gap:14px;margin:0 0 10px;font-size:12px;line-height:1.6"><div style="width:110px;flex-shrink:0;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${b ? "#111" : "#666"};padding-top:2px">${b ? "Wealth Manager" : "Client"}</div><div style="flex:1;font-weight:${b ? 700 : 400}">${esc(s.text)}</div></div>`;
  }).join("");
  return transcriptShell(title, date, body, stamp);
};

/** Best-effort speaker split for a transcript; falls back to a plain (uncoloured) block on failure. */
async function buildTranscriptHtml(d: Doc): Promise<string> {
  if (!d.text) return transcriptShell(d.title, d.date, "");
  const stamp = sealStamp(d, await sealIntact(d));
  const { data, error } = await supabase.functions.invoke("format-transcript", { body: { text: d.text } });
  if (error || !data?.segments?.length) return transcriptShell(d.title, d.date, `<div style="white-space:pre-wrap;font-size:12px;line-height:1.6">${esc(d.text)}</div>`, stamp);
  return transcriptHtml(d.title, data.segments, d.date, stamp);
}

const docHtml = (d: Doc) => d.html ?? (d.text && d.kind !== "transcript" ? textHtml(d.title, d.text) : null);

export async function downloadDoc(d: Doc) {
  if (d.kind === "transcript" && d.text) return downloadHtmlAsPdf(await buildTranscriptHtml(d), d.title);
  const html = docHtml(d);
  if (!html) { if (d.url) window.open(d.url, "_blank", "noopener,noreferrer"); return; }
  await downloadHtmlAsPdf(html, d.title);
}

export function DocPreviewDialog({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  const [transcriptHtmlState, setTranscriptHtmlState] = useState<string | null>(null);
  useEffect(() => {
    if (doc?.kind === "transcript" && doc.text) {
      setTranscriptHtmlState(null);
      buildTranscriptHtml(doc).then(setTranscriptHtmlState);
    } else {
      setTranscriptHtmlState(null);
    }
  }, [doc]);
  const html = doc?.kind === "transcript" ? transcriptHtmlState : doc ? docHtml(doc) : null;
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="text-base">{doc?.title}</DialogTitle></DialogHeader>
        {doc?.kind === "transcript" && !html ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Formatting transcript…</p>
        ) : doc && html ? (
          <PdfFromHtml html={html} title={doc.title} />
        ) : doc?.url ? (
          <StoredPdfPreview source={doc.url} title={doc.title} />
        ) : <p className="text-sm text-muted-foreground">No preview available.</p>}
      </DialogContent>
    </Dialog>
  );
}

const ICON = { signed: FileSignature, transcript: Mic, file: FileText };

export function DocumentTray({ clientId }: { clientId?: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Doc | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { data = [], isLoading, isError, refetch } = useClientDocuments(clientId);
  const [loadingDoc, setLoadingDoc] = useState<string>();
  const count = data.length;
  const openDoc = async (doc: Doc, download: boolean) => {
    setLoadingDoc(doc.id);
    try {
      const full = await loadDocument(doc);
      if (download) await downloadDoc(full);
      else setPreview(full);
    } catch {
      toast({ title: "Could not load this document", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoadingDoc(undefined);
    }
  };

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
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground ring-2 ring-card">{isLoading ? "…" : isError && !count ? "!" : count}</span>
        {filed && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[hsl(var(--owner-client))] px-2 py-0.5 text-2xs font-semibold text-primary-foreground">Filed!</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg animate-in fade-in-0 zoom-in-95">
          <p className="px-2 pb-1.5 pt-1 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Documents</p>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
              : isError && !count ? <button className="px-2 py-3 text-xs underline" onClick={() => void refetch()}>Could not load documents · Retry</button>
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
                    {loadingDoc === d.id && <span className="text-2xs text-muted-foreground">Loading…</span>}
                    <button disabled={!!loadingDoc} onClick={() => void openDoc(d, false)} aria-label={`Preview ${d.title}`} className="rounded p-1 text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></button>
                    <button disabled={!!loadingDoc} onClick={() => void openDoc(d, true)} aria-label={`Download ${d.title}`} className="rounded p-1 text-muted-foreground hover:text-primary"><Download className="h-4 w-4" /></button>
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
export function TranscriptButton({ sessionId, clientId }: { sessionId?: string | null; clientId?: string }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const open = async () => {
    let q = db.from("sessions").select("id,title,transcript,created_at,patient_id,transcript_sealed_at,transcript_sealed_ip,transcript_seal_hash").not("transcript", "is", null);
    q = sessionId ? q.eq("id", sessionId) : q.eq("patient_id", clientId).order("created_at", { ascending: false }).limit(1);
    const { data } = await q.maybeSingle();
    if (data) setDoc(withSeal({ id: data.id, kind: "transcript", title: `${data.title || "Meeting"} transcript`, date: data.created_at }, data));
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
