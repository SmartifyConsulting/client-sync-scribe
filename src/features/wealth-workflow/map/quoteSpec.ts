/** Quote variables per insurance type. Fields follow the Momentum "Benefit details" screen;
 *  other insurers are mapped to these same fields one by one. */
export type FieldDef =
  | { key: string; label: string; kind: "amount" | "percent" | "number" }
  | { key: string; label: string; kind: "select"; options: string[] }
  | { key: string; label: string; kind: "toggle" };

export const PREMIUM_PATTERNS = ["Stable", "Inflationary Increase", "Aggressive Increase"];
const GUARANTEE = ["Standard", "Guarantee term extender"];
const INCREASE = ["Cover increase: fixed percentage", "Cover increase: CPI rate", "No increase"];

export const COVER_OPTIONS = ["Desired Cover", "Current Cover", "Agreed Cover"];
export const QUOTES_PER_COVER = PREMIUM_PATTERNS.length;
export const coverOptionLabel = (index: number) => COVER_OPTIONS[index] ?? `Option ${index + 1}`;

const LUMP_SUM: FieldDef[] = [
  { key: "benefit_amount", label: "Benefit amount", kind: "amount" },
  { key: "premium_pattern", label: "Premium pattern", kind: "select", options: PREMIUM_PATTERNS },
  { key: "premium_guarantee", label: "Premium guarantee option", kind: "select", options: GUARANTEE },
  { key: "increase_option", label: "Increase option", kind: "select", options: INCREASE },
  { key: "growth", label: "Cover growth", kind: "percent" },
];

export const PRODUCT_TYPES: Record<string, FieldDef[]> = {
  "Life cover": LUMP_SUM,
  "Lump sum disability": [...LUMP_SUM, { key: "occupation_class", label: "Occupation class", kind: "select", options: ["1", "2", "3", "4"] }],
  "Severe illness": [...LUMP_SUM, { key: "accelerated", label: "Accelerated (reduces life cover)", kind: "toggle" }],
  "Income protection": [
    { key: "monthly_benefit", label: "Monthly benefit", kind: "amount" },
    { key: "waiting_period", label: "Waiting period", kind: "select", options: ["7 days", "14 days", "1 month", "3 months", "6 months"] },
    { key: "benefit_term", label: "Benefit term", kind: "select", options: ["3 months", "6 months", "12 months", "24 months", "5 years", "To retirement age", "For life"] },
    { key: "premium_pattern", label: "Premium pattern", kind: "select", options: PREMIUM_PATTERNS },
    { key: "increase_option", label: "Increase option", kind: "select", options: INCREASE },
    { key: "growth", label: "Cover growth", kind: "percent" },
  ],
};

export const defaultVariation = (fields: FieldDef[]): Record<string, any> =>
  Object.fromEntries(fields.map((f) => [f.key, f.kind === "select" ? f.options[0] : f.kind === "toggle" ? false : ""]));

/** Disabled growth is not required when the option explicitly has no increase. */
export const variationComplete = (fields: FieldDef[], v: Record<string, any>) =>
  fields.every((f) => (f.key === "growth" && v.increase_option === "No increase") || f.kind === "toggle" || f.kind === "select" || String(v[f.key] ?? "").trim() !== "");
