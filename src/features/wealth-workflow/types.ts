export const WEALTH_STAGES = [
  "consultation", "information_required", "needs_analysis", "research_quotes",
  "recommendation", "client_presentation", "client_decision", "documentation",
  "compliance", "application", "underwriting", "submission", "issued",
  "follow_up", "annual_review",
] as const;

export type WealthStage = (typeof WEALTH_STAGES)[number] | "closed_declined";
export type WorkflowStatus = "active" | "blocked" | "closed_declined" | "completed";
export type ClientDecision = "accepted" | "declined" | "changes_requested";
export type OwnerRole = "client" | "wealth_manager" | "firm" | "key_individual" | "provider" | "operations" | "system";

export interface WealthWorkflow {
  id: string;
  patient_id: string;
  practice_id: string | null;
  owner_user_id: string;
  current_stage: WealthStage;
  status: WorkflowStatus;
  blockers: string[];
  cycle_number: number;
  previous_workflow_id: string | null;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface StageDef {
  stage: WealthStage;
  position: number;
  label: string;
  owner_role: OwnerRole;
  required_info: string[];
  required_documents: string[];
  dependencies: string[];
  next_stages: WealthStage[];
}

export interface WealthRecommendation {
  id: string;
  workflow_id: string;
  version: number;
  title: string | null;
  summary: string | null;
  roa_document_id: string | null;
  status: "draft" | "presented" | "accepted" | "declined" | "changes_requested" | "superseded";
  presented_at: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  supersedes_id: string | null;
  created_at: string;
}

export interface WorkflowTransition {
  id: string;
  workflow_id: string;
  from_stage: WealthStage | null;
  to_stage: WealthStage;
  actor_type: "user" | "system";
  actor_user_id: string | null;
  reason: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
  decision: string | null;
  created_at: string;
}

export interface TransitionResult {
  ok: boolean;
  stage: WealthStage;
  blockers: string[];
}
