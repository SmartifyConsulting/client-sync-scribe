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
      const [apps, comp, tasks, docs, kyc, signed, pat, holdings, fin, sessions, appts, quotes] = await Promise.all([
        db.from("wealth_applications").select("*").eq("workflow_id", workflowId).order("created_at", { ascending: false }),
        db.from("wealth_compliance_checks").select("*").eq("workflow_id", workflowId).maybeSingle(),
        db.from("todos").select("id,title,status,due_date,owner_role,workflow_stage,priority")
          .eq("workflow_id", workflowId).order("due_date", { ascending: true }),
        db.from("documents").select("id,name,document_kind,created_at").eq("patient_id", patientId).not("document_kind", "is", null),
        db.from("wealth_kyc_checks").select("*").eq("workflow_id", workflowId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("wealth_signed_documents").select("*").eq("workflow_id", workflowId).order("signed_at"),
        db.from("patients").select("user_id,patient_user_id,name,id_passport_number,dob,physical_address,address,postal_address,marital_status,marital_regime,phone,email").eq("id", patientId).maybeSingle(),
        db.from("wealth_portfolio_holdings").select("*").eq("patient_id", patientId).order("provider"),
        db.from("client_financial_profiles").select("extracted_at,verified_at,extracted_from_session_id").eq("patient_id", patientId).maybeSingle(),
        db.from("sessions").select("id,title,created_at,transcript,notes,summary").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(10),
        db.from("appointments").select("id,title,start_time").eq("patient_id", patientId).order("start_time", { ascending: false }).limit(5),
        db.from("wealth_quotes").select("*").eq("workflow_id", workflowId).order("rank", { ascending: true, nullsFirst: false }),
      ]);
      const p = pat.data;
      return {
        apps: (apps.data ?? []) as any[],
        compliance: comp.data ?? null,
        tasks: (tasks.data ?? []) as any[],
        docs: (docs.data ?? []) as any[],
        kyc: kyc.data ?? null,
        signed: (signed.data ?? []) as any[],
        clientLinked: !!p?.patient_user_id,
        patientId,
        personal: p ?? null,
        personalDone: !!(p?.id_passport_number && p?.dob && (p?.physical_address || p?.address) && p?.marital_status),
        holdings: (holdings.data ?? []) as any[],
        financials: fin.data ?? null,
        quotes: (quotes.data ?? []) as any[],
        appointments: (appts.data ?? []) as any[],
        sessions: ((sessions.data ?? []) as any[]).map((s) => ({ id: s.id, title: s.title, created_at: s.created_at, hasText: !!(s.transcript || s.notes || s.summary) })),
      };
    },
  });
}

export function useWorkflowMap(patientId?: string, viewer: "manager" | "client" = "manager") {
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
    clientLinked: !!rec?.clientLinked,
    kycStatus: rec?.kyc?.status ?? null,
    signedDocs: new Set((rec?.signed ?? []).map((d: any) => d.doc_type)),
    holdingsCount: rec?.holdings?.length ?? 0,
    personalDone: !!rec?.personalDone,
    financialsExtracted: !!rec?.financials?.extracted_at,
    financialsVerified: !!rec?.financials?.verified_at,
    quotesCount: rec?.quotes?.length ?? 0,
    selectedQuotes: (rec?.quotes ?? []).filter((q: any) => q.selected).length,
    meetingScheduled: (rec?.appointments?.length ?? 0) > 0 || (rec?.sessions ?? []).some((x: any) => x.hasText),
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
    const source = viewer === "client" && g.clientSteps ? g.clientSteps : g.steps;
    const steps = source.map((s) => {
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
