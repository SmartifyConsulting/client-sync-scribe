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
