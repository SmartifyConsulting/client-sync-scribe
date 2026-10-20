import { PRODUCT_TYPES, defaultVariation } from "./quoteSpec";

/** Three default grades per product (Best / Medium / Basic benefit). */
const GRADES = [
  { premium_pattern: "Level", increase_option: "Cover increase: fixed percentage", growth: "6" },
  { premium_pattern: "Compulsory", increase_option: "Cover increase: fixed percentage", growth: "5" },
  { premium_pattern: "Age-rated", increase_option: "No increase", growth: "" },
];

const num = (v: any) => Number(v) || 0;
const round = (n: number, to: number) => Math.round(n / to) * to;

/** Products the needs analysis points to, with a suggested starting amount. */
export function productsFromNeeds(fin: any): { product: string; amount: number }[] {
  const gross = num(fin?.cash_flow?.gross_income);
  const items: any[] = fin?.assets_liabilities?.items ?? [];
  const debt = items.filter((i) => /loan|finance|credit|debt|bond/i.test(String(i.kind))).reduce((a, i) => a + num(i.value), 0);
  const out: { product: string; amount: number }[] = [];
  out.push({ product: "Life cover", amount: round(Math.max(debt + gross * 12 * 5, 1_000_000), 100_000) });
  if (gross > 0) out.push({ product: "Income protection", amount: round(gross * 0.75, 500) });
  const kinds = new Set(((fin?.risk_portfolio?.policies ?? []) as any[]).map((p) => p.kind));
  if (kinds.has("Disability")) out.push({ product: "Lump sum disability", amount: round(Math.max(gross * 12 * 5, 500_000), 100_000) });
  if (kinds.has("Severe illness")) out.push({ product: "Severe illness", amount: round(Math.max(gross * 12 * 2, 300_000), 50_000) });
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
