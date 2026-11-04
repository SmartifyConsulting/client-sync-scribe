export type QuoteSource = "companion" | "email" | "planning";

export const PLANNING_WARNING = "Planning estimates are not the insurer’s or underwriter’s calculations. They cannot be relied upon definitively and must be confirmed against an official insurer quote before advice, application or policy inception.";

export function planningPremiumKey(insurer: string) {
  return `planning:${insurer}:monthly_premium`;
}

export function mayUseForAdvice(quote: { method?: string | null }) {
  return quote.method !== "assisted" && quote.method !== "planning";
}

export function canStartPortal(source: QuoteSource) {
  return source === "companion";
}