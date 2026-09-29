import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ClientDecision, StageDef, TransitionResult, WealthRecommendation,
  WealthStage, WealthWorkflow, WorkflowTransition,
} from "./types";

// New tables are not yet in generated types.
const db = supabase as any;

const keys = {
  workflow: (patientId: string) => ["wealth-workflow", patientId] as const,
  defs: ["wealth-stage-defs"] as const,
  recs: (wf: string) => ["wealth-recs", wf] as const,
  audit: (wf: string) => ["wealth-audit", wf] as const,
  blockers: (wf: string, s: string) => ["wealth-blockers", wf, s] as const,
};

export function useStageDefs() {
  return useQuery({
    queryKey: keys.defs,
    staleTime: Infinity,
    queryFn: async (): Promise<StageDef[]> => {
      const { data, error } = await db.from("wealth_workflow_stage_defs").select("*").order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClientWorkflow(patientId?: string) {
  return useQuery({
    queryKey: keys.workflow(patientId ?? ""),
    enabled: !!patientId,
    queryFn: async (): Promise<WealthWorkflow | null> => {
      const { data, error } = await db
        .from("wealth_workflows").select("*").eq("patient_id", patientId)
        .order("cycle_number", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkflowBlockers(workflowId?: string, targetStage?: WealthStage) {
  return useQuery({
    queryKey: keys.blockers(workflowId ?? "", targetStage ?? ""),
    enabled: !!workflowId && !!targetStage,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await db.rpc("wealth_blockers", { _workflow_id: workflowId, _target_stage: targetStage });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecommendationHistory(workflowId?: string) {
  return useQuery({
    queryKey: keys.recs(workflowId ?? ""),
    enabled: !!workflowId,
    queryFn: async (): Promise<WealthRecommendation[]> => {
      const { data, error } = await db.from("wealth_recommendations").select("*")
        .eq("workflow_id", workflowId).order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkflowAudit(workflowId?: string) {
  return useQuery({
    queryKey: keys.audit(workflowId ?? ""),
    enabled: !!workflowId,
    queryFn: async (): Promise<WorkflowTransition[]> => {
      const { data, error } = await db.from("wealth_workflow_transitions").select("*")
        .eq("workflow_id", workflowId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    ["wealth-workflow", "wealth-recs", "wealth-audit", "wealth-blockers"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  };
}

export function useStartWorkflow() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: { patientId: string; sessionId?: string }) => {
      const { data, error } = await db.rpc("wealth_start_workflow", { _patient_id: p.patientId, _session_id: p.sessionId ?? null });
      if (error) throw error;
      return data as string;
    },
    onSuccess: inv,
  });
}

export function useTransition() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: { workflowId: string; toStage: WealthStage; reason?: string }): Promise<TransitionResult> => {
      const { data, error } = await db.rpc("wealth_transition", { _workflow_id: p.workflowId, _to_stage: p.toStage, _reason: p.reason ?? null });
      if (error) throw error;
      return data;
    },
    onSuccess: inv,
  });
}

export function usePresentRecommendation() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await db.rpc("wealth_present_recommendation", { _recommendation_id: recommendationId });
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useRecordDecision() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: { recommendationId: string; decision: ClientDecision; reason?: string }) => {
      const { data, error } = await db.rpc("wealth_record_decision", {
        _recommendation_id: p.recommendationId, _decision: p.decision, _reason: p.reason ?? null,
      });
      if (error) throw error;
      return data as { ok: boolean; new_recommendation_id: string | null };
    },
    onSuccess: inv,
  });
}

export function useStartAnnualReview() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: { workflowId: string; appointmentId?: string; sessionId?: string }) => {
      const { data, error } = await db.rpc("wealth_start_annual_review", {
        _workflow_id: p.workflowId, _appointment_id: p.appointmentId ?? null, _session_id: p.sessionId ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: inv,
  });
}
