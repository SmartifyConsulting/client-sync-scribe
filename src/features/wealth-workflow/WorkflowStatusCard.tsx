import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientWorkflow, useRecommendationHistory, useRecordDecision, useStageDefs, useTransition } from "./hooks";

/** Compact workflow status. Not mounted anywhere yet (Workflow Map / Workspace are separate tasks). */
export function WorkflowStatusCard({ patientId }: { patientId: string }) {
  const { data: wf } = useClientWorkflow(patientId);
  const { data: defs = [] } = useStageDefs();
  const { data: recs = [] } = useRecommendationHistory(wf?.id);
  const transition = useTransition();
  const decide = useRecordDecision();

  if (!wf) return null;
  const def = defs.find((d) => d.stage === wf.current_stage);
  const presented = recs.find((r) => r.status === "presented");
  const next = (def?.next_stages ?? []).filter((s) => s !== "closed_declined" && s !== "consultation" && wf.current_stage !== "client_decision");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {def?.label ?? wf.current_stage}
          <Badge variant={wf.status === "blocked" ? "destructive" : "secondary"}>{wf.status}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">Cycle {wf.cycle_number}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {wf.blockers?.length > 0 && (
          <div className="rounded-md border border-destructive/40 p-2 text-sm">
            <p className="font-medium text-destructive">Blocked. Missing:</p>
            <ul className="ml-4 list-disc">{wf.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}
        {wf.current_stage === "client_decision" && presented && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => decide.mutate({ recommendationId: presented.id, decision: "accepted" })}>Accepted</Button>
            <Button size="sm" variant="outline" onClick={() => decide.mutate({ recommendationId: presented.id, decision: "changes_requested" })}>Changes requested</Button>
            <Button size="sm" variant="destructive" onClick={() => decide.mutate({ recommendationId: presented.id, decision: "declined" })}>Declined</Button>
          </div>
        )}
        {next.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {next.map((s) => (
              <Button key={s} size="sm" variant="outline" disabled={transition.isPending}
                onClick={() => transition.mutate({ workflowId: wf.id, toStage: s })}>
                Move to {defs.find((d) => d.stage === s)?.label ?? s}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkflowStatusCard;
