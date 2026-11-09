import { COVER_OPTIONS, PRODUCT_TYPES, defaultVariation } from "./quoteSpec";

const num = (value: unknown) => Number(value) || 0;
const round = (value: number, increment: number) => Math.round(value / increment) * increment;

export type NeedsParams = { incomeYears: number; ipPercent: number };
export const DEFAULT_PARAMS: NeedsParams = { incomeYears: 5, ipPercent: 75 };

export function productsFromNeeds(fin: any) {
  const policies = fin?.risk_portfolio?.policies ?? [];
  const products = ["Life cover"];
  if (!fin?.cash_flow?.not_earning && num(fin?.cash_flow?.gross_income) > 0) products.push("Income protection");
  if (policies.some((policy: any) => policy.kind === "Disability")) products.push("Lump sum disability");
  if (Number(fin?.goals_risk?.desired_severe_illness) > 0 || policies.some((policy: any) => policy.kind === "Severe illness")) products.push("Severe illness");
  return products;
}

export function defaultVariations(product: string) {
  const fields = PRODUCT_TYPES[product] ?? [];
  return COVER_OPTIONS.map(() => defaultVariation(fields.filter(field =>
    !["premium_pattern", "premium_guarantee", "increase_option", "growth", "benefit_term"].includes(field.key))));
}

export function withCoverAmounts(product: string, vars: Record<string, any>[], fin: any, params: NeedsParams) {
  const key = (PRODUCT_TYPES[product] ?? []).find((f) => f.kind === "amount")?.key;
  if (!key) return vars;
  if (!fin) return vars.map(option => ({ ...option, [key]: "" }));
  const gross = fin.cash_flow?.not_earning ? 0 : num(fin.cash_flow?.gross_income);
  const net = fin.cash_flow?.not_earning ? 0 : num(fin.cash_flow?.net_salary);
  const debt = (fin.assets_liabilities?.items ?? []).filter((item: any) => /loan|finance|credit|debt|bond/i.test(item.kind))
    .reduce((total: number, item: any) => total + num(item.value), 0);
  const desired: Record<string, number | string | undefined> = {
    "Life cover": round(debt + gross * 12 * params.incomeYears, 100_000),
    "Income protection": net > 0 ? round(net * params.ipPercent / 100, 500) : undefined,
    "Lump sum disability": round(Math.max(gross * 12 * 5, 500_000), 100_000),
    "Severe illness": fin.goals_risk?.desired_severe_illness,
  };
  const policyKind = product === "Lump sum disability" ? "Disability" : product;
  const current = (fin.risk_portfolio?.policies ?? []).filter((policy: any) => policy.kind === policyKind)
    .reduce((total: number, policy: any) => total + num(policy.cover), 0);
  const agreed = fin.goals_risk?.agreed_cover?.[product];
  const amounts = [desired[product], current, agreed];
  return vars.map((option, index) => {
    const amount = amounts[index];
    return { ...option, [key]: amount != null && amount !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0 ? String(amount) : "" };
  });
}

export function hasNoCurrentCover(product: string, option: Record<string, unknown>, index: number) {
  return index === 1 && option[product === "Income protection" ? "monthly_benefit" : "benefit_amount"] === "0";
}
