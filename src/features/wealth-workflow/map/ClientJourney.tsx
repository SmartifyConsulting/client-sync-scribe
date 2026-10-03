import { useWorkflowMap } from "./useWorkflowMap";
import { WorkflowStepper } from "./WorkflowStepper";

/** Simplified client-facing view. No internal system steps. */
export function ClientJourney({ patientId }: { patientId: string }) {
  const m = useWorkflowMap(patientId);
  if (!m.workflow) return null;
  const wf = m.workflow;
  const myActions = m.openTasks.filter((t) => t.owner_role === "client").length;
  const cur = m.groups.find((g) => ["current", "waiting", "blocked"].includes(g.state));

  let message = "Your Wealth Manager is working on your plan.";
  if (wf.status === "closed_declined") message = "You declined this recommendation.";
  else if (myActions > 0) message = `You have ${myActions} action${myActions > 1 ? "s" : ""} to complete.`;
  else if (wf.current_stage === "client_decision") message = "Your recommendation is ready for your decision.";
  else if (["underwriting", "submission"].includes(wf.current_stage)) message = "Your application is being processed.";
  else if (wf.status === "blocked") message = "Your Wealth Manager needs additional information.";
  else if (cur?.state === "current") message = "We're waiting for your Wealth Manager.";

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your wealth journey</p>
      <p className="mt-1 font-medium text-foreground">{message}</p>
      <div className="mt-3">
        <WorkflowStepper groups={m.groups} viewer="client" />
      </div>
    </div>
  );
}

export default ClientJourney;
