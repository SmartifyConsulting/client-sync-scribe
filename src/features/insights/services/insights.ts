/**
 * Insights service — typed facade over existing AI edge functions.
 *
 * Phase 1: stub only. Phase 6 will wire each kind to its edge function via
 * `services/edge/` and add structured-output schemas.
 */

export type InsightKind =
  | "summarize-session"
  | "analyze-medical-image"
  | "ai-clinician-diagnosis"
  | "check-medication-conflicts"
  | "lookup-medical-codes"
  | "summarize-patient-history";

export interface InsightResult<T = unknown> {
  data: T | null;
  error: string | null;
}

/**
 * Future entry point for any AI insight call. Today this is intentionally a
 * no-op so callers can be wired up without changing behaviour. In Phase 6 it
 * will route to the matching edge-function caller in `services/edge/`.
 */
export async function runInsight<T = unknown>(
  _kind: InsightKind,
  _payload: Record<string, unknown>,
): Promise<InsightResult<T>> {
  return { data: null, error: "not-implemented" };
}
