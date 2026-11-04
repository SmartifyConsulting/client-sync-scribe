import { PRODUCT_TYPES, type FieldDef } from "./quoteSpec";
import { insurerFields, insurerKey } from "./insurerDictionary";

export const isOmpLife = (insurer: string, product: string) => insurer === "Old Mutual" && product === "Life cover";

// Verified in the OM Adviser OMP Life quote screen. No inferred Greenlight mappings.
export function providerQuoteFields(insurer: string, product: string): FieldDef[] {
  if (isOmpLife(insurer, product)) {
    const select = (key: string, label: string, options: string[]): FieldDef => ({ key: insurerKey(insurer, key), label, kind: "select", options });
    return [
      { key: "benefit_amount", label: "Benefit amount", kind: "amount" },
      select("omp_product", "Old Mutual product", ["OMP Life"]),
      select("omp_premium", "Compulsory yearly premium increase", ["0% Annual Increase", "5% Annual Increase", "Increase with Age"]),
      select("omp_cover", "Scheduled yearly cover increase", ["0% fixed rate", "5% fixed rate", "10% fixed rate", "Inflation-linked"]),
      select("omp_inflation", "Inflation-linked adjustment (only if selected above)", ["Inflation -2%", "Inflation -1%", "Inflation +0%", "Inflation +1%", "Inflation +2%", "Inflation +3%"]),
      select("omp_underwriting", "Underwriting method", ["No medical tests - only questions", "Medical tests, questions or both"]),
      select("omp_guarantee", "Guarantee term", ["5 years", "10 years", "15 years"]),
      select("omp_term", "Premium term", ["Retirement", "Benefit term"]),
    ];
  }
  return [...(PRODUCT_TYPES[product] || []), ...insurerFields(insurer, product).map(f => ({ ...f, key: insurerKey(insurer, f.key) }))];
}

export function ompSettingsComplete(insurer: string, product: string, option: Record<string, any>) {
  if (!isOmpLife(insurer, product)) return true;
  return providerQuoteFields(insurer, product).every(f => {
    if (f.key.endsWith(":omp_inflation") && option[insurerKey(insurer, "omp_cover")] !== "Inflation-linked") return true;
    return f.kind === "select" ? f.options.includes(option[f.key]) : Number(option[f.key]) > 0;
  });
}
