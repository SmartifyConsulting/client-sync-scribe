import { insurerKey } from "./insurerDictionary";
import { isOmpProduct, hasVerifiedProviderFields, providerQuoteFields, providerFieldApplies } from "./providerQuoteFields";

/** Only the selected insurer's effective quote settings identify a reference.
 * Other insurers' edits and the reference metadata itself do not invalidate it. */
export function quoteSettingsKey(product: string, option: Record<string, any>, insurer: string) {
  const omp = isOmpProduct(insurer, product);
  const fields = providerQuoteFields(insurer, product).filter(f => providerFieldApplies(f, option));
  return JSON.stringify([...fields.map(f => [f.key, f.key === "growth" && option.increase_option === "No increase" ? "" :
    String(option[f.key] ?? (hasVerifiedProviderFields(insurer, product) ? "" : f.kind === "select" ? f.options[0] : f.kind === "toggle" ? false : ""))]),
    ...(omp && option._ompInputs ? [["rating",Object.entries(option._ompInputs).sort(([a],[b])=>a.localeCompare(b))]] : [])]);
}

export function quoteReference(product: string, option: Record<string, any>, insurer: string): string {
  const saved = option._quoteReferences?.[insurer];
  return typeof saved?.number === "string" && saved.settings === quoteSettingsKey(product, option, insurer) ? saved.number : "";
}

export function withQuoteReference(product: string, option: Record<string, any>, insurer: string, number: string): Record<string, any> {
  const references = { ...option._quoteReferences };
  const value = number.trim().slice(0, 80);
  if (value) references[insurer] = { number: value, settings: quoteSettingsKey(product, option, insurer) };
  else delete references[insurer];
  return { ...option, _quoteReferences: references };
}

/** A calculated result is not a filed PDF and must never complete the workflow. */
export function quoteResult(product: string, option: Record<string, any>, insurer: string) {
  const result = option._quoteResults?.[insurer];
  if (!result || result.settings !== quoteSettingsKey(product, option, insurer) ||
      typeof result.number !== "string" || !result.number.trim() ||
      typeof result.monthlyPremium !== "number" || !Number.isFinite(result.monthlyPremium) || result.monthlyPremium <= 0 ||
      !["portal-verified", "companion-verified"].includes(result.source)) return null;
  return result as { number: string; monthlyPremium: number; cashbackPremium?: number; source: string; verifiedAt: string };
}
