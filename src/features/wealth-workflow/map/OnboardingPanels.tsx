import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Download, Eye, FileText, Loader2, ShieldCheck, ScanFace, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buildDocumentPdfBase64 } from "@/features/documents/utils/documentPdf";
import { Logo } from "@/components/brand/Logo";
import { disclosureHtml, loaHtml, sealedHtml } from "./onboardingTemplates";
import { renderSignaturePngBase64 } from "@/lib/signatureImage";
import { flyToDocuments } from "./StepAvatar";
import { useRef } from "react";
import { SIGNATURE_FONTS } from "@/lib/signature";

type Viewer = "manager" | "client";
const fmt = (d: string) => new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function errMsg(error: any) {
  try { const b = await error?.context?.json?.(); if (b?.error) return b.error; } catch { /* ignore */ }
  return error?.message ?? "Please try again.";
}

async function downloadPdf(html: string, name: string) {
  const b64 = await buildDocumentPdfBase64(html);
  if (!b64) return;
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${b64}`;
  a.download = `${name.replace(/[^\w]+/g, "_")}.pdf`;
  a.click();
}

/* ---------------- KYC, AML and PEP ---------------- */
export function KycPanel({ workflowId, kyc, viewer, clientFirst }: { workflowId: string; kyc: any; viewer: Viewer; clientFirst: string }) {
  const [busy, setBusy] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const status: string | null = kyc?.status ?? null;
  const label: Record<string, string> = {
    started: viewer === "client" ? "Started. Scan the QR code or finish in this window" : `${clientFirst} has started the check`,
    approved: "Passed", declined: "Not passed", in_review: viewer === "client" ? "Being reviewed. Your Wealth Manager will be in touch" : "Needs your review",
    abandoned: "Not finished",
  };
  const call = async (action: "start" | "refresh") => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("didit-session", { body: { workflowId, action, returnUrl: window.location.href } });
    setBusy(false);
    if (error) return toast({ title: "Identity check", description: await errMsg(error), variant: "destructive" });
    if (data?.url) setSessionUrl(data.url);
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
  };

  useEffect(() => {
    if (!sessionUrl) { setQr(null); return; }
    let cancelled = false;
    QRCode.toDataURL(sessionUrl, { width: 160, margin: 1 }).then((url) => { if (!cancelled) setQr(url); });
    return () => { cancelled = true; };
  }, [sessionUrl]);

  if (viewer === "manager") {
    return (
      <div className="rounded-xl border border-border/70 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Didit screening</span>
          {status === "approved" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-2xs font-semibold text-white">
              <Check className="h-3 w-3" /> Verified
            </span>
          ) : (
            <span className={cn("rounded-full border px-2 text-2xs", status === "declined" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground")}>
              {status ? label[status] ?? status : `Waiting for ${clientFirst}`}
            </span>
          )}
        </div>
        {kyc && (
          <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <dt>AML</dt><dd className="text-foreground">{kyc.aml_result ?? "—"}</dd>
            <dt>PEP</dt><dd className="text-foreground">{kyc.pep_result ?? "—"}</dd>
            {kyc.decided_at && <><dt>Decided</dt><dd className="text-foreground">{fmt(kyc.decided_at)}</dd></>}
          </dl>
        )}
      </div>
    );
  }

  // Client view: a borderless frame that opens to show the Didit QR code.
  // Once Didit approves, the frame folds away and the signing step follows.
  if (status === "approved") {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-foreground animate-fade-in">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"><Check className="h-3.5 w-3.5 text-white" strokeWidth={5} /></span>
        Identity verified
      </div>
    );
  }
  return (
    <AutoStartKyc status={status} sessionUrl={sessionUrl} busy={busy} onStart={() => call("start")}>
      <div className="animate-scale-in origin-top flex flex-col items-center gap-3 py-2 text-center">
        <p className="text-sm font-medium text-foreground">Scan with your phone to verify your identity</p>
        <div className="flex h-44 w-44 items-center justify-center rounded-lg bg-white p-2">
          {qr ? <img src={qr} alt="Didit verification QR code" className="h-full w-full" /> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        </div>
        <p className="max-w-xs text-xs text-muted-foreground">
          {status === "declined" ? "That didn't go through. Please scan again." : status === "in_review" ? "We're reviewing it — we'll let you know." : "Takes about 2 minutes. Have your ID ready. This page updates by itself when you're done."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {sessionUrl && <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" asChild><a href={sessionUrl} target="_blank" rel="noopener noreferrer">Continue on this device</a></Button>}
          {status && <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" disabled={busy} onClick={() => call("refresh")}>I've finished</Button>}
        </div>
      </div>
    </AutoStartKyc>
  );
}

/** Opens a Didit session once when the frame first appears so the QR is ready. */
function AutoStartKyc({ status, sessionUrl, busy, onStart, children }: { status: string | null; sessionUrl: string | null; busy: boolean; onStart: () => void; children: React.ReactNode }) {
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!tried && !sessionUrl && !busy && status !== "in_review") { setTried(true); onStart(); }
  }, [tried, sessionUrl, busy, status, onStart]);
  return <>{children}</>;
}

/* ---------------- Disclosure + LOA ---------------- */
export function SignDocsPanel({ workflowId, signed, viewer, clientName }: { workflowId: string; signed: any[]; viewer: Viewer; clientName: string }) {
  const today = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const { data: practice } = useQuery({
    queryKey: ["workflow-practice-info", workflowId],
    queryFn: async () => {
      const sbx = supabase as any;
      const { data: wf } = await sbx.from("wealth_workflows").select("owner_user_id").eq("id", workflowId).maybeSingle();
      if (!wf?.owner_user_id) return null;
      const { data } = await sbx.from("wealth_practice_info").select("*").eq("user_id", wf.owner_user_id).maybeSingle();
      if (!data) return null;
      // Embed logos as data URLs so signed copies keep them permanently.
      const embed = async (path?: string | null) => {
        if (!path) return null;
        const { data: blob } = await supabase.storage.from("practice-logos").download(path);
        if (!blob) return null;
        return await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
      };
      return { ...data, __businessLogo: await embed(data.business_logo_path), __fspLogo: await embed(data.fsp_logo_path) };
    },
  });
  const docs = [
    { type: "disclosure", title: "Disclosure Agreement", html: disclosureHtml(clientName, today, practice) },
    { type: "loa", title: "Letter of Authority (LOA)", html: loaHtml(clientName, today, practice) },
  ];
  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <DocCard key={d.type} workflowId={workflowId} doc={d} signed={signed.find((s) => s.doc_type === d.type)} viewer={viewer} clientName={clientName} />
      ))}
    </div>
  );
}

function DocCard({ workflowId, doc, signed, viewer, clientName }: { workflowId: string; doc: { type: string; title: string; html: string }; signed?: any; viewer: Viewer; clientName: string }) {
  const [cert, setCert] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  // Optimistic stamp shown the instant signing succeeds, before the record refetches.
  const [localSig, setLocalSig] = useState<{ image: string; at: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const html = signed ? sealedHtml(signed) : doc.html;
  const first = clientName.split(" ")[0];
  const stampImage = signed?.signature_image ?? localSig?.image;
  const isSigned = !!stampImage;

  // Signing auto-generates a signature from the client's name in a random
  // cursive font — no drawing required. Date/time and IP are recorded
  // server-side by sign-wealth-document.
  const sign = async () => {
    setBusy(true);
    const font = SIGNATURE_FONTS[Math.floor(Math.random() * SIGNATURE_FONTS.length)].value;
    const sig = await renderSignaturePngBase64({ full_name: clientName, signature_font: font });
    if (!sig) {
      setBusy(false);
      return toast({ title: "Not signed", description: "We couldn't generate your signature. Please try again.", variant: "destructive" });
    }
    const { error } = await supabase.functions.invoke("sign-wealth-document", {
      body: { workflowId, docType: doc.type, title: doc.title, contentHtml: doc.html, signatureImage: sig, signerName: clientName },
    });
    setBusy(false);
    if (error) return toast({ title: "Not signed", description: await errMsg(error), variant: "destructive" });
    setLocalSig({ image: sig, at: new Date().toISOString() });
    flyToDocuments(cardRef.current);
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
    window.dispatchEvent(new CustomEvent("wealth-doc-signed"));
    toast({ title: `${doc.title} signed` });
  };

  return (
    <div ref={cardRef} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isSigned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{doc.title}</p>
        <p className="truncate text-2xs text-muted-foreground">
          {isSigned ? `Signed by ${signed?.signer_name ?? clientName}${signed ? ` · ${fmt(signed.signed_at)}` : ""} · filed in Documents` : viewer === "client" ? "Waiting for your signature" : `Waiting for ${first} to sign`}
        </p>
      </div>
      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label={`Preview ${doc.title}`} onClick={() => setPreview(true)}><Eye className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label={`Download ${doc.title}`} onClick={() => downloadPdf(html, doc.title)}><Download className="h-4 w-4" /></Button>
      {signed && <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="View seal certificate" onClick={() => setCert(true)}><ShieldCheck className="h-4 w-4" /></Button>}
      {!isSigned && viewer === "client" && (
        <Button size="sm" className="h-8 rounded-full px-4 text-xs" disabled={busy} onClick={sign}>
          {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Sign
        </Button>
      )}
      {isSigned && <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-2xs font-medium text-primary"><Check className="h-3 w-3" strokeWidth={3} />Signed</span>}

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-3"><DialogTitle className="text-sm font-semibold">{doc.title}</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto bg-muted/40 p-4">
            <div className="mx-auto overflow-hidden rounded-lg border border-border bg-white shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => downloadPdf(html, doc.title)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
            {!isSigned && viewer === "client" && (
              <Button size="sm" className="h-8 rounded-full px-4 text-xs" disabled={busy} onClick={async () => { await sign(); setPreview(false); }}>
                {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Sign
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cert} onOpenChange={setCert}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Seal certificate</DialogTitle></DialogHeader>
          {signed && (
            <div className="rounded-xl border-[1.5px] border-foreground/70 bg-muted/20 p-4 text-xs">
              <div className="inline-flex rounded-lg bg-background px-2 py-1"><Logo size="sm" /></div>
              <p className="my-3 text-center text-xs font-semibold tracking-[0.2em]">SEAL CERTIFICATE</p>
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Document</dt><dd>{doc.title}</dd>
                <dt className="text-muted-foreground">Signed by</dt><dd>{signed.signer_name}</dd>
                <dt className="text-muted-foreground">IP address</dt><dd>{signed.signer_ip ?? "not recorded"}</dd>
                <dt className="text-muted-foreground">Sealed</dt><dd className="break-all">{signed.signed_at}</dd>
              </dl>
              <p className="mt-3 break-all text-center font-mono text-2xs text-muted-foreground">Seal {signed.seal_hash}</p>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => downloadPdf(html, `${doc.title} sealed`)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
