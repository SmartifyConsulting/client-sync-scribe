import { Link } from "react-router-dom";
import { useState } from "react";
import { CalendarClock, CheckCircle2, FileText, Loader2, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocCard, useWorkflowPractice } from "./OnboardingPanels";
import { roaHtml } from "./onboardingTemplates";
import { RoaNegotiation } from "./RoaNegotiation";
import { usePresentRecommendation, useRecordDecision, useRecommendationHistory, useStartAnnualReview } from "../hooks";

type Viewer = "manager" | "client";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Step 5 and Step 6 tools shown inside the Working Window. Every state change goes through wealth_* DB functions. */
export const LATER_STEPS = new Set([
  "Present ROA and comparison", "Sign ROA", "Upload FICA documents and confirm bank details",
  "Authorise debit order and sign life declaration", "Complete health disclosure (encrypted)",
  "Accept, decline or issue", "Policy schedule to portal and CRM", "Choose your next meeting date", "Schedule review meeting", "Acknowledge renewal",
]);

function StatusRow({ label, done, hint }: { label: string; done: boolean; hint?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-xs">
      <span className="flex items-center gap-2">
        {done ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--owner-client))]" strokeWidth={2.5} /> : <span className="h-4 w-4 rounded-full border border-border" />}
        {label}
      </span>
      <span className="text-muted-foreground">{hint ?? (done ? "Done" : "Outstanding")}</span>
    </li>
  );
}

/** Shows the front/back ID images Didit captured, once per client, so a
 *  manager can confirm them without re-requesting the ID at FICA stage. */
function IdOnFile({ patientId }: { patientId?: string }) {
  const { data } = useQuery({
    queryKey: ["patient-id-images", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const sbx = supabase as any;
      const { data: pat } = await sbx.from("patients").select("id_document_front_path, id_document_back_path").eq("id", patientId).maybeSingle();
      if (!pat?.id_document_front_path && !pat?.id_document_back_path) return null;
      const sign = async (path?: string | null) => path ? (await sbx.storage.from("identity-documents").createSignedUrl(path, 3600)).data?.signedUrl ?? null : null;
      return { front: await sign(pat.id_document_front_path), back: await sign(pat.id_document_back_path) };
    },
  });
  if (!data) return null;
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="mb-2 text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">ID on file (from identity check)</p>
      <div className="flex gap-2">
        {data.front && <img src={data.front} alt="ID front" className="h-16 w-24 rounded border border-border object-cover" />}
        {data.back && <img src={data.back} alt="ID back" className="h-16 w-24 rounded border border-border object-cover" />}
      </div>
    </div>
  );
}

const FREQUENCIES = ["Monthly", "Quarterly", "Bi-annually", "Annually"];

/** Compulsory, client-chosen next meeting date (at most 12 months out) —
 *  sets it on every open application and books the appointment automatically. */
function NextMeetingPicker({ viewer, apps, patientId, brokerUserId, clientFirst }: {
  viewer: Viewer; apps: any[]; patientId?: string; brokerUserId?: string; clientFirst: string;
}) {
  const qc = useQueryClient();
  const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 1);
  const todayStr = new Date().toISOString().slice(0, 10);
  const maxStr = maxDate.toISOString().slice(0, 10);
  const [frequency, setFrequency] = useState("Annually");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  if (viewer !== "client") {
    return <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Waiting for {clientFirst} to choose their next meeting date (compulsory, at most 12 months out).</p>;
  }

  const confirm = async () => {
    if (!date || !patientId || !brokerUserId) return;
    setBusy(true);
    const sbx = supabase as any;
    const start = new Date(`${date}T09:00:00`);
    const end = new Date(start.getTime() + 30 * 60000);
    const [{ error: appErr }] = await Promise.all([
      sbx.from("wealth_applications").update({ review_date: date }).in("id", apps.map((a) => a.id)),
      sbx.from("appointments").insert({
        user_id: brokerUserId, patient_id: patientId, title: `Review meeting (${frequency.toLowerCase()})`,
        type: "session", start_time: start.toISOString(), end_time: end.toISOString(),
      }),
    ]);
    setBusy(false);
    if (appErr) return toast({ title: "Couldn't save your meeting date", description: appErr.message, variant: "destructive" });
    toast({ title: "Next meeting booked" });
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">Tell us how often you'd like to meet, and pick your next meeting date — at most 12 months from today. This is compulsory.</p>
      <div className="space-y-1.5">
        <label className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">How often would you like to meet?</label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Next meeting date</label>
        <input type="date" min={todayStr} max={maxStr} value={date} onChange={(e) => setDate(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
      </div>
      <Button className="w-full rounded-full" disabled={!date || busy} onClick={confirm}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm my next meeting date
      </Button>
    </div>
  );
}

/** Life/medical health disclosure can be completed now (encrypted, insurer
 *  only) or deferred to be done directly with the insurer. */
function HealthDisclosureChoice({ viewer, workflowId, status, clientFirst }: { viewer: Viewer; workflowId: string; status: string; clientFirst: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const setStatus = async (next: "completed" | "deferred_to_insurer") => {
    setBusy(true);
    const { error } = await (supabase as any).from("wealth_compliance_checks").upsert({ workflow_id: workflowId, health_disclosure_status: next }, { onConflict: "workflow_id" });
    setBusy(false);
    if (error) return toast({ title: "Couldn't save your choice", description: error.message, variant: "destructive" });
    toast({ title: next === "completed" ? "Health disclosure completed" : "You'll complete this with the insurer directly" });
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
  };

  if (status === "completed") {
    return <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--owner-client))]" />Health disclosure completed.</p>;
  }
  if (status === "deferred_to_insurer") {
    return <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--owner-client))]" />{clientFirst} will complete this directly with the insurer.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        {viewer === "client"
          ? "The insurer needs your health answers to issue life or medical cover. They go straight to the insurer, encrypted. Your Wealth Manager does not see them. You can also choose to complete this directly with the insurer instead."
          : `${clientFirst} answers the insurer's health questions directly, or defers to complete it with the insurer. Answers are encrypted and not visible to you.`}
      </p>
      {viewer === "client" && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="rounded-full" disabled={busy} onClick={() => setStatus("completed")}>Complete now</Button>
          <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => setStatus("deferred_to_insurer")}>Skip — I'll do it with the insurer</Button>
        </div>
      )}
    </div>
  );
}

function DocsLink({ viewer, onOpenDocuments, label = "Open documents" }: { viewer: Viewer; onOpenDocuments?: () => void; label?: string }) {
  return viewer === "client" ? (
    <Button asChild variant="outline" className="w-full rounded-full"><Link to="/patient/documents"><Upload className="mr-2 h-4 w-4" />{label}</Link></Button>
  ) : (
    <Button variant="outline" className="w-full rounded-full" onClick={onOpenDocuments}><FileText className="mr-2 h-4 w-4" />{label}</Button>
  );
}

export function LaterStepPanel({ label, viewer, workflowId, records, clientFirst, clientFullName, onOpenDocuments }: {
  label: string; viewer: Viewer; workflowId: string; records: any; clientFirst: string; clientFullName?: string; onOpenDocuments?: () => void;
}) {
  const { data: recs = [] } = useRecommendationHistory(workflowId);
  const present = usePresentRecommendation();
  const decide = useRecordDecision();
  const review = useStartAnnualReview();
  const current = recs.find((r) => r.status !== "superseded") ?? null;
  const comp = records?.compliance;
  const apps: any[] = records?.apps ?? [];
  const docKinds = new Set<string>((records?.docs ?? []).map((d: any) => d.document_kind));

  const { data: practice } = useWorkflowPractice(workflowId);
  const { data: roaDoc } = useQuery({
    queryKey: ["roa-doc", current?.roa_document_id],
    enabled: !!current?.roa_document_id,
    queryFn: async () => (await (supabase as any).from("documents").select("content, created_at").eq("id", current!.roa_document_id).maybeSingle()).data,
  });
  const clientName = clientFullName || clientFirst;
  const RoaCard = current?.roa_document_id && roaDoc ? (
    <DocCard workflowId={workflowId} viewer={viewer} clientName={clientName} signable={false}
      status={current.status === "accepted" ? `Accepted ${fmt(current.decided_at)} · filed in Documents` : `Version ${current.version} · filed in Documents`}
      doc={{ type: "roa", title: `Record of Advice v${current.version}`, blurb: current.summary ?? undefined,
        html: roaHtml(roaDoc.content || "", clientName, new Date(roaDoc.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }), current.version, practice) }} />
  ) : null;

  const run = async (p: Promise<unknown>, ok: string) => {
    try { await p; toast({ title: ok }); }
    catch (e: any) { toast({ title: "That didn't go through", description: e?.message ?? "Please try again.", variant: "destructive" }); }
  };

  const RecCard = current ? (
    <div className="rounded-lg border border-border/60 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium">{current.title || "Recommendation"} · v{current.version}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-2xs capitalize">{current.status.replace("_", " ")}</span>
      </div>
      {current.summary && <p className="mt-1.5 leading-relaxed text-muted-foreground">{current.summary}</p>}
    </div>
  ) : (
    <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
      {viewer === "client" ? "Your recommendation isn't ready yet. You'll see it here." : "No recommendation yet. Prepare it in Step 4."}
    </p>
  );

  switch (label) {
    case "Present ROA and comparison":
      return (
        <div className="space-y-3">
          {RecCard}
          {RoaCard}
          {viewer === "manager" && current?.status === "draft" && (
            <Button className="w-full rounded-full" disabled={present.isPending} onClick={() => run(present.mutateAsync(current.id), `Presented to ${clientFirst}`)}>
              {present.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Present to {clientFirst}
            </Button>
          )}
        </div>
      );
    case "Sign ROA":
      return (
        <div className="space-y-3">
          {RecCard}
          {RoaCard}
          {current?.status === "accepted" ? (
            <p className="text-xs text-muted-foreground">Accepted {fmt(current.decided_at)}.</p>
          ) : current && (current.status === "presented" || current.status === "changes_requested" || current.status === "draft") ? (
            <RoaNegotiation viewer={viewer} patientId={records?.patientId} workflowId={workflowId} recs={recs} current={current}
              clientFirst={clientFirst} onAccept={() => run(decide.mutateAsync({ recommendationId: current.id, decision: "accepted" }), "Thank you. Your acceptance is recorded.")}
              accepting={decide.isPending} />
          ) : (
            <p className="text-xs text-muted-foreground">
              {viewer === "manager" ? `Waiting for ${clientFirst} to review the advice.` : "You'll be able to respond once the advice is presented to you."}
            </p>
          )}
        </div>
      );
    case "Upload FICA documents and confirm bank details":
      return (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            <StatusRow label="Identity and regulatory verification (FICA)" done={comp?.kyc_fica_status === "completed"} />
            <StatusRow label="Bank details confirmed" done={!comp?.bank_validation_required || comp?.bank_validation_status === "completed"} hint={!comp?.bank_validation_required ? "Not needed" : undefined} />
          </ul>
          <p className="text-xs text-muted-foreground">
            {viewer === "client" ? "Your ID is already on file from your identity check — just upload a Bank Account Verification Letter and a Proof of Residential Address no older than 3 months." : `${clientFirst} uploads a Bank Account Verification Letter and Proof of Address (ID already on file from their identity check).`}
          </p>
          {viewer === "manager" && <IdOnFile patientId={records?.patientId} />}
          <DocsLink viewer={viewer} onOpenDocuments={onOpenDocuments} label={viewer === "client" ? "Upload my documents" : "Open documents"} />
        </div>
      );
    case "Authorise debit order and sign life declaration":
      return (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            <StatusRow label="Debit order mandate" done={docKinds.has("debit_order") || comp?.declarations_status === "completed"} />
            <StatusRow label="Life assured declaration" done={comp?.declarations_status === "completed"} />
          </ul>
          <p className="text-xs text-muted-foreground">
            {viewer === "client" ? "Check the debit order amount and date, then sign the declarations in your application pack." : `${clientFirst} signs the debit order and declarations.`}
          </p>
          <DocsLink viewer={viewer} onOpenDocuments={onOpenDocuments} label="Open application pack" />
        </div>
      );
    case "Complete health disclosure (encrypted)":
      return <HealthDisclosureChoice viewer={viewer} workflowId={workflowId} status={comp?.health_disclosure_status ?? "pending"} clientFirst={clientFirst} />;
    case "Accept, decline or issue":
    case "Policy schedule to portal and CRM":
      return (
        <div className="space-y-3">
          {apps.length ? (
            <ul className="space-y-1.5">
              {apps.map((a) => (
                <StatusRow key={a.id} label={[a.provider, a.product].filter(Boolean).join(" · ") || "Application"} done={a.status === "issued"} hint={String(a.status).replace(/_/g, " ")} />
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">No application submitted yet.</p>
          )}
          {label === "Policy schedule to portal and CRM" && <DocsLink viewer={viewer} onOpenDocuments={onOpenDocuments} label="Open policy schedules" />}
        </div>
      );
    case "Choose your next meeting date": {
      const due = apps.map((a) => a.review_date).filter(Boolean).sort()[0];
      return due ? (
        <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs">
          <CalendarClock className="h-4 w-4" />Next meeting: {fmt(due)}
        </p>
      ) : (
        <NextMeetingPicker viewer={viewer} apps={apps} patientId={records?.patientId} brokerUserId={records?.personal?.user_id} clientFirst={clientFirst} />
      );
    }
    case "Acknowledge renewal":
      return (
        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          {viewer === "client"
            ? "Each year we check your cover and investments still suit you. You'll be asked to confirm here when your review is due."
            : `${clientFirst} confirms the renewal at the annual review.`}
        </p>
      );
    default:
      return null;
  }
}
