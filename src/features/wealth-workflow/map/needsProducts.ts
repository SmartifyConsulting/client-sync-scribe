import { PRODUCT_TYPES, defaultVariation } from "./quoteSpec";
import { fmtR } from "./money";

/** Three default grades per product (Best / Medium / Basic benefit). */
const GRADES = [
  { premium_pattern: "Level", increase_option: "Cover increase: fixed percentage", growth: "6" },
  { premium_pattern: "Compulsory", increase_option: "Cover increase: fixed percentage", growth: "5" },
  { premium_pattern: "Age-rated", increase_option: "No increase", growth: "" },
];

const num = (v: any) => Number(v) || 0;
const round = (n: number, to: number) => Math.round(n / to) * to;

/** Editable inputs of the shortfall formula (the broker can change them per client). */
export type NeedsParams = { incomeYears: number; ipPercent: number };
export const DEFAULT_PARAMS: NeedsParams = { incomeYears: 5, ipPercent: 75 };

export type NeedItem = { product: string; amount: number; formula: string };

const existing = (fin: any, kind: string) =>
  ((fin?.risk_portfolio?.policies ?? []) as any[]).filter((p) => p.kind === kind).reduce((a, p) => a + num(p.cover), 0);

/** Shortfall (net need): what is needed minus the cover the client already has. */
export function productsFromNeeds(fin: any, params: NeedsParams = DEFAULT_PARAMS): NeedItem[] {
  const gross = num(fin?.cash_flow?.gross_income);
  const items: any[] = fin?.assets_liabilities?.items ?? [];
  const debt = items.filter((i) => /loan|finance|credit|debt|bond/i.test(String(i.kind))).reduce((a, i) => a + num(i.value), 0);
  const out: NeedItem[] = [];

  const incomeNeed = gross * 12 * params.incomeYears;
  const lifeHave = existing(fin, "Life cover");
  const life = Math.max(round(debt + incomeNeed - lifeHave, 100_000), 0);
  out.push({
    product: "Life cover", amount: life,
    formula: `Debts ${fmtR(debt)} + income ${fmtR(gross)} × 12 × ${params.incomeYears} yrs ${fmtR(incomeNeed)} − existing cover ${fmtR(lifeHave)} = ${fmtR(life)}`,
  });

  if (gross > 0) {
    const want = gross * (params.ipPercent / 100);
    const ipHave = existing(fin, "Income protection");
    const ip = Math.max(round(want - ipHave, 500), 0);
    out.push({
      product: "Income protection", amount: ip,
      formula: `${params.ipPercent}% of income ${fmtR(gross)} = ${fmtR(want)} − existing ${fmtR(ipHave)} pm = ${fmtR(ip)} pm`,
    });
  }

  const kinds = new Set(((fin?.risk_portfolio?.policies ?? []) as any[]).map((p) => p.kind));
  if (kinds.has("Disability")) {
    const a = round(Math.max(gross * 12 * 5, 500_000), 100_000);
    out.push({ product: "Lump sum disability", amount: a, formula: `Income × 12 × 5 yrs (min R 500 000) = ${fmtR(a)}` });
  }
  if (kinds.has("Severe illness")) {
    const a = round(Math.max(gross * 12 * 2, 300_000), 50_000);
    out.push({ product: "Severe illness", amount: a, formula: `Income × 12 × 2 yrs (min R 300 000) = ${fmtR(a)}` });
  }
  return out;
}

export function defaultVariations(product: string, amount: number) {
  const fields = PRODUCT_TYPES[product] ?? [];
  const amountKey = fields.find((f) => f.kind === "amount")?.key;
  return GRADES.map((g) => {
    const v: Record<string, any> = { ...defaultVariation(fields) };
    for (const [k, val] of Object.entries(g)) if (k in v) v[k] = val;
    if (amountKey && amount) v[amountKey] = String(amount);
    return v;
  });
}

/** Sets the amount on every option of a product (used when the formula inputs change). */
export function withAmount(product: string, vars: Record<string, any>[], amount: number) {
  const key = (PRODUCT_TYPES[product] ?? []).find((f) => f.kind === "amount")?.key;
  return key ? vars.map((v) => ({ ...v, [key]: amount ? String(amount) : "" })) : vars;
}
