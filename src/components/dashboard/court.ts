/** Whose court the ball is in for each workflow stage (matches the Live Workspace step owners). */
export type Court = "client" | "advisor" | "insurer";

const STAGE_COURT: Record<string, Court> = {
  consultation: "client",
  information_required: "advisor",
  needs_analysis: "advisor",
  research_quotes: "advisor",
  recommendation: "advisor",
  client_presentation: "advisor",
  client_decision: "client",
  documentation: "client",
  compliance: "client",
  application: "advisor",
  underwriting: "insurer",
  submission: "advisor",
  issued: "insurer",
  follow_up: "client",
  annual_review: "advisor",
};

export const courtFor = (stage: string): Court => STAGE_COURT[stage] ?? "advisor";

import { WORKFLOW_GROUPS } from "@/features/wealth-workflow/map/groups";

/** The task item waiting at this stage: the first step in its group owned by whoever holds the ball. */
export function taskFor(stage: string): string | null {
  const group = WORKFLOW_GROUPS.find((g) => (g.stages as string[]).includes(stage));
  if (!group) return null;
  const court = courtFor(stage);
  return (group.steps.find((s) => s.owner === court) ?? group.steps[0])?.label ?? null;
}
