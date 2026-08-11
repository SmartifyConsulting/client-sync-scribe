/**
 * Helper to detect whether a patient/doctor record is demo data.
 *
 * MVP goes live 2026-08-18 — everything created before that date is demo
 * data captured while building/testing the app, not a real person. Records
 * created on/after launch are real, regardless of name. This date cutoff is
 * the primary signal; the older name/email heuristics remain as a fallback
 * for records whose `created_at` isn't available to the caller.
 */

export const DEMO_DATA_CUTOFF = "2026-08-18T00:00:00Z";

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
  created_at?: string | null;
}

export function isSamplePatient(patient: SamplePatientLike | null | undefined): boolean {
  if (!patient) return false;
  if (patient.created_at && patient.created_at < DEMO_DATA_CUTOFF) return true;
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
 * Pass `createdAt` when available so the date cutoff applies here too;
 * otherwise falls back to explicit sample/demo/test naming.
 */
export function isSampleName(name: string | null | undefined, createdAt?: string | null): boolean {
  if (createdAt && createdAt < DEMO_DATA_CUTOFF) return true;
  const n = (name || "").trim().toLowerCase();
  if (!n) return false;
  return /\b(sample|demo|dummy|test)\b/.test(n);
}
