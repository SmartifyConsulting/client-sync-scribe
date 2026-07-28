/**
 * Helper to detect whether a patient record is sample/demo data.
 * A patient is "sample" if either:
 *  - `is_sample === true` on the row (authoritative — set on seeded records)
 *  - the name matches a known seeded demo name (fallback for older rows)
 */

const SAMPLE_NAME_HINTS = [
  "sample",
  "demo",
  "test patient",
  // Known seeded demo names — keep lowercase
  "sharon kennedy",
  "john sample",
  "jane sample",
  "john smith",
];

export interface SamplePatientLike {
  name?: string | null;
  is_sample?: boolean | null;
  email?: string | null;
}

export function isSamplePatient(patient: SamplePatientLike | null | undefined): boolean {
  if (!patient) return false;
  if (patient.is_sample === true) return true;
  // Seeded demo records all use placeholder @email.* addresses.
  const email = (patient.email || "").trim().toLowerCase();
  if (/@email\./.test(email)) return true;
  const name = (patient.name || "").trim().toLowerCase();
  if (!name) return false;
  return SAMPLE_NAME_HINTS.some((hint) => name.includes(hint));
}

/**
 * Generic name-based sample check for records that aren't patients
 * (doctors in the referral directory, demo SOS incidents, demo fleet vehicles).
 * Only matches explicit sample/demo/test naming so real records are never flagged.
 */
export function isSampleName(name: string | null | undefined): boolean {
  const n = (name || "").trim().toLowerCase();
  if (!n) return false;
  return /\b(sample|demo|dummy|test)\b/.test(n);
}
