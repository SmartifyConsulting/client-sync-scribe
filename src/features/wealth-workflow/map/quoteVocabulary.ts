import type { FieldDef } from "./quoteSpec";

/** Broker-facing terms. Provider keys and labels remain the storage and portal contract. */
const FIELD_LABELS: Record<string, string> = {
  benefit_amount: "Lump-sum cover amount",
  monthly_benefit: "Monthly income benefit",
  product: "Insurer product",
  omp_product: "Insurer product",
  myriad_product: "Insurer product",
  plan: "Insurer product",
  plan_option: "Insurer product",
  ip_type: "Income protection type",
  need_type: "Cover need",
  premium_pattern: "Premium pattern",
  omp_premium: "Premium pattern",
  myriad_pattern: "Premium pattern",
  premium_guarantee: "Premium guarantee",
  omp_guarantee: "Premium guarantee",
  myriad_guarantee: "Premium guarantee",
  increase_option: "Cover increase type",
  annual_increase: "Cover increase type",
  omp_cover: "Cover increase type",
  myriad_increase: "Cover or premium increase type",
  growth: "Cover growth (%)",
  myriad_cover_growth: "Cover growth (%)",
  myriad_total_growth: "Premium growth (%)",
  omp_inflation: "CPI adjustment",
  omp_currency: "Currency-linked adjustment",
  cease_age: "Cover end age",
  myriad_retirement: "Cover end age",
  omp_term: "Premium payment term",
  benefit_term: "Income benefit payment term",
  waiting_period: "Income waiting period",
  waiting: "Income waiting period",
  omp_waiting: "Income waiting period",
  myriad_waiting: "Income waiting period",
  myriad_net_income: "Net monthly income",
  accelerated: "Benefit structure",
  structure: "Benefit structure",
  definition: "Disability definition",
  claim_escalation: "Increase while claiming",
  top_up: "Top-up option",
  extender: "Extender option",
  payout: "Payout type",
};

export function quoteFieldLabel(field: FieldDef) {
  const key = field.key.slice(field.key.lastIndexOf(":") + 1);
  if (key === "escalation") {
    return field.label === "Premium pattern" ? "Premium pattern" : "Cover increase type";
  }
  return FIELD_LABELS[key] ?? field.label;
}

const RATING_LABELS: Record<string, string> = {
  Education: "Highest qualification",
  Qualification: "Highest qualification",
  "Professional membership": "Professional body membership",
  "Admin (%)": "Office / admin work (%)",
  "Physical (%)": "Physical work (%)",
  "Travelling (%)": "Work travel (%)",
  "Before-tax monthly income": "Gross monthly income",
  "After-tax monthly income": "Net monthly income",
  "Salary Payment Day": "Salary payment day",
  "Bipolar Mood Disorder": "Bipolar mood disorder",
  "Nicotine use in the last 6 months": "Nicotine use in the last six months",
};

export const quoteRatingLabel = (portalLabel: string) => RATING_LABELS[portalLabel] ?? portalLabel;
