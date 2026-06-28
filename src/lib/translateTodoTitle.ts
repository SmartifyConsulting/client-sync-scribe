import i18n from "@/i18n";

// Stored todo titles are English templates emitted by hooks/edge functions, e.g.:
//   "Review Prescription - Sharon Kennedy"
//   "Review Invoice - Faith Akeno"
//   "Review Letter of Recommendation - John Doe"
//   "Send a letter of recommendation for Sharon Kennedy"
//   "Schedule appointment with Sarah Johnson on 2026-06-08 (30 min)"
// We translate the verb + document noun while leaving subjects verbatim.

const verbMap: Array<{ pattern: RegExp; verbKey: string; nounKey: string; rebuild: (subj: string, t: (k: string) => string) => string }> = [
  {
    pattern: /^Review\s+Prescription\s*[-—]\s*(.+)$/i,
    verbKey: "todo.verbs.review",
    nounKey: "todo.nouns.prescription",
    rebuild: (s, t) => `${t("todo.verbs.review")} ${t("todo.nouns.prescription")} — ${s}`,
  },
  {
    pattern: /^Review\s+Invoice\s*[-—]\s*(.+)$/i,
    verbKey: "todo.verbs.review",
    nounKey: "todo.nouns.invoice",
    rebuild: (s, t) => `${t("todo.verbs.review")} ${t("todo.nouns.invoice")} — ${s}`,
  },
  {
    pattern: /^Review\s+(?:Letter|Letter of Recommendation|Recommendation Letter)\s*[-—]\s*(.+)$/i,
    verbKey: "todo.verbs.review",
    nounKey: "todo.nouns.letter",
    rebuild: (s, t) => `${t("todo.verbs.review")} ${t("todo.nouns.letter")} — ${s}`,
  },
  {
    pattern: /^Review\s+(?:Medical Certificate|Certificate)\s*[-—]\s*(.+)$/i,
    verbKey: "todo.verbs.review",
    nounKey: "todo.nouns.certificate",
    rebuild: (s, t) => `${t("todo.verbs.review")} ${t("todo.nouns.certificate")} — ${s}`,
  },
  {
    pattern: /^Review\s+(?:Referral|Referral Letter)\s*[-—]\s*(.+)$/i,
    verbKey: "todo.verbs.review",
    nounKey: "todo.nouns.referral",
    rebuild: (s, t) => `${t("todo.verbs.review")} ${t("todo.nouns.referral")} — ${s}`,
  },
  {
    pattern: /^Review\s+(?:Hospital Admission|Admission)\s*[-—]\s*(.+)$/i,
    verbKey: "todo.verbs.review",
    nounKey: "todo.nouns.admission",
    rebuild: (s, t) => `${t("todo.verbs.review")} ${t("todo.nouns.admission")} — ${s}`,
  },
  {
    pattern: /^Send\s+a?\s*letter of recommendation for\s+(.+?)(?:\s*\(.*\))?$/i,
    verbKey: "todo.verbs.send",
    nounKey: "todo.nouns.letter",
    rebuild: (s, t) => `${t("todo.verbs.send")} ${t("todo.nouns.letter")} — ${s}`,
  },
  {
    pattern: /^Schedule\s+appointment\s+(?:with|for)\s+(.+)$/i,
    verbKey: "todo.verbs.schedule",
    nounKey: "todo.nouns.appointment",
    rebuild: (s, t) => `${t("todo.verbs.schedule")} ${t("todo.nouns.appointment")} — ${s}`,
  },
];

export function translateTodoTitle(title: string | null | undefined): string {
  if (!title) return "";
  const t = (k: string) => i18n.t(k);
  for (const entry of verbMap) {
    const m = title.match(entry.pattern);
    if (m) return entry.rebuild(m[1].trim(), t);
  }
  return title;
}
