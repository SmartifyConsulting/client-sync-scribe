import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStartWorkflow } from "../hooks";
import { OWNER_LABEL } from "./groups";
import { useWorkflowMap, type GroupView } from "./useWorkflowMap";
import { WorkflowGroupCard } from "./WorkflowGroupCard";
import { StageDetailSheet } from "./StageDetailSheet";
import { WorkingWindow } from "./WorkingWindow";
import { useWorkflowRealtime } from "../workspace/useWorkflowRealtime";

interface Props {
  patientId: string;
  clientName?: string;
  onOpenDocuments?: () => void;
  initialGroup?: string;
  onBackToLive?: () => void;
  viewer?: "manager" | "client";
}

/** Wealth manager view: a read-only projection of the workflow engine. */
export function WorkflowMap({ patientId, clientName, onOpenDocuments, initialGroup, onBackToLive, viewer = "manager" }: Props) {
  const m = useWorkflowMap(patientId);
  useWorkflowRealtime(patientId, m.workflow?.id);
  const [picked, setPicked] = useState<{ group: string; step: string } | null>(null);
  const start = useStartWorkflow();
  const { toast } = useToast();
  const [selected, setSelected] = useState<GroupView | null>(null);
  const [openedInitial, setOpenedInitial] = useState<string | undefined>();
  useEffect(() => {
    if (!initialGroup || openedInitial === initialGroup || !m.workflow) return;
    const g = m.groups.find((x) => x.group.key === initialGroup);
    if (g) { setSelected(g); setOpenedInitial(initialGroup); }
  }, [initialGroup, openedInitial, m.workflow, m.groups]);

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

  const liveGroup = m.groups.find((g) => g.steps.some((s) => s.state === "next")) ?? current ?? null;
  const liveStep = liveGroup?.steps.find((s) => s.state === "next")?.label ?? null;
  const shownGroup = picked ? m.groups.find((g) => g.group.key === picked.group) ?? null : liveGroup;
  const shownStep = picked ? picked.step : liveStep;
  const isLive = !picked || (picked.group === liveGroup?.group.key && picked.step === liveStep);

  const clientFirst = (clientName ?? "").split(" ")[0] || "Client";
  const cards = m.groups.map((g) => (
    <WorkflowGroupCard key={g.group.key} view={g} blockers={g.state === "blocked" ? wf.blockers : []} viewer={viewer} clientFirst={clientFirst}
      onOpen={() => viewer === "manager" && setSelected(g)}
      selectedStep={shownGroup?.group.key === g.group.key ? shownStep : null}
      onSelectStep={(label) => setPicked({ group: g.group.key, step: label })} />
  ));

  return (
    <div className="space-y-4">
      {onBackToLive && (
        <button onClick={onBackToLive} className="text-xs font-medium text-primary hover:underline">← Back to Live workspace</button>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border/70 bg-card px-4 py-2.5 text-[13px] sm:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">{cards}</div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <WorkingWindow group={shownGroup} stepLabel={shownStep} isLive={isLive} viewer={viewer}
            clientName={clientName ?? "Client"} workflowId={wf.id} records={m.records}
            blockers={wf.status === "blocked" ? wf.blockers : []}
            documents={(m.records?.docs ?? []) as any[]}
            onBackToCurrent={() => setPicked(null)} onOpenDocuments={onOpenDocuments} />
        </div>
      </div>

      <StageDetailSheet view={selected} onClose={() => setSelected(null)} workflow={wf} defs={m.defs} recs={m.recs} records={m.records} />
    </div>
  );
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={danger ? "text-destructive" : "text-foreground"}>{value}</p>
    </div>
  );
}

export default WorkflowMap;
