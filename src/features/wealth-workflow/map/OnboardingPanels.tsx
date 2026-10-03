import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, ShieldCheck, ScanFace, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buildDocumentPdfBase64 } from "@/features/documents/utils/documentPdf";
import { Logo } from "@/components/brand/Logo";
import { disclosureHtml, loaHtml, sealedHtml } from "./onboardingTemplates";
import { renderSignaturePngBase64 } from "@/lib/signatureImage";
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

  if (viewer === "manager") {
    return (
      <div className="rounded-lg border border-border/70 p-3 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Didit screening</span>
          <span className={cn("rounded-full border px-2 text-[10px]", status === "approved" ? "border-primary/40 text-primary" : status === "declined" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground")}>
            {status ? label[status] ?? status : `Waiting for ${clientFirst}`}
          </span>
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

  // Client view: one plain sentence, one clear action, an icon showing what's expected.
  const simpleText =
    status === "approved" ? "You're verified."
    : status === "declined" ? "That didn't go through. Please try again."
    : status === "in_review" ? "We're reviewing it — we'll let you know."
    : status ? "Finish the check in the window that opened."
    : "Takes about 2 minutes. Have your ID and your camera ready.";

  return (
    <div className={cn("flex items-center gap-4 rounded-xl border bg-card p-4", status === "approved" ? "border-primary/40" : "border-border/70")}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Verify your identity</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{simpleText}</p>
        {status !== "approved" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" disabled={busy} onClick={() => call("start")}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{status ? "Restart" : "Verify my identity"}
            </Button>
            {status && <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => call("refresh")}>I've finished</Button>}
          </div>
        )}
      </div>
      <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full", status === "approved" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
        {status === "approved" ? <Check className="h-7 w-7" strokeWidth={3} /> : <ScanFace className="h-7 w-7" />}
      </div>
    </div>
  );
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
    <Accordion type="multiple" className="space-y-3">
      {docs.map((d) => (
        <DocCard key={d.type} workflowId={workflowId} doc={d} signed={signed.find((s) => s.doc_type === d.type)} viewer={viewer} clientName={clientName} />
      ))}
    </Accordion>
  );
}

function DocCard({ workflowId, doc, signed, viewer, clientName }: { workflowId: string; doc: { type: string; title: string; html: string }; signed?: any; viewer: Viewer; clientName: string }) {
  const [cert, setCert] = useState(false);
  const [busy, setBusy] = useState(false);
  // Optimistic stamp shown the instant signing succeeds, before the record refetches.
  const [localSig, setLocalSig] = useState<{ image: string; at: string } | null>(null);
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
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
    toast({ title: `${doc.title} signed` });
  };

  return (
    <AccordionItem value={doc.type} className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <AccordionTrigger className="gap-3 !rounded-none !border-0 bg-transparent px-4 py-3 text-left hover:!bg-transparent hover:no-underline">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", isSigned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <FileText className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{doc.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {isSigned ? `Signed by ${signed?.signer_name ?? clientName}${signed ? ` · ${fmt(signed.signed_at)}` : ""}` : viewer === "client" ? "Waiting for your signature" : `Waiting for ${first} to sign`}
          </p>
        </div>
        <span className={cn("mr-2 rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide", isSigned ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{isSigned ? "SIGNED" : "UNSIGNED"}</span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {/* Letterhead document frame — the same content used for PDF export and the signed record */}
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-6 py-3">
            <Logo size="sm" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Official Document</span>
          </div>
          <div className="max-h-[28rem] overflow-y-auto bg-white" dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        {signed && (
          <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2 text-center">
            <p className="text-left text-[10px] font-medium uppercase tracking-[0.14em] text-primary">Client</p>
            <img src={signed.signature_image} alt={`Signature of ${signed.signer_name}`} className="mx-auto h-12" />
            <div className="mx-auto h-px w-3/4 bg-border" />
            <p className="mt-1 text-[11px] text-muted-foreground">Digitally signed · {fmt(signed.signed_at)}{signed.signer_ip ? ` · IP ${signed.signer_ip}` : ""}</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => downloadPdf(html, doc.title)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
          {signed && (
            <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setCert(true)}><FileText className="mr-1 h-3.5 w-3.5" />View certificate</Button>
          )}
          {!isSigned && viewer === "client" && (
            <Button size="sm" className="h-8 rounded-full text-xs" disabled={busy} onClick={sign}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Sign
            </Button>
          )}
          {isSigned && !signed && (
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3">
              <img src={`data:image/png;base64,${stampImage}`} alt="Your signature" className="h-5" />
              <span className="text-[11px] font-medium text-primary">Signed</span>
            </span>
          )}
        </div>
      </AccordionContent>

      <Dialog open={cert} onOpenChange={setCert}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Seal certificate</DialogTitle></DialogHeader>
          {signed && (
            <div className="rounded-xl border-[1.5px] border-foreground/70 bg-muted/20 p-4 text-[12px]">
              <div className="inline-flex rounded-lg bg-background px-2 py-1"><Logo size="sm" /></div>
              <p className="my-3 text-center text-[12px] font-semibold tracking-[0.2em]">SEAL CERTIFICATE</p>
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Document</dt><dd>{doc.title}</dd>
                <dt className="text-muted-foreground">Signed by</dt><dd>{signed.signer_name}</dd>
                <dt className="text-muted-foreground">IP address</dt><dd>{signed.signer_ip ?? "not recorded"}</dd>
                <dt className="text-muted-foreground">Sealed</dt><dd className="break-all">{signed.signed_at}</dd>
              </dl>
              <p className="mt-3 break-all text-center font-mono text-[9px] text-muted-foreground">Seal {signed.seal_hash}</p>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => downloadPdf(html, `${doc.title} sealed`)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AccordionItem>
  );
}
