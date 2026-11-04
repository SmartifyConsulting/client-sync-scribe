import { insurerFields, insurerKey } from "./insurerDictionary";
import { PRODUCT_TYPES } from "./quoteSpec";

/** Only the selected insurer's effective quote settings identify a reference.
 * Other insurers' edits and the reference metadata itself do not invalidate it. */
export function quoteSettingsKey(product: string, option: Record<string, any>, insurer: string) {
  const fields = [...(PRODUCT_TYPES[product] ?? []), ...insurerFields(insurer, product).map(f => ({ ...f, key: insurerKey(insurer, f.key) }))];
  return JSON.stringify(fields.map(f => [f.key, f.key === "growth" && option.increase_option === "No increase" ? "" :
    String(option[f.key] ?? (f.kind === "select" ? f.options[0] : f.kind === "toggle" ? false : ""))]));
}

export function quoteReference(product: string, option: Record<string, any>, insurer: string): string {
  const saved = option._quoteReferences?.[insurer];
  return typeof saved?.number === "string" && saved.settings === quoteSettingsKey(product, option, insurer) ? saved.number : "";
}

export function withQuoteReference(product: string, option: Record<string, any>, insurer: string, number: string) {
  const references = { ...option._quoteReferences };
  const value = number.trim().slice(0, 80);
  if (value) references[insurer] = { number: value, settings: quoteSettingsKey(product, option, insurer) };
  else delete references[insurer];
  return { ...option, _quoteReferences: references };
}
