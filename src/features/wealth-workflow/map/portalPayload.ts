import { providerQuoteFields, isOmpLife } from "./providerQuoteFields";
import { PRODUCT_TYPES } from "./quoteSpec";
import { insurerFields, insurerKey } from "./insurerDictionary";

type PortalField = { label: string; value: string; kind: string; product?: string; aliases?: string[] };
const ALIASES: Record<string, string[]> = {
  benefit_amount: ["Cover amount", "Life cover amount"],
  monthly_benefit: ["Monthly benefit amount", "Income benefit amount"],
  growth: ["Benefit increase", "Yearly base increase", "Cover increase percentage"],
  premium_pattern: ["Premium pattern"],
  premium_guarantee: ["Guarantee option"],
};

/** Client values go directly to the local Companion; never store them in job progress. */
export function clientPortalFields(client: Record<string, unknown> | null | undefined): PortalField[] {
  if (!client) return [];
  const definitions: [string, string, string[]][] = [
    ["title", "Title", []], ["first_name", "First name", ["First Name", "Name"]],
    ["last_name", "Surname", ["Last name"]], ["id_passport_number", "ID number", ["Identification number", "Legal reference"]],
    ["email", "Email", ["Email address"]], ["dob", "Date of birth", []],
    ["smoker", "Smoking status", ["Smoker"]], ["highest_education", "Education", ["Highest education"]],
    ["occupation", "Occupation", []], ["marital_status", "Marital status", []],
  ];
  return definitions.flatMap(([key, label, aliases]) => {
    const value = client[key];
    return typeof value === "string" && value.trim() ? [{ label, aliases, value: value.trim(), kind: "text" }] : [];
  });
}

export function buildPortalScenarios(plan: Record<string, Record<string, unknown>[]>, insurer: string, client?: Record<string, unknown> | null) {
  const products = Object.keys(plan);
  const count = Math.max(0, ...products.map((p) => plan[p].length));
  return Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    fields: [...clientPortalFields(client), ...products.flatMap((product) => {
      const option = plan[product][i];
      if (!option) return [];
      const fields = providerQuoteFields(insurer, product);
      return fields.flatMap((f): PortalField[] => {
        if (f.key === "growth" && option.increase_option === "No increase") return [];
        if (f.key.endsWith(":omp_inflation") && option[insurerKey(insurer, "omp_cover")] !== "Inflation-linked") return [];
        const value = option[f.key] ?? (isOmpLife(insurer, product) ? "" : f.kind === "select" ? f.options[0] : f.kind === "toggle" ? false : "");
        return value === "" ? [] : [{ product, label: f.label, aliases: ALIASES[f.key] || [], kind: f.kind, value: String(value) }];
      });
    })],
  }));
}

