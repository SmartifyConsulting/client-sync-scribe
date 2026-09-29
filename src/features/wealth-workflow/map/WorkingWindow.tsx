import { ArrowRight, CheckCircle2, FileText, FolderOpen, Info, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OwnerBadge } from "./WorkflowGroupCard";
import { STEP_GUIDANCE } from "./stepGuidance";
import type { GroupView } from "./useWorkflowMap";

const WHO: Record<string, string> = { client: "The client", advisor: "The Wealth Manager", system: "Holarc Wealth (automatic)", insurer: "The insurer" };

interface Props {
  group: GroupView | null;
  stepLabel: string | null;
  isLive: boolean;
  viewer: "manager" | "client";
  blockers: string[];
  documents: { id: string; name: string; document_kind?: string }[];
  onBackToCurrent: () => void;
  onOpenDocuments?: () => void;
}

export function WorkingWindow({ group, stepLabel, isLive, viewer, blockers, documents, onBackToCurrent, onOpenDocuments }: Props) {
  const step = group?.steps.find((s) => s.label === stepLabel);
  if (!group || !step) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
        All steps are complete. The workflow repeats at the next annual review.
      </div>
    );
  }
  const g = STEP_GUIDANCE[step.label];
  const mine = (viewer === "client" && step.owner === "client") || (viewer === "manager" && step.owner === "advisor");
  const status = step.state === "done" ? "Completed" : step.state === "next" ? "In progress" : step.state === "unconnected" ? "Not yet connected" : "Upcoming";

  return (
    <div key={step.label} className="animate-fade-in overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-primary animate-pulse" : "bg-muted-foreground/40")} />
          Working window
        </span>
        {!isLive && <button onClick={onBackToCurrent} className="text-xs font-medium text-primary hover:underline">Back to current</button>}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Step {group.group.n} · {group.group.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <OwnerBadge owner={step.owner} />
            <h3 className="text-base font-semibold text-foreground">{step.label}</h3>
          </div>
          <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
            step.state === "done" ? "bg-primary/10 text-primary" : step.state === "next" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {status}
          </span>
        </div>

        {g && <p className="text-sm text-foreground">{g.what}</p>}

        <Row icon={User} title="Who acts">{WHO[step.owner] ?? step.owner}{mine && step.state !== "done" ? " (you)" : ""}</Row>

        {g && step.state !== "done" && (
          <Row icon={Info} title="What is required">
            <ul className="mt-1 space-y-1">{g.required.map((r) => <li key={r} className="flex gap-2"><span className="text-primary">•</span>{r}</li>)}</ul>
          </Row>
        )}

        {blockers.length > 0 && step.state === "next" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <p className="flex items-center gap-1.5 font-semibold"><Lock className="h-3.5 w-3.5" /> Blocked because</p>
            <ul className="mt-1 space-y-0.5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}

        <Row icon={FileText} title="Documents">
          {documents.length ? (
            <ul className="mt-1 space-y-1">{documents.slice(0, 4).map((d) => <li key={d.id} className="truncate">{d.name}</li>)}</ul>
          ) : <span className="text-muted-foreground">No documents yet</span>}
          {onOpenDocuments && (
            <button onClick={onOpenDocuments} className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <FolderOpen className="h-3.5 w-3.5" /> Open documents
            </button>
          )}
        </Row>

        {g && <Row icon={ArrowRight} title="Completing this unlocks">{g.unlocks}</Row>}

        {mine && step.state === "next" && g?.clientAction && viewer === "client" && (
          <Button className="w-full rounded-full" onClick={onOpenDocuments}>{g.clientAction}</Button>
        )}
        {!mine && step.state === "next" && (
          <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">Waiting on {step.owner === "system" ? "Holarc Wealth (automatic)" : WHO[step.owner]?.toLowerCase() ?? step.owner}. This updates automatically.</p>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{title}</p>
        <div className="text-foreground">{children}</div>
      </div>
    </div>
  );
}
