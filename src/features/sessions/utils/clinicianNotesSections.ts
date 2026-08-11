export interface ClinicianNoteSection {
  title: string;
  /** Bullet lines, already de-duplicated. */
  items: string[];
  /** Free prose (used for the working impression). */
  text?: string;
}

const KNOWN_TITLES = [
  "WORKING IMPRESSION",
  "SAFETY CHECKS",
  "DIFFERENTIALS",
  "SUGGESTED CHECKS",
];

const CAUTION_PATTERNS = [
  /decision support only/i,
  /not a diagnosis/i,
  /must be reviewed/i,
  /apply clinical (expertise|judgement|judgment)/i,
  /ai[- ]generated/i,
  /confidential and intended/i,
  /^disclaimer/i,
];

const isCaution = (line: string) => CAUTION_PATTERNS.some((re) => re.test(line));

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "or", "and", "to", "in", "for", "with", "her", "his", "their",
  "patient", "patients", "rule", "out", "has", "have", "is", "are", "was", "were", "that",
]);

/**
 * Normalised comparison key that ignores filler words and word order so
 * near-duplicate lines ("Trismus (difficulty opening the mouth)" vs
 * "Trismus (difficulty opening mouth)") collapse into one bullet.
 */
const fuzzyKey = (line: string) =>
  line
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w))
    .sort()
    .join(" ");


const titleCase = (raw: string) =>
  raw
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/**
 * Parses AI Clinician notes into de-duplicated sections (Working Impression,
 * Safety Checks, Differentials, Suggested Checks) and strips the repeated
 * boilerplate cautions/disclaimers the model tends to append to every update.
 */
export function parseClinicianNotes(notes?: string | null): ClinicianNoteSection[] {
  if (!notes || !notes.trim()) return [];

  const lines = notes.split("\n");
  const sections: ClinicianNoteSection[] = [];
  let current: ClinicianNoteSection | null = null;
  const seen = new Set<string>();

  const pushLine = (line: string) => {
    const clean = line
      .replace(/^[•\-*\u2022]\s*/, "")
      // Severity markers are conveyed by colour in the UI, not by a repeated word.
      // They can appear anywhere: bracketed, bolded, parenthesised, or mid-sentence.
      .replace(/[\[(]\s*(?:caution|note|critical|warning|important)\s*[\])]\s*[:\-–]?\s*/gi, "")
      .replace(/\*{1,2}\s*(?:caution|note|critical|warning|important)\s*\*{1,2}\s*[:\-–]?\s*/gi, "")
      .replace(/(^|[.;:—–-]\s*)(?:caution|note|warning|important)\s*[:\-–]\s*/gi, "$1")
      .replace(/\b(?:caution|note)\s*[:\-–]\s*/gi, "")
      .replace(/^(?:caution|note|warning|important)\b[\s:,\-–]*/i, "")
      .replace(/\s*[—–-]?\s*\((?:caution|note)\)\s*/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s:,\-–]+/, "")
      .trim();
    if (!clean || isCaution(clean)) return;


    const key = fuzzyKey(clean);
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (!current) {
      current = { title: "Clinical Notes", items: [] };
      sections.push(current);
    }
    current.items.push(clean);
  };


  for (const raw of lines) {
    // Headings often arrive as "**Safety Checks:**" or "## Differentials".
    const line = raw.trim().replace(/^#{1,6}\s*/, "").replace(/^\*{1,2}\s*|\s*\*{1,2}$/g, "").trim();
    if (!line) continue;
    const upper = line.replace(/[:\s]+$/, "").toUpperCase();
    if (KNOWN_TITLES.includes(upper) || (/^[A-Z0-9 &/()-]{4,40}$/.test(line) && !line.includes("."))) {
      current = { title: titleCase(upper), items: [] };
      sections.push(current);
      continue;
    }
    pushLine(line);
  }


  // Working impression reads better as prose than as a bullet.
  return sections
    .filter((s) => s.items.length > 0)
    .map((s) =>
      s.title.toLowerCase() === "working impression"
        ? { ...s, text: s.items.join(" "), items: [] }
        : s,
    );
}

/** Flattens parsed sections back into clean text (for prescriptions / emails). */
export function cleanClinicianNotes(notes?: string | null): string {
  return parseClinicianNotes(notes)
    .map((s) => `${s.title}\n${s.text ? s.text : s.items.map((i) => `• ${i}`).join("\n")}`)
    .join("\n\n");
}
