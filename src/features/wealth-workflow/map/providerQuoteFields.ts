import { PRODUCT_TYPES, type FieldDef } from "./quoteSpec";
import { insurerFields, insurerKey } from "./insurerDictionary";

export const isOmpLife = (insurer: string, product: string) => insurer === "Old Mutual" && product === "Life cover";
export const isOmpProduct = (insurer: string, product: string) => insurer === "Old Mutual" && ["Life cover", "Severe illness", "Income protection"].includes(product);

export function providerFieldApplies(field: FieldDef, option: Record<string, any>) {
  if (field.key === "Old Mutual:omp_inflation") return option["Old Mutual:omp_cover"] === "Inflation-linked";
  if (field.key === "Old Mutual:omp_currency") return option["Old Mutual:omp_cover"] === "Currency-linked";
  return true;
}

// Verified in the OM Adviser OMP Life quote screen. No inferred Greenlight mappings.
export function providerQuoteFields(insurer: string, product: string): FieldDef[] {
  if (isOmpProduct(insurer, product)) {
    const life = product === "Life cover", income = product === "Income protection";
    const select = (key: string, label: string, options: string[]): FieldDef => ({ key: insurerKey(insurer, key), label, kind: "select", options });
    return [
      { key: income ? "monthly_benefit" : "benefit_amount", label: income ? "Monthly benefit" : "Benefit amount", kind: "amount" },
      select("omp_product", "Old Mutual product", [life ? "OMP Life" : income ? "OMP Disability Income" : "OMP Severe Illness"]),
      ...(income ? [select("omp_waiting", "Waiting period", ["7 days", "1 month", "3 months", "6 months", "12 months", "24 months"])] : []),
      select("omp_premium", "Compulsory yearly premium increase", ["0% Annual Increase", "5% Annual Increase", "Increase with Age"]),
      select("omp_cover", "Scheduled yearly cover increase", income ? ["0% fixed rate", "5% fixed rate", "Inflation-linked"] : ["0% fixed rate", "5% fixed rate", "10% fixed rate", "Inflation-linked", "Currency-linked"]),
      select("omp_inflation", "Inflation-linked adjustment (only if selected above)", ["Inflation -2%", "Inflation -1%", "Inflation +0%", "Inflation +1%", "Inflation +2%", "Inflation +3%"]),
      ...(!income ? [select("omp_currency", "Currency-linked adjustment", ["Rand/US Dollar +0%", "Rand/US Dollar +5%", "Rand/US Dollar +10%", "Rand/US Dollar + US Inflation", "Rand/Euro +0%", "Rand/Euro +5%", "Rand/Euro +10%", "Rand/Euro + Euro Inflation", "Rand/GB Pound +0%", "Rand/GB Pound +5%", "Rand/GB Pound +10%", "Rand/GB Pound + UK Inflation"])] : []),
      select("omp_underwriting", "Underwriting method", life || income ? ["No medical tests - only questions", "Medical tests, questions or both"] : ["Medical tests, questions or both"]),
      select("omp_guarantee", "Guarantee term", life ? ["5 years", "10 years", "15 years"] : income ? ["1 year", "5 years"] : ["5 years", "10 years"]),
      select("omp_term", "Premium term", income ? ["Benefit term"] : ["Retirement", "Benefit term"]),
      select("omp_cashback", "Cashback", life ? ["Included"] : ["Excluded", "Included"]),
      ...((life ? [] : income ? ["Income Extender Benefit", "Sickness Benefit", "Family Support Benefit"] : ["For Women Benefit", "Child Illness Benefit", "Top-up Benefit", "Returning Illness Benefit", "Mild Illness Benefit"]).map(label => ({ key: insurerKey(insurer, `omp_addon_${label}`), label, kind: "toggle" as const }))),
    ];
  }
  return [...(PRODUCT_TYPES[product] || []), ...insurerFields(insurer, product).map(f => ({ ...f, key: insurerKey(insurer, f.key) }))];
}

export function ompSettingsComplete(insurer: string, product: string, option: Record<string, any>) {
  if (!isOmpProduct(insurer, product)) return true;
  return providerQuoteFields(insurer, product).every(f => {
    if (!providerFieldApplies(f, option)) return true;
    return f.kind === "toggle" || (f.kind === "select" ? f.options.includes(option[f.key]) : Number(option[f.key]) > 0);
  });
}
