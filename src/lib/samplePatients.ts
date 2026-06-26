/**
 * Helper to detect whether a patient record is sample/demo data.
 * A patient is "sample" if any of:
 *  - `is_sample === true` on the row (new column)
 *  - name matches a known seeded demo name
 *  - metadata.source === 'seed'
 */

const SAMPLE_NAME_HINTS = [
  "sample",
  "demo",
  "test patient",
  // Known seeded test names — keep lowercase
  "sharon kennedy",
  "john sample",
  "jane sample",
];

export interface SamplePatientLike {
  name?: string | null;
  is_sample?: boolean | null;
  metadata?: { source?: string | null } | null;
}

export function isSamplePatient(patient: SamplePatientLike | null | undefined): boolean {
  if (!patient) return false;
  if (patient.is_sample === true) return true;
  if (patient.metadata?.source === "seed") return true;
  const name = (patient.name || "").trim().toLowerCase();
  if (!name) return false;
  return SAMPLE_NAME_HINTS.some((hint) => name.includes(hint));
}
