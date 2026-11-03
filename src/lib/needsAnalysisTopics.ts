import type { SectionKey } from "@/features/clients/components/financial/FinancialInformation";

/** Keywords used to guess which Needs Analysis topic is being discussed from
 *  a live speech-to-text transcript. Deliberately loose (substring match on
 *  common words a broker or client would actually say) — this is a prompt
 *  for the broker, not a source of truth, so false positives are fine and
 *  a missed topic just means it stays unticked until mentioned more plainly. */
export const TOPIC_KEYWORDS: Record<SectionKey | "general_notes", string[]> = {
  cash_flow: ["income", "salary", "earn", "gross", "net pay", "take home", "expense", "budget", "spend", "tax bracket"],
  assets_liabilities: ["bond", "mortgage", "property", "house", "asset", "liability", "debt", "loan", "owe", "credit card", "vehicle finance", "car finance", "savings account"],
  risk_portfolio: ["life cover", "life insurance", "disability", "income protection", "severe illness", "critical illness", "funeral cover", "existing policy", "existing policies"],
  car_insurance: ["car insurance", "vehicle insurance", "short term insurance", "short-term insurance", "comprehensive cover", "insure the car", "insure my car", "previous claim", "claims history"],
  investments: ["retirement annuity", "pension fund", "provident fund", "preservation fund", "tax-free savings", "tax free savings", "unit trust", "endowment", "investment", "invest"],
  goals_risk: ["retire at", "retirement age", "retirement income", "risk profile", "risk tolerance", "financial goal", "goals", "save for", "saving for"],
  estate: ["will", "executor", "estate plan", "trust", "beneficiary", "beneficiaries", "succession"],
  general_notes: [],
};

/** Returns the set of topic keys whose keywords appear in the given text (case-insensitive). */
export function detectMentionedTopics(text: string): Set<SectionKey | "general_notes"> {
  const lower = text.toLowerCase();
  const mentioned = new Set<SectionKey | "general_notes">();
  for (const [key, words] of Object.entries(TOPIC_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) mentioned.add(key as SectionKey);
  }
  return mentioned;
}
