import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientWorkflow, useRecommendationHistory, useStageDefs } from "../hooks";
import { WORKFLOW_GROUPS, type MapContext, type WorkflowGroup } from "./groups";

const db = supabase as any;

export type GroupState = "completed" | "current" | "pending" | "blocked" | "waiting" | "not_applicable";
export type StepState = "done" | "next" | "pending" | "unconnected";

export interface GroupView {
  group: WorkflowGroup;
  state: GroupState;
  waitingFor?: string;
  steps: { label: string; owner: string; state: StepState }[];
}

export function useWorkflowRecords(workflowId?: string, patientId?: string) {
  return useQuery({
    queryKey: ["wealth-map-records", workflowId, patientId],
    enabled: !!workflowId && !!patientId,
    queryFn: async () => {
      const [apps, comp, tasks, docs] = await Promise.all([
        db.from("wealth_applications").select("*").eq("workflow_id", workflowId).order("created_at", { ascending: false }),
        db.from("wealth_compliance_checks").select("*").eq("workflow_id", workflowId).maybeSingle(),
        db.from("todos").select("id,title,status,due_date,owner_role,workflow_stage,priority")
          .eq("workflow_id", workflowId).order("due_date", { ascending: true }),
        db.from("documents").select("id,name,document_kind,created_at").eq("patient_id", patientId).not("document_kind", "is", null),
      ]);
      return {
        apps: (apps.data ?? []) as any[],
        compliance: comp.data ?? null,
        tasks: (tasks.data ?? []) as any[],
        docs: (docs.data ?? []) as any[],
      };
    },
  });
}

export function useWorkflowMap(patientId?: string) {
  const wfQ = useClientWorkflow(patientId);
  const wf = wfQ.data;
  const { data: defs = [] } = useStageDefs();
  const { data: recs = [] } = useRecommendationHistory(wf?.id);
  const { data: rec } = useWorkflowRecords(wf?.id, patientId);

  const posOf = (s: string) => defs.find((d) => d.stage === s)?.position ?? 0;
  const stagePos = wf ? posOf(wf.current_stage) : 0;
  const openTasks = (rec?.tasks ?? []).filter((t) => t.status !== "completed" && t.status !== "done");

  const ctx: MapContext = {
    stagePos,
    recs,
    apps: rec?.apps ?? [],
    compliance: rec?.compliance ?? null,
    docKinds: new Set((rec?.docs ?? []).map((d) => d.document_kind)),
  };

  const closed = wf?.status === "closed_declined";
  const groups: GroupView[] = WORKFLOW_GROUPS.map((g) => {
    const positions = g.stages.map(posOf);
    const isCurrent = !!wf && g.stages.includes(wf.current_stage as any);
    let state: GroupState;
    let waitingFor: string | undefined;
    if (closed) state = Math.max(...positions) <= 7 ? "completed" : "not_applicable";
    else if (isCurrent) {
      const waiting = openTasks.find((t) => t.workflow_stage === wf!.current_stage && t.owner_role && t.owner_role !== "wealth_manager");
      if (wf!.status === "blocked") state = "blocked";
      else if (waiting) { state = "waiting"; waitingFor = waiting.owner_role; }
      else if (wf!.current_stage === "client_decision") { state = "waiting"; waitingFor = "client"; }
      else if (wf!.current_stage === "underwriting") { state = "waiting"; waitingFor = "provider"; }
      else state = "current";
    } else if (wf && Math.max(...positions) < stagePos) state = "completed";
    else state = "pending";

    let nextMarked = false;
    const steps = g.steps.map((s) => {
      const r = s.done ? s.done(ctx) : undefined;
      let st: StepState = r === true || (state === "completed" && r !== false) ? "done" : s.done ? "pending" : "unconnected";
      if (st !== "done" && !nextMarked && (state === "current" || state === "blocked" || state === "waiting")) {
        st = "next"; nextMarked = true;
      }
      return { label: s.label, owner: s.owner, state: st };
    });
    return { group: g, state, waitingFor, steps };
  });

  return { workflow: wf, loading: wfQ.isLoading, defs, recs, records: rec, openTasks, groups, stagePos };
}
