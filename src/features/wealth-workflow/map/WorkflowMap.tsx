import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { DocumentTray } from "./DocumentTray";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStartWorkflow } from "../hooks";
import { OWNER_LABEL } from "./groups";
import { useWorkflowMap, type GroupView } from "./useWorkflowMap";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { LiveTray } from "./LiveTray";
import { playChime } from "./chime";
import { StageDetailSheet } from "./StageDetailSheet";
import { WorkingWindow } from "./WorkingWindow";
import { useWorkflowRealtime } from "../workspace/useWorkflowRealtime";
import { InsurerBadge } from "./insurerColors";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MapAvatars } from "./StepAvatar";

interface Props {
  patientId: string;
  clientName?: string;
  onOpenDocuments?: () => void;
  initialGroup?: string;
  onBackToLive?: () => void;
  viewer?: "manager" | "client";
  /** Kept for callers; the stepper + working window layout is always used. */
  stepperLayout?: boolean;
}

/** Live Workspace: step list on the left, working window for the active step on the right. */
export function WorkflowMap({ patientId, clientName, onOpenDocuments, initialGroup, onBackToLive, viewer = "manager" }: Props) {
  const m = useWorkflowMap(patientId, viewer);
  useWorkflowRealtime(patientId, m.workflow?.id);
  const [picked, setPicked] = useState<{ group: string; step: string } | null>(null);
  const start = useStartWorkflow();
  const { toast } = useToast();
  const [selected, setSelected] = useState<GroupView | null>(null);
  const [openedInitial, setOpenedInitial] = useState<string | undefined>();
  const clientFirst = (clientName ?? "Client").split(" ")[0] || "Client";
  const clientUid = m.records?.personal?.patient_user_id as string | undefined;
  const advisorUid = m.records?.personal?.user_id as string | undefined;
  const { data: avatarRows } = useQuery({
    queryKey: ["wealth-map-avatars", clientUid, advisorUid],
    enabled: !!(clientUid || advisorUid),
    queryFn: async () => {
      const ids = [clientUid, advisorUid].filter(Boolean) as string[];
      const { data } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      return data ?? [];
    },
  });
  const findP = (id?: string) => (avatarRows ?? []).find((r: any) => r.id === id) as any;
  const avatars: MapAvatars = {
    client: { url: findP(clientUid)?.avatar_url, name: clientName ?? findP(clientUid)?.full_name ?? "Client" },
    advisor: { url: findP(advisorUid)?.avatar_url, name: findP(advisorUid)?.full_name ?? "Wealth Manager" },
  };
  const liveKey = (() => {
    const g = m.groups.find((x) => x.steps.some((s) => s.state === "next"));
    const s = g?.steps.find((x) => x.state === "next");
    return g && s ? `${g.group.key}:${s.label}` : "";
  })();
  const prevLive = useRef<string | null>(null);
  useEffect(() => {
    if (!m.workflow) return;
    if (prevLive.current !== null && prevLive.current !== liveKey) { playChime(); setPicked(null); }
    prevLive.current = liveKey;
  }, [liveKey, m.workflow]);
  useEffect(() => {
    if (!initialGroup || openedInitial === initialGroup || !m.workflow) return;
    const g = m.groups.find((x) => x.group.key === initialGroup);
    if (g) { setSelected(g); setOpenedInitial(initialGroup); }
  }, [initialGroup, openedInitial, m.workflow, m.groups]);

  if (m.loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (!m.workflow) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm">
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
  const docCount = (m.records?.docs ?? []).length + (m.records?.signed ?? []).length;
  const managerFirst = avatars.advisor.name && avatars.advisor.name !== "Wealth Manager" ? avatars.advisor.name.split(" ")[0] : "your Wealth Manager";
  const renderWorking = (isLiveStep: boolean) => <WorkingWindow embedded managerName={managerFirst} group={shownGroup} stepLabel={shownStep} isLive={isLiveStep} viewer={viewer}
        clientName={clientName ?? "Client"} workflowId={wf.id} records={m.records}
        blockers={wf.status === "blocked" ? wf.blockers : []}
        documents={(m.records?.docs ?? []) as any[]}
        onBackToCurrent={() => setPicked(null)} onOpenDocuments={onOpenDocuments} />;
  const isLive = !picked || (picked.group === liveGroup?.group.key && picked.step === liveStep);

  return (
    <div className="space-y-4">
      {onBackToLive && (
        <button onClick={onBackToLive} className="text-xs font-medium text-primary hover:underline">← Back to Live workspace</button>
      )}
      {viewer === "manager" && wf.status === "blocked" && wf.blockers.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-card px-4 py-2.5 text-xs text-destructive">
          <span className="font-semibold">Blocked: </span>{wf.blockers.join(" · ")}
        </div>
      )}


      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Steps
          </p>
          <LiveTray groups={m.groups} viewer={viewer} clientFirst={clientFirst}
            managerName={managerFirst} avatars={avatars} nextTitle={nextAction?.title}
            history={(gk, step) => <WorkingWindow embedded managerName={managerFirst} group={m.groups.find((g) => g.group.key === gk) ?? null} stepLabel={step} isLive={false} viewer={viewer}
              clientName={clientName ?? "Client"} workflowId={wf.id} records={m.records} blockers={[]}
              documents={(m.records?.docs ?? []) as any[]} onBackToCurrent={() => {}} onOpenDocuments={onOpenDocuments} />}
            legend={<>
              <span className="mr-1 text-2xs uppercase tracking-[0.14em] text-muted-foreground">Legend</span>
              <SolidBadge className="bg-emerald-600">{clientFirst}</SolidBadge>
              <SolidBadge className="bg-blue-600">{avatars.advisor.name && avatars.advisor.name !== "Wealth Manager" ? avatars.advisor.name.split(" ")[0] : "Wealth Manager"}</SolidBadge>
              <SolidBadge className="bg-slate-600">System</SolidBadge>
              {Array.from(new Set((m.records?.holdings ?? []).map((h: any) => h.provider as string))).map((p) => <InsurerBadge key={p} provider={p} />)}
            </>} />
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Working window
              {shownStep && <span className="normal-case tracking-normal text-foreground">· {shownStep}</span>}
            </span>
            <DocumentTray patientId={patientId} count={docCount} />
          </div>
          {!isLive && <button onClick={() => setPicked(null)} className="mb-2 text-xs font-medium text-primary hover:underline">← Back to current step</button>}
          {renderWorking(isLive)}
        </div>
      </div>



      <StageDetailSheet view={selected} onClose={() => setSelected(null)} workflow={wf} defs={m.defs} recs={m.recs} records={m.records} />
    </div>
  );
}

function SolidBadge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold text-white ${className}`}>{children}</span>;
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={danger ? "text-destructive" : "text-foreground"}>{value}</p>
    </div>
  );
}

export default WorkflowMap;
