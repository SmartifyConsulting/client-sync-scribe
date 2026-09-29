import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  usePresentRecommendation, useRecordDecision, useStartAnnualReview, useTransition, useWorkflowBlockers,
} from "../hooks";
import type { StageDef, WealthRecommendation, WealthWorkflow } from "../types";
import { OwnerBadge } from "./WorkflowGroupCard";
import type { GroupView } from "./useWorkflowMap";

interface Props {
  view: GroupView | null;
  onClose: () => void;
  workflow: WealthWorkflow;
  defs: StageDef[];
  recs: WealthRecommendation[];
  records?: { apps: any[]; compliance: any; tasks: any[]; docs: any[] };
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-1.5">
    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
    {children}
  </section>
);

const Req = ({ ok, label }: { ok: boolean; label: string }) => (
  <li className="flex items-center gap-2 text-sm">
    {ok ? <Check className="h-3.5 w-3.5 text-primary" /> : <X className="h-3.5 w-3.5 text-destructive" />}
    <span className={ok ? "text-muted-foreground" : "text-foreground"}>{label}</span>
  </li>
);

export function StageDetailSheet({ view, onClose, workflow, defs, recs, records }: Props) {
  const { toast } = useToast();
  const transition = useTransition();
  const present = usePresentRecommendation();
  const decide = useRecordDecision();
  const annual = useStartAnnualReview();

  const isCurrent = !!view && view.group.stages.includes(workflow.current_stage as any);
  const curDef = defs.find((d) => d.stage === workflow.current_stage);
  const nextStage = curDef?.next_stages.find((s) => s !== "closed_declined" && s !== "recommendation" && s !== "consultation");
  const { data: nextBlockers = [] } = useWorkflowBlockers(isCurrent ? workflow.id : undefined, nextStage as any);

  if (!view) return null;
  const stageDefs = defs.filter((d) => view.group.stages.includes(d.stage as any));
  const stageNames = new Set<string>(view.group.stages);
  const tasks = (records?.tasks ?? []).filter((t) => stageNames.has(t.workflow_stage));
  const presented = recs.find((r) => r.status === "presented");
  const draft = recs.find((r) => r.status === "draft");
  const c = records?.compliance;
  const kinds = new Set((records?.docs ?? []).map((d) => d.document_kind));

  const run = async (p: Promise<any>, ok: string) => {
    try {
      const res = await p;
      if (res && res.ok === false) toast({ title: "Blocked", description: (res.blockers ?? []).join(", "), variant: "destructive" });
      else toast({ title: ok });
    } catch (e: any) {
      toast({ title: "Not allowed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={!!view} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {view.group.n}. {view.group.title}
            <Badge variant={view.state === "blocked" ? "destructive" : "secondary"}>{view.state.replace("_", " ")}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <Section title="Stages">
            <ul className="space-y-1">
              {stageDefs.map((d) => (
                <li key={d.stage} className="flex items-center gap-2 text-sm">
                  <OwnerBadge owner={d.owner_role} />
                  <span className={d.stage === workflow.current_stage ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    {d.label}
                  </span>
                  {d.stage === workflow.current_stage && <span className="text-xs text-primary">current</span>}
                </li>
              ))}
            </ul>
          </Section>

          {isCurrent && nextStage && (
            <Section title={`Required before ${defs.find((d) => d.stage === nextStage)?.label ?? nextStage}`}>
              {nextBlockers.length === 0
                ? <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
                : <ul className="space-y-1">{nextBlockers.map((b) => <Req key={b} ok={false} label={b} />)}</ul>}
            </Section>
          )}

          {view.group.key === "presentation" && (
            <Section title="Compliance & documents">
              <ul className="space-y-1">
                <Req ok={recs.some((r) => r.status === "accepted")} label="Recommendation accepted" />
                <Req ok={kinds.has("roa_signed")} label="ROA signed" />
                <Req ok={c?.kyc_fica_status === "completed"} label="KYC / FICA completed" />
                {(c?.bank_validation_required ?? true) && <Req ok={c?.bank_validation_status === "completed"} label="Bank validation" />}
                <Req ok={c?.declarations_status === "completed"} label="Declarations" />
                <Req ok={kinds.has("proof_of_residence")} label="Proof of residence" />
                <Req ok={kinds.has("id_document")} label="ID document" />
              </ul>
            </Section>
          )}

          {(view.group.key === "quotes" || view.group.key === "presentation") && recs.length > 0 && (
            <Section title="Recommendation / ROA versions">
              <ul className="space-y-1 text-sm">
                {recs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded border px-2 py-1">
                    <span>v{r.version} {r.title ?? ""}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.status.replace("_", " ")}{r.roa_document_id ? " · ROA" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {view.group.key === "issuance" && (
            <Section title="Applications">
              {(records?.apps ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No application yet.</p> : (
                <ul className="space-y-1 text-sm">
                  {records!.apps.map((a) => (
                    <li key={a.id} className="flex justify-between rounded border px-2 py-1">
                      <span>{a.product ?? "Product"} · {a.provider ?? "Provider"}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.status}{a.review_date ? ` · review ${format(new Date(a.review_date), "d MMM yyyy")}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          <Section title="Outstanding actions">
            {tasks.filter((t) => t.status !== "completed").length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
              <ul className="space-y-1 text-sm">
                {tasks.filter((t) => t.status !== "completed").map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <OwnerBadge owner={t.owner_role ?? "system"} />
                    <span className="flex-1">{t.title}</span>
                    {t.due_date && <span className="text-xs text-muted-foreground">{format(new Date(t.due_date), "d MMM")}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {isCurrent && (
            <Section title="Available actions">
              <div className="flex flex-wrap gap-2">
                {workflow.current_stage === "recommendation" && draft && (
                  <Button size="sm" onClick={() => run(present.mutateAsync(draft.id), "Presented to client")}>
                    Present v{draft.version}
                  </Button>
                )}
                {workflow.current_stage === "client_decision" && presented && (
                  <>
                    <Button size="sm" onClick={() => run(decide.mutateAsync({ recommendationId: presented.id, decision: "accepted" }), "Accepted")}>Accepted</Button>
                    <Button size="sm" variant="outline" onClick={() => run(decide.mutateAsync({ recommendationId: presented.id, decision: "changes_requested" }), "New version drafted")}>Changes requested</Button>
                    <Button size="sm" variant="destructive" onClick={() => run(decide.mutateAsync({ recommendationId: presented.id, decision: "declined" }), "Declined")}>Declined</Button>
                  </>
                )}
                {(workflow.current_stage === "follow_up" || workflow.current_stage === "annual_review") && (
                  <Button size="sm" onClick={() => run(annual.mutateAsync({ workflowId: workflow.id }), "Annual review started")}>Start annual review</Button>
                )}
                {nextStage && !["client_decision", "recommendation"].includes(workflow.current_stage) && workflow.current_stage !== "annual_review" && (
                  <Button size="sm" variant="outline" disabled={nextBlockers.length > 0}
                    onClick={() => run(transition.mutateAsync({ workflowId: workflow.id, toStage: nextStage as any }), "Moved on")}>
                    Continue to {defs.find((d) => d.stage === nextStage)?.label}
                  </Button>
                )}
              </div>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
