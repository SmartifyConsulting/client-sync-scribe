import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Colour legend used across AI Clinician notes.
 * red = risk / red flag, amber = caution, teal = medication, slate = investigation.
 */
export const CLINICIAN_LEGEND = [
  { key: "risk", label: "Risk", className: "text-destructive" },
  { key: "caution", label: "Caution", className: "text-amber-600" },
  { key: "med", label: "Medication", className: "text-primary" },
  { key: "check", label: "Investigation", className: "text-slate-600" },
] as const;

const CLASS_BY_KEY: Record<string, string> = Object.fromEntries(
  CLINICIAN_LEGEND.map((l) => [l.key, l.className]),
);

const GROUPS: { key: string; words: string[] }[] = [
  {
    key: "risk",
    words: [
      "red flag", "red flags", "emergency", "urgent", "sepsis", "haemorrhage", "hemorrhage",
      "anaphylaxis", "stroke", "myocardial infarction", "chest pain", "shortness of breath",
      "suicidal", "severe", "critical", "airway", "shock", "unstable", "refer immediately",
      "hospital", "admit", "deterioration", "collapse",
    ],
  },
  {
    key: "caution",
    words: [
      "interaction", "contraindicated", "contraindication", "allergy", "allergic",
      "monitor", "adverse", "side effect", "side effects", "dose adjustment", "renal impairment",
      "hepatic", "pregnancy", "breastfeeding", "elderly", "risk of",
    ],
  },
  {
    key: "med",
    words: [
      "mg", "ml", "tablet", "tablets", "capsule", "capsules", "dose", "dosage", "twice daily",
      "once daily", "three times daily", "bd", "tds", "prn", "antibiotic", "antibiotics",
      "analgesia", "analgesic", "prescribe", "prescription", "course",
    ],
  },
  {
    key: "check",
    words: [
      "bloods", "blood test", "full blood count", "fbc", "u&e", "crp", "esr", "urinalysis",
      "x-ray", "xray", "ultrasound", "ct", "mri", "ecg", "swab", "culture", "screening",
      "examination", "examine", "observations", "vitals", "temperature", "blood pressure",
      "follow-up", "follow up", "score",
    ],
  },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PATTERN = new RegExp(
  `\\b(${GROUPS.flatMap((g) => g.words).map(escape).sort((a, b) => b.length - a.length).join("|")})\\b`,
  "gi",
);

const keyFor = (word: string) => {
  const w = word.toLowerCase();
  return GROUPS.find((g) => g.words.includes(w))?.key ?? "";
};

/** Bolds and colour-codes key clinical terms inside AI Clinician note text. */
export function renderClinicianHighlights(text: string): ReactNode {
  if (!text) return null;
  const parts = text.split(PATTERN);
  return parts.filter((p) => p !== "").map((part, i) => {
    const key = keyFor(part);
    if (key) {
      return (
        <strong key={i} className={cn("font-bold", CLASS_BY_KEY[key])}>
          {part}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Small inline legend shown on the AI Clinician Notes heading row. */
export function ClinicianLegend({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-2 text-[10px] font-medium", className)}>
      {CLINICIAN_LEGEND.map((l) => (
        <span key={l.key} className={cn("flex items-center gap-1", l.className)}>
          <span className="inline-block h-2 w-2 rounded-full bg-current" />
          {l.label}
        </span>
      ))}
    </span>
  );
}
