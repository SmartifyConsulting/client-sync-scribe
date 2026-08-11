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


/**
 * Items the AI emits that are not real tasks:
 *  - unresolved-patient placeholders ("Unknown Patient", "Patient not specified", …)
 *  - scheduling instructions (handled by the Schedule step of the post-session queue)
 *  - "issue/generate <document>" duplicates of documents already produced this session
 */
const NON_ACTIONABLE_PATTERNS: RegExp[] = [
  /unknown patient/i,
  /patient not specified/i,
  /not found in (the )?list/i,
  /no matching patient/i,
  /\(patient .*not (found|specified|listed)\)/i,
  /\bschedule\b.*\bappointment\b/i,
  /\bbook\b.*\bappointment\b/i,
  /\bfollow[- ]up appointment\b/i,
  /\b(issue|generate|create|prepare|draft)\b.*\b(medical certificate|sick note|prescription|referral( letter)?|invoice)\b/i,
];

export function isNonActionableTask(title: string): boolean {
  const text = (title || "").trim();
  if (!text) return true;
  return NON_ACTIONABLE_PATTERNS.some((re) => re.test(text));
}

/** Trims verbose AI narration down to its first actionable sentence. */
export function sanitizeTaskTitle(title: string): string {
  const text = (title || "").replace(/\s+/g, " ").trim();
  if (text.length <= 120) return text;
  const first = text.split(/(?<=[.!?])\s+/)[0] || text;
  return (first.length <= 160 ? first : `${first.slice(0, 157)}…`).trim();
}

export function classifyTask(title: string, taskType?: string | null): TaskClassification {
  if (taskType === "document_review") return "doctor";
  const text = title || "";
  if (isNonActionableTask(text)) return "skip";
  if (MEDICATION_PATTERNS.some((re) => re.test(text))) return "skip";
  if (PATIENT_PATTERNS.some((re) => re.test(text))) return "patient";
  return "doctor";
}
