import { useState } from "react";
import { CheckCircle2, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { renderSignaturePngBase64 } from "@/lib/signatureImage";
import { DocCard, useWorkflowPractice } from "./OnboardingPanels";
import { authorisationHtml } from "./onboardingTemplates";

const money = (n: number) => `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;

export function AuthorisationPanel({ viewer, workflowId, records, recommendation, clientName }: {
  viewer: "manager" | "client"; workflowId: string; records: any; recommendation: any; clientName: string;
}) {
  const qc = useQueryClient();
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState(clientName);
  const [accountNumber, setAccountNumber] = useState("");
  const [day, setDay] = useState("");
  const [name, setName] = useState(clientName);
  const [debitConsent, setDebitConsent] = useState(false);
  const [declarationConsent, setDeclarationConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: practice } = useWorkflowPractice(workflowId, true);
  const signed = (records?.signed ?? []).filter((d: any) => ["debit_order", "life_declaration"].includes(d.doc_type) && d.version === recommendation?.version);
  const quotes = (records?.quotes ?? []).filter((q: any) => q.selected);
  const premiumReady = quotes.length > 0 && quotes.every((q: any) => Number(q.monthly_premium) > 0);
  const ficaReady = records?.compliance?.kyc_fica_status === "completed" && (records?.compliance?.bank_validation_required === false || records?.compliance?.bank_validation_status === "completed");
  const canSign = viewer === "client" && recommendation?.status === "accepted" && ficaReady && premiumReady && bankName.trim().length >= 2 && accountHolder.trim().length >= 2 && /^\d{6,20}$/.test(accountNumber) && day && name.trim().length >= 2 && debitConsent && declarationConsent;
  const sign = async () => {
    if (!canSign || busy) return;
    setBusy(true);
    try {
      const image = await renderSignaturePngBase64({ full_name: name });
      if (!image) throw new Error("We couldn't create your signature. Please try again.");
      const { error } = await supabase.functions.invoke("sign-wealth-authorisations", { body: {
        workflowId, recommendationId: recommendation.id, signerName: name, bankName, accountHolder, accountNumber, collectionDay: Number(day),
        debitConsent, declarationConsent, signatureImage: `data:image/png;base64,${image}`,
        quoteSnapshot: quotes.map((q: any) => ({ id: q.id, insurer: q.insurer, product: q.product, monthly_premium: Number(q.monthly_premium) })),
      } });
      if (error) { const body = await error.context?.json?.().catch(() => null); throw new Error(body?.error ?? error.message); }
      setAccountNumber("");
      await Promise.all(["wealth-map-records", "wealth-workflow", "wealth-doc-tray", "wealth-blockers", "wealth-audit", "client-wealth"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      toast({ title: "Both authorisations signed and filed in Documents" });
    } catch (e) { toast({ title: "Authorisations not signed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  if (signed.length === 2) return <div className="space-y-2"><p className="flex items-center gap-2 text-xs text-primary"><CheckCircle2 className="h-4 w-4" />Both authorisations signed</p>{signed.map((d: any) => <DocCard key={d.id} workflowId={workflowId} viewer={viewer} clientName={clientName} signed={{ ...d, content_html: authorisationHtml(d.content_html, d.title, d.signer_name ?? clientName, practice) }} signable={false} doc={{ type: d.doc_type, title: d.title, html: authorisationHtml(d.content_html, d.title, d.signer_name ?? clientName, practice) }} />)}</div>;

  return <div className="space-y-4 text-xs">
    <div className="border-b border-border pb-3">
      <h4 className="font-semibold">Debit order mandate</h4>
      <ul className="mt-2 space-y-1 text-muted-foreground">{quotes.map((q: any) => <li key={q.id} className="flex flex-wrap justify-between gap-1"><span>{q.insurer} · {q.product}</span><span className="text-foreground">{money(Number(q.monthly_premium))} /month</span></li>)}</ul>
      {premiumReady ? <p className="mt-2 font-semibold">Total monthly premium {money(quotes.reduce((sum: number, q: any) => sum + Number(q.monthly_premium), 0))}</p> : <p className="mt-2 text-muted-foreground">Your Wealth Manager needs to confirm the selected insurer premiums first.</p>}
    </div>
    {viewer === "manager" ? <p className="text-muted-foreground">{clientName} confirms their bank details and signs both authorisations here from their own account. You cannot sign on their behalf.</p> : <>
      {!ficaReady && <p className="text-muted-foreground">Complete your FICA and bank confirmation before signing.</p>}
      {recommendation?.status !== "accepted" && <p className="text-muted-foreground">Review and sign your current Record of Advice first.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="auth-bank" className="text-xs">Bank name</Label><Input id="auth-bank" value={bankName} onChange={e => setBankName(e.target.value)} maxLength={100} className="h-11 text-xs" /></div>
        <div className="space-y-1.5"><Label htmlFor="auth-holder" className="text-xs">Account holder</Label><Input id="auth-holder" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} maxLength={200} className="h-11 text-xs" /></div>
        <div className="space-y-1.5"><Label htmlFor="auth-number" className="text-xs">Account number</Label><Input id="auth-number" inputMode="numeric" autoComplete="off" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ""))} maxLength={20} className="h-11 text-xs" /><p className="text-2xs text-muted-foreground">Only the last four digits are kept in the signed copy. Use the account on your bank confirmation.</p></div>
        <div className="space-y-1.5"><Label htmlFor="auth-day" className="text-xs">Preferred collection day</Label><Select value={day} onValueChange={setDay}><SelectTrigger id="auth-day" className="h-11 text-xs"><SelectValue placeholder="Select day" /></SelectTrigger><SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-2 py-2"><Checkbox checked={debitConsent} onCheckedChange={v => setDebitConsent(v === true)} aria-label="Authorise debit order" /><span>I authorise collection of the agreed monthly premiums from this account, subject to the insurer’s accepted mandate and collection arrangements.</span></label>
      <div className="border-t border-border pt-3"><h4 className="font-semibold">Life assured declaration</h4><label className="mt-1 flex min-h-11 cursor-pointer items-start gap-2 py-2"><Checkbox checked={declarationConsent} onCheckedChange={v => setDeclarationConsent(v === true)} aria-label="Confirm life declaration" /><span>I declare that the information I have provided is true, correct and complete to the best of my knowledge, and will disclose material changes before cover is issued.</span></label><p className="text-2xs text-muted-foreground">Insurer-specific declarations and underwriting requirements still apply.</p></div>
      <div className="space-y-1.5"><Label htmlFor="auth-signer" className="text-xs">Your full name for signing</Label><Input id="auth-signer" value={name} onChange={e => setName(e.target.value)} maxLength={200} className="h-11 text-xs" /></div>
      <Button className="min-h-11 w-full text-xs" disabled={!canSign || busy} onClick={() => void sign()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}Authorise & sign both documents</Button>
    </>}
  </div>;
}