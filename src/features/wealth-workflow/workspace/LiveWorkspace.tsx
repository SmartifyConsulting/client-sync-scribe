import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePresentRecommendation, useRecordDecision, useStartAnnualReview, useStartWorkflow } from "../hooks";
import { OWNER_LABEL } from "../map/groups";
import { WorkspaceItemRow, type ItemAction } from "./WorkspaceItem";
import { useLiveWorkspace, type WorkspaceItem } from "./useLiveWorkspace";

interface Props {
  patientId: string;
  clientName?: string;
  onViewWorkflow: (group: string) => void;
  onOpenDocuments: () => void;
  onOpenDocument?: (id: string) => void;
  onOpenClientRecord?: () => void;
  onOpenMessages?: () => void;
  onScheduleConsultation?: () => void;
}

export function LiveWorkspace({ patientId, clientName, onViewWorkflow, onOpenDocuments, onOpenDocument, onOpenClientRecord, onOpenMessages, onScheduleConsultation }: Props) {
  const ws = useLiveWorkspace(patientId);
  const { toast } = useToast();
  const qc = useQueryClient();
  const start = useStartWorkflow();
  const present = usePresentRecommendation();
  const decide = useRecordDecision();
  const annual = useStartAnnualReview();

  if (ws.loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!ws.workflow) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm">
        <p className="text-muted-foreground">No wealth workflow for this client yet.</p>
        <Button className="mt-3" size="sm" disabled={start.isPending} onClick={() => start.mutate({ patientId })}>Start workflow</Button>
      </div>
    );
  }
  const wf = ws.workflow;

  const run = async (p: Promise<any>, ok: string) => {
    try { await p; toast({ title: ok }); } catch (e: any) { toast({ title: "Not allowed", description: e.message, variant: "destructive" }); }
  };
  const markDone = (todoId: string) => run(
    (async () => {
      const { error } = await supabase.from("todos").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", todoId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
    })(), "Action completed");
  const remind = (todoId: string) => run(
    (async () => {
      const { data, error } = await (supabase as any).rpc("wealth_send_reminder", { _todo_id: todoId });
      if (error) throw error;
      if (data === false) throw new Error("This client has no app account to notify.");
    })(), "Reminder sent");

  const actionsFor = (i: WorkspaceItem): ItemAction[] => {
    const a: ItemAction[] = [];
    if (i.kind === "present" && i.recommendationId && i.documentId) a.push({ label: "Present", variant: "default", onClick: () => run(present.mutateAsync(i.recommendationId!), "Presented") });
    if (i.kind === "decision" && i.recommendationId) {
      a.push({ label: "Accepted", variant: "default", onClick: () => run(decide.mutateAsync({ recommendationId: i.recommendationId!, decision: "accepted" }), "Accepted") });
      a.push({ label: "Changes", onClick: () => run(decide.mutateAsync({ recommendationId: i.recommendationId!, decision: "changes_requested" }), "New version drafted") });
      a.push({ label: "Declined", variant: "destructive", onClick: () => run(decide.mutateAsync({ recommendationId: i.recommendationId!, decision: "declined" }), "Declined") });
    }
    if (i.kind === "message" && onOpenMessages) a.push({ label: "Reply", variant: "default", onClick: onOpenMessages });
    if (i.kind === "annual_review" && onScheduleConsultation) a.push({ label: "Schedule consultation", onClick: onScheduleConsultation });
    if (i.kind === "annual_review") a.push({ label: "Start annual review", variant: "default", onClick: () => run(annual.mutateAsync({ workflowId: wf.id }), "Annual review started") });
    if (i.documentId && onOpenDocument) a.push({ label: "View ROA", onClick: () => onOpenDocument(i.documentId!) });
    if (i.kind === "requirement") a.push({ label: "Documents", onClick: onOpenDocuments });
    if (i.todoId) {
      if (i.who === "client") a.push({ label: "Send reminder", onClick: () => remind(i.todoId!) });
      a.push({ label: "Mark done", onClick: () => markDone(i.todoId!) });
    }
    if (onOpenClientRecord && i.who === "client") a.push({ label: "Client record", variant: "ghost", onClick: onOpenClientRecord });
    a.push({ label: "View workflow", variant: "ghost", onClick: () => onViewWorkflow(i.group) });
    return a;
  };

  const curLabel = ws.defs.find((d) => d.stage === wf.current_stage)?.label ?? wf.current_stage;
  const waitingFor = ws.groups.find((g) => g.state === "waiting")?.waitingFor;
  const status = wf.status === "blocked" ? "Blocked" : wf.status === "closed_declined" ? "Closed – declined"
    : waitingFor ? `Awaiting ${OWNER_LABEL[waitingFor] ?? waitingFor}` : "In progress";
  const nextAction = ws.now[0]?.what ?? ws.next[0]?.what ?? "—";
  const currentRec = ws.recs.find((r) => r.status !== "superseded");
  const app = ws.records?.apps?.[0];

  const waitingByOwner = ws.waiting.reduce<Record<string, WorkspaceItem[]>>((acc, i) => {
    (acc[i.who] ??= []).push(i); return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Context strip */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border bg-card p-3 text-sm md:grid-cols-3 xl:grid-cols-6">
        <Ctx label="Client" value={clientName ?? "—"} />
        <Ctx label="Consultation" value={ws.lastSession ? format(new Date(ws.lastSession.started_at ?? ws.lastSession.created_at), "d MMM yyyy") : "—"} />
        <Ctx label="Current stage" value={curLabel} />
        <Ctx label="Status" value={status} danger={wf.status === "blocked"} />
        <Ctx label="Next action" value={nextAction} />
        <Ctx label="Outstanding" value={String(ws.now.length + ws.next.length + ws.waiting.length)} />
        <div className="col-span-full flex flex-wrap gap-1.5 border-t pt-2">
          {currentRec && (
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => currentRec.roa_document_id && onOpenDocument ? onOpenDocument(currentRec.roa_document_id) : onViewWorkflow("quotes")}>
              Recommendation v{currentRec.version} · {currentRec.status.replace("_", " ")}
            </Button>
          )}
          {app && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewWorkflow("issuance")}>Application · {app.status}</Button>}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenDocuments}>Documents</Button>
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => onViewWorkflow(ws.groups.find((g) => ["current", "waiting", "blocked"].includes(g.state))?.group.key ?? "gateway")}>
            View workflow →
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Now" count={ws.now.length} accent>
          {ws.now.length === 0 ? <Empty text="Nothing needs immediate attention." /> : ws.now.map((i) => <WorkspaceItemRow key={i.id} item={i} actions={actionsFor(i)} />)}
        </Section>
        <Section title="Next" count={ws.next.length}>
          {ws.next.length === 0 ? <Empty text="No upcoming steps." /> : ws.next.map((i) => <WorkspaceItemRow key={i.id} item={i} actions={actionsFor(i)} />)}
        </Section>
        <Section title="Waiting" count={ws.waiting.length}>
          {ws.waiting.length === 0 ? <Empty text="Not waiting on anyone." /> : Object.entries(waitingByOwner).map(([owner, items]) => (
            <div key={owner}>
              <p className="bg-muted/40 px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Waiting for {OWNER_LABEL[owner] ?? owner}
              </p>
              {items.map((i) => <WorkspaceItemRow key={i.id} item={i} actions={actionsFor(i)} />)}
            </div>
          ))}
        </Section>
        <Section title="Blocked" count={ws.blocked.reduce((n, b) => n + b.missing.length, 0)} danger={ws.blocked.length > 0}>
          {ws.blocked.length === 0 ? <Empty text="Nothing is blocked." /> : ws.blocked.map((b) => (
            <div key={b.stage} className="px-3 py-2.5 text-sm">
              <p className="font-semibold uppercase tracking-wide text-destructive">{b.stage} – blocked</p>
              <p className="mt-1 text-xs text-muted-foreground">Reason:</p>
              <ul className="mt-0.5 space-y-0.5">
                {b.missing.map((m) => <li key={m.id} className="text-sm">✕ {m.what} <span className="text-xs text-muted-foreground">({OWNER_LABEL[m.who] ?? m.who})</span></li>)}
              </ul>
              <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={() => onViewWorkflow(b.missing[0]?.group ?? b.group)}>View workflow</Button>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Completed" count={ws.completed.length}>
        {ws.completed.length === 0 ? <Empty text="No milestones yet." /> : (
          <ul className="grid gap-x-6 px-3 py-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {ws.completed.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 text-foreground">{c.label}</span>
                {c.at && <span className="text-xs text-muted-foreground">{format(new Date(c.at), "d MMM")}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Ctx({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`truncate font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Section({ title, count, children, accent, danger }: { title: string; count: number; children: React.ReactNode; accent?: boolean; danger?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-xl border bg-card ${accent ? "border-t-2 border-t-primary" : ""} ${danger ? "border-t-2 border-t-destructive" : ""}`}>
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{count}</span>
      </header>
      <div className="divide-y">{children}</div>
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className="px-3 py-3 text-xs text-muted-foreground">{text}</p>;

export default LiveWorkspace;
