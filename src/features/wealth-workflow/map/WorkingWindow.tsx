import { CheckCircle2, FolderOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OwnerBadge } from "./WorkflowGroupCard";
import { STEP_GUIDANCE, fillName, ownerLabel } from "./stepGuidance";
import { KycPanel, SignDocsPanel } from "./OnboardingPanels";
import type { GroupView } from "./useWorkflowMap";

interface Props {
  group: GroupView | null;
  stepLabel: string | null;
  isLive: boolean;
  viewer: "manager" | "client";
  clientName: string;
  workflowId: string;
  records: any;
  blockers: string[];
  documents: { id: string; name: string; document_kind?: string }[];
  onBackToCurrent: () => void;
  onOpenDocuments?: () => void;
}

export function WorkingWindow({ group, stepLabel, isLive, viewer, clientName, workflowId, records, blockers, documents, onBackToCurrent, onOpenDocuments }: Props) {
  const step = group?.steps.find((s) => s.label === stepLabel);
  const first = clientName.split(" ")[0] || "The client";
  if (!group || !step) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
        All steps are complete. The cycle starts again at the next annual review.
      </div>
    );
  }
  const g = STEP_GUIDANCE[step.label];
  const t = g ? g[viewer] : null;
  const mine = (viewer === "client" && step.owner === "client") || (viewer === "manager" && step.owner === "advisor");
  const who = ownerLabel(step.owner, viewer, first);
  const status = step.state === "done" ? "Completed" : step.state === "next" ? (mine ? "Your turn" : "In progress") : "Upcoming";
  const waitingText = viewer === "client"
    ? (step.owner === "advisor" ? "Your Wealth Manager is working on this. You don't need to do anything yet." : step.owner === "insurer" ? "Your insurer is working on this. We'll update you here." : "Holarc Wealth is doing this automatically.")
    : (step.owner === "client" ? `Waiting for ${first}. This updates as soon as they act.` : step.owner === "insurer" ? "Waiting for the insurer." : "Holarc Wealth is doing this automatically.");
  const isKyc = step.label === "KYC, AML and PEP Screening";
  const isSign = step.label === "Sign disclosure and LOA";

  return (
    <div key={step.label} className="animate-fade-in overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-primary animate-pulse" : "bg-muted-foreground/40")} />
          Working window
        </span>
        {!isLive && <button onClick={onBackToCurrent} className="text-xs font-medium text-primary hover:underline">Back to current</button>}
      </div>

      <div className="divide-y divide-border/60 p-5 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Step {group.group.n} · {viewer === "client" ? group.group.clientTitle : group.group.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <OwnerBadge owner={step.owner} label={who} />
            <h3 className="text-[15px] font-medium tracking-tight text-foreground">{step.label}</h3>
          </div>
          <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
            step.state === "done" ? "bg-primary/10 text-primary" : step.state === "next" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {status}
          </span>
        </div>

        {t && <p className="text-[13px] leading-relaxed text-muted-foreground">{fillName(t.what, first)}</p>}

        {t && step.state !== "done" && (
          <Row title={viewer === "client" && mine ? "What you'll need" : "What is needed"}>
            <ul className="mt-1 space-y-1">{t.required.map((r) => <li key={r} className="flex gap-2"><span className="text-primary">•</span>{fillName(r, first)}</li>)}</ul>
          </Row>
        )}

        {blockers.length > 0 && step.state === "next" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <p className="flex items-center gap-1.5 font-semibold"><Lock className="h-3.5 w-3.5" /> On hold because</p>
            <ul className="mt-1 space-y-0.5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}

        {isKyc && (step.state === "next" || step.state === "done") && (
          <KycPanel workflowId={workflowId} kyc={records?.kyc} viewer={viewer} clientFirst={first} />
        )}
        {isSign && (step.state === "next" || step.state === "done") && (
          <SignDocsPanel workflowId={workflowId} signed={records?.signed ?? []} viewer={viewer} clientName={clientName} />
        )}

        {!isKyc && !isSign && (
          <Row title="Documents">
            {documents.length ? (
              <ul className="mt-1 space-y-1">{documents.slice(0, 4).map((d) => <li key={d.id} className="truncate">{d.name}</li>)}</ul>
            ) : <span className="text-muted-foreground">No documents yet</span>}
            {onOpenDocuments && (
              <button onClick={onOpenDocuments} className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <FolderOpen className="h-3.5 w-3.5" /> Open documents
              </button>
            )}
          </Row>
        )}

        {g && <Row title="Completing this unlocks">{g.unlocks}</Row>}

        {mine && step.state === "next" && t?.action && !isKyc && !isSign && (
          <Button className="w-full rounded-full" onClick={onOpenDocuments}>{t.action}</Button>
        )}
        {!mine && step.state === "next" && (
          <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{waitingText}</p>
        )}
      </div>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-[13px]">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
