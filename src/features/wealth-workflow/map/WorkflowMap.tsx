import { useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStartWorkflow } from "../hooks";
import { OWNER_LABEL } from "./groups";
import { useWorkflowMap, type GroupView } from "./useWorkflowMap";
import { WorkflowGroupCard } from "./WorkflowGroupCard";
import { StageDetailSheet } from "./StageDetailSheet";

interface Props {
  patientId: string;
  clientName?: string;
  onOpenDocuments?: () => void;
}

/** Wealth manager view: a read-only projection of the workflow engine. */
export function WorkflowMap({ patientId, clientName, onOpenDocuments }: Props) {
  const m = useWorkflowMap(patientId);
  const start = useStartWorkflow();
  const { toast } = useToast();
  const [selected, setSelected] = useState<GroupView | null>(null);

  if (m.loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (!m.workflow) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm">
        <p className="text-muted-foreground">No wealth workflow for this client yet.</p>
        <Button className="mt-3" size="sm" disabled={start.isPending}
          onClick={() => start.mutate({ patientId }, { onError: (e: any) => toast({ title: "Could not start", description: e.message, variant: "destructive" }) })}>
          Start workflow
        </Button>
      </div>
    );
  }

  const wf = m.workflow;
  const curLabel = m.defs.find((d) => d.stage === wf.current_stage)?.label ?? wf.current_stage;
  const current = m.groups.find((g) => ["current", "waiting", "blocked"].includes(g.state));
  const nextAction = m.openTasks.find((t) => t.workflow_stage === wf.current_stage) ?? m.openTasks[0];
  const statusText = current?.state === "waiting" && current.waitingFor
    ? `Awaiting ${OWNER_LABEL[current.waitingFor] ?? current.waitingFor}`
    : wf.status === "closed_declined" ? "Closed – declined" : wf.status === "blocked" ? "Blocked" : "In progress";

  const cards = m.groups.map((g) => (
    <WorkflowGroupCard key={g.group.key} view={g} blockers={g.state === "blocked" ? wf.blockers : []} onOpen={() => setSelected(g)} />
  ));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border bg-card p-3 text-sm sm:grid-cols-4">
        <Field label="Client" value={clientName ?? "—"} />
        <Field label="Current stage" value={curLabel} />
        <Field label="Status" value={statusText} danger={wf.status === "blocked"} />
        <Field label="Next action" value={nextAction?.title ?? "—"} />
        {wf.status === "blocked" && wf.blockers.length > 0 && (
          <div className="col-span-full text-xs text-destructive">
            <span className="font-semibold">Blocked: </span>{wf.blockers.join(" · ")}
          </div>
        )}
      </div>

      {/* Mobile / tablet: vertical list */}
      <div className="space-y-3 lg:hidden">{cards}</div>

      {/* Desktop: zig-zag two-column layout */}
      <div className="hidden gap-x-10 gap-y-4 lg:grid lg:grid-cols-2">
        <div className="space-y-6">
          {cards[0]}
          <button onClick={onOpenDocuments}
            className="mx-auto flex h-40 w-44 flex-col items-center justify-center gap-2 rounded-lg bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/40">
              <FolderOpen className="h-8 w-8" />
            </span>
            Documents
          </button>
          {cards[5]}
          {cards[4]}
        </div>
        <div className="space-y-6 pt-12">
          {cards[1]}
          {cards[2]}
          {cards[3]}
        </div>
      </div>

      <StageDetailSheet view={selected} onClose={() => setSelected(null)} workflow={wf} defs={m.defs} recs={m.recs} records={m.records} />
    </div>
  );
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={danger ? "font-medium text-destructive" : "font-medium text-foreground"}>{value}</p>
    </div>
  );
}

export default WorkflowMap;
