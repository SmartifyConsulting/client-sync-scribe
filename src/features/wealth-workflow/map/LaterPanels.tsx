import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, FileText, Loader2, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
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
  "Accept, decline or issue", "Policy schedule to portal and CRM", "Schedule annual review", "Schedule review meeting", "Acknowledge renewal",
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
            {viewer === "client" ? "Upload a copy of your ID, proof of address (less than 3 months old) and a bank statement or bank letter." : `${clientFirst} uploads ID, proof of address and bank confirmation.`}
          </p>
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
      return (
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            {viewer === "client"
              ? "The insurer needs your health answers to issue life cover. They go straight to the insurer, encrypted. Your Wealth Manager does not see them."
              : `${clientFirst} answers the insurer's health questions directly. Answers are encrypted and not visible to you.`}
          </p>
        </div>
      );
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
    case "Schedule annual review": {
      const due = apps.map((a) => a.review_date).filter(Boolean).sort()[0];
      return (
        <div className="space-y-3">
          <p className={cn("flex items-center gap-2 rounded-lg p-3 text-xs", due ? "bg-muted/50" : "bg-muted/30 text-muted-foreground")}>
            <CalendarClock className="h-4 w-4" />{due ? `Next review: ${fmt(due)}` : "No review date set yet."}
          </p>
          {viewer === "manager" && (
            <Button className="w-full rounded-full" disabled={review.isPending} onClick={() => run(review.mutateAsync({ workflowId }), "Annual review started")}>
              {review.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Start annual review
            </Button>
          )}
        </div>
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
