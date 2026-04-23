/**
 * Raw-record ingestion stub.
 *
 * Phase 1: not implemented. See README.md.
 */

export type IngestSource = "lab" | "device" | "ehr" | "manual";

export interface IngestResult {
  ok: boolean;
  recordId: string | null;
  error: string | null;
}

export async function ingestRawRecord(_input: {
  source: IngestSource;
  payload: unknown;
  patientId: string;
}): Promise<IngestResult> {
  return { ok: false, recordId: null, error: "not-implemented" };
}
