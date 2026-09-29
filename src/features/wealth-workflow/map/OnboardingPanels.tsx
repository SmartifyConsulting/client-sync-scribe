import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buildDocumentPdfBase64 } from "@/features/documents/utils/documentPdf";
import holarcLogoAsset from "@/assets/holarc-wealth-logo.png.asset.json";
import { SignaturePad } from "../forms/SignaturePad";
import { disclosureHtml, loaHtml, sealedHtml } from "./onboardingTemplates";

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
  const qc = useQueryClient();
  const { toast } = useToast();
  const status: string | null = kyc?.status ?? null;
  const label: Record<string, string> = {
    started: viewer === "client" ? "Started. Finish the check in the Didit window" : `${clientFirst} has started the check`,
    approved: "Passed", declined: "Not passed", in_review: viewer === "client" ? "Being reviewed. Your Wealth Manager will be in touch" : "Needs your review",
    abandoned: "Not finished",
  };
  const call = async (action: "start" | "refresh") => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("didit-session", { body: { workflowId, action, returnUrl: window.location.href } });
    setBusy(false);
    if (error) return toast({ title: "Identity check", description: await errMsg(error), variant: "destructive" });
    if (data?.url) window.open(data.url, "_blank", "noopener");
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
  };

  return (
    <div className="rounded-lg border border-border/70 p-3 text-[13px]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Didit screening</span>
        <span className={cn("rounded-full border px-2 text-[10px]", status === "approved" ? "border-primary/40 text-primary" : status === "declined" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground")}>
          {status ? label[status] ?? status : viewer === "client" ? "Not started" : `Waiting for ${clientFirst}`}
        </span>
      </div>
      {viewer === "manager" && kyc && (
        <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          <dt>AML</dt><dd className="text-foreground">{kyc.aml_result ?? "—"}</dd>
          <dt>PEP</dt><dd className="text-foreground">{kyc.pep_result ?? "—"}</dd>
          {kyc.decided_at && <><dt>Decided</dt><dd className="text-foreground">{fmt(kyc.decided_at)}</dd></>}
        </dl>
      )}
      {viewer === "client" && status !== "approved" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" className="rounded-full" disabled={busy} onClick={() => call("start")}>
            {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{status ? "Restart my check" : "Verify my identity"}
          </Button>
          {status && <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => call("refresh")}>I've finished. Check my result</Button>}
        </div>
      )}
    </div>
  );
}

/* ---------------- Disclosure + LOA ---------------- */
export function SignDocsPanel({ workflowId, signed, viewer, clientName }: { workflowId: string; signed: any[]; viewer: Viewer; clientName: string }) {
  const today = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const docs = [
    { type: "disclosure", title: "Disclosure Agreement", html: disclosureHtml(clientName, today) },
    { type: "loa", title: "Letter of Authority (LOA)", html: loaHtml(clientName, today) },
  ];
  return <div className="space-y-4">{docs.map((d) => <DocCard key={d.type} workflowId={workflowId} doc={d} signed={signed.find((s) => s.doc_type === d.type)} viewer={viewer} clientName={clientName} />)}</div>;
}

function DocCard({ workflowId, doc, signed, viewer, clientName }: { workflowId: string; doc: { type: string; title: string; html: string }; signed?: any; viewer: Viewer; clientName: string }) {
  const [preview, setPreview] = useState(false);
  const [cert, setCert] = useState(false);
  const [signing, setSigning] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const html = signed ? sealedHtml(signed) : doc.html;
  const first = clientName.split(" ")[0];

  const sign = async () => {
    if (!sig) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("sign-wealth-document", {
      body: { workflowId, docType: doc.type, title: doc.title, contentHtml: doc.html, signatureImage: sig, signerName: clientName },
    });
    setBusy(false);
    if (error) return toast({ title: "Not signed", description: await errMsg(error), variant: "destructive" });
    setSigning(false);
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
    toast({ title: `${doc.title} signed` });
  };

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="flex items-center gap-2 px-3 py-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{doc.title}</p>
            <p className="text-[11px] text-muted-foreground">{signed ? `Signed by ${signed.signer_name} · ${fmt(signed.signed_at)}` : viewer === "client" ? "Waiting for your signature" : `Waiting for ${first} to sign`}</p>
          </div>
          <span className={cn("rounded-full border px-2 text-[10px]", signed ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{signed ? "signed" : "unsigned"}</span>
        </div>
        {/* Framed preview */}
        <div className="relative mx-3 mb-3 h-40 overflow-hidden rounded-md border bg-background">
          <div className="pointer-events-none origin-top-left scale-[0.45] w-[222%]" dangerouslySetInnerHTML={{ __html: doc.html }} />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background" />
        </div>
        {signed && (
          <div className="border-t bg-muted/30 px-3 py-2 text-center">
            <p className="text-left text-[10px] font-medium uppercase tracking-[0.14em] text-primary">Client</p>
            <img src={signed.signature_image} alt={`Signature of ${signed.signer_name}`} className="mx-auto h-12" />
            <div className="mx-auto h-px w-3/4 bg-border" />
            <p className="mt-1 text-[11px] text-muted-foreground">Digitally signed · {fmt(signed.signed_at)}{signed.signer_ip ? ` · IP ${signed.signer_ip}` : ""}</p>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t px-3 py-2">
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setPreview(true)}><Eye className="mr-1 h-3.5 w-3.5" />Preview</Button>
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => downloadPdf(html, doc.title)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
          {!signed && viewer === "client" && <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => setSigning(true)}>Sign</Button>}
        </div>
      </div>

      {signed && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] text-muted-foreground">Sealed {fmt(signed.signed_at)}</p>
          <div className="rounded-xl border-[1.5px] border-foreground/70 bg-muted/20 p-4 text-[12px]">
            <div className="inline-flex rounded-lg bg-background px-2 py-1"><img src={holarcLogoAsset.url} alt="Holarc Wealth" className="h-7" /></div>
            <p className="my-3 text-center text-[12px] font-semibold tracking-[0.2em]">SEAL CERTIFICATE</p>
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Document</dt><dd>{doc.title}</dd>
              <dt className="text-muted-foreground">Signed by</dt><dd>{signed.signer_name}</dd>
              <dt className="text-muted-foreground">IP address</dt><dd>{signed.signer_ip ?? "not recorded"}</dd>
              <dt className="text-muted-foreground">Sealed</dt><dd className="break-all">{signed.signed_at}</dd>
            </dl>
            <p className="mt-3 break-all text-center font-mono text-[9px] text-muted-foreground">Seal {signed.seal_hash}</p>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setCert(true)}><FileText className="mr-1 h-3.5 w-3.5" />View certificate</Button>
            <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => downloadPdf(html, `${doc.title} sealed`)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
          </div>
        </div>
      )}

      <Dialog open={preview || cert} onOpenChange={(o) => { if (!o) { setPreview(false); setCert(false); } }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{doc.title}</DialogTitle></DialogHeader>
          <div className="rounded-md border bg-background" dangerouslySetInnerHTML={{ __html: html }} />
        </DialogContent>
      </Dialog>

      <Dialog open={signing} onOpenChange={setSigning}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Sign {doc.title}</DialogTitle></DialogHeader>
          <p className="text-[13px] text-muted-foreground">Draw your signature below. When you sign, we record the date, time and your IP address, and seal the document so it can't be changed.</p>
          <SignaturePad onChange={setSig} />
          <Button className="rounded-full" disabled={!sig || busy} onClick={sign}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Sign as {clientName}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
