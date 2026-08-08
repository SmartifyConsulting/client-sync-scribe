/**
 * Shared task-owner classification for edge functions.
 * Mirrors src/lib/taskAssignee.ts — keep both in sync.
 */
export type TaskAssignee = "doctor" | "patient";
export type TaskClassification = TaskAssignee | "skip";

const MEDICATION_PATTERNS: RegExp[] = [
  /\bprescrib/i,
  /\bprescription\b/i,
  /\bmedication\b/i,
  /\bmeds\b/i,
  /\bdosage\b/i,
  /\btake\s+\d/i,
  /\b\d+\s?mg\b/i,
  /\btablet(s)?\b/i,
  /\bcapsule(s)?\b/i,
  /\bmouthwash\b/i,
  /\bointment\b/i,
  /\bcream\b/i,
  /\b(twice|three times|once)\s+a\s+day\b/i,
  /\bmorning and night\b/i,
];

const PATIENT_PATTERNS: RegExp[] = [
  /\bexercis/i,
  /\bstretch/i,
  /\bphysio/i,
  /\bdiet\b/i,
  /\bnutrition/i,
  /\bgluten\b/i,
  /\bnightshade/i,
  /\bsleep\b/i,
  /\bhydrat/i,
  /\bwater intake\b/i,
  /\bwalk(ing)?\b/i,
  /\brest\b/i,
  /\bheat pack/i,
  /\bice pack/i,
  /\bhome care\b/i,
  /\blifestyle\b/i,
  /\bbreathing\b/i,
  /\bmeditat/i,
  /\bsmoking\b/i,
  /\balcohol\b/i,
  /\bweight\b/i,
  /\bjournal\b/i,
];

export function classifyTask(title: string, taskType?: string | null): TaskClassification {
  if (taskType === "document_review") return "doctor";
  const text = title || "";
  if (MEDICATION_PATTERNS.some((re) => re.test(text))) return "skip";
  if (PATIENT_PATTERNS.some((re) => re.test(text))) return "patient";
  return "doctor";
}
