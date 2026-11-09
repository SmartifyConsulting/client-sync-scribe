import { PRODUCT_TYPES, PREMIUM_PATTERNS, type FieldDef } from "./quoteSpec";
import { insurerFields, insurerKey } from "./insurerDictionary";

export function withQuoteDefaults(product: string, option: Record<string, any>, insurers: string[], fin: any) {
  const goals = fin?.goals_risk;
  // Defaults to the standard 5% until the Wealth Manager overrides it in Needs Analysis.
  const rawCpi = goals?.quote_cpi;
  const cpi = String(rawCpi == null || String(rawCpi).trim() === "" ? "5" : rawCpi);
  const term = String(goals?.income_protection_term ?? "");
  const retirementAge = String(goals?.retirement_age ?? "");
  const effective: Record<string, any> = {
    premium_pattern: "Stable",
    premium_guarantee: "Standard",
    increase_option: "Cover increase: CPI rate",
    ...(product === "Income protection" ? { benefit_term: term } : {}),
    ...option,
  };
  if (effective.increase_option === "Cover increase: CPI rate") effective.growth = cpi;

  for (const insurer of insurers) {
    if (!hasVerifiedProviderFields(insurer, product)) continue;
    const defaults: Record<string, string> = {
      "Bidvest Life / FMI:annual_increase": "CPI",
      "Bidvest Life / FMI:benefit_term": term,
      "Momentum:myriad_guarantee": "Standard",
      "Momentum:myriad_increase": "Cover increase: CPI rate",
      "Momentum:myriad_retirement": retirementAge,
    };
    for (const field of providerQuoteFields(insurer, product)) {
      if (effective[field.key] != null && effective[field.key] !== "") continue;
      if (field.kind === "select") {
        const value = field.options.length === 1 ? field.options[0] : defaults[field.key];
        if (field.options.includes(value)) effective[field.key] = value;
      }
      if (field.key === "Momentum:myriad_net_income" && Number(fin?.cash_flow?.net_salary) > 0) {
        effective[field.key] = String(fin.cash_flow.net_salary);
      }
    }
  }
  return effective;
}

export const isOmpLife = (insurer: string, product: string) => insurer === "Old Mutual" && product === "Life cover";
export const isOmpProduct = (insurer: string, product: string) => insurer === "Old Mutual" && ["Life cover", "Severe illness", "Income protection"].includes(product);
export const isMyriadProduct = (insurer: string, product: string) => insurer === "Momentum" && ["Life cover", "Severe illness", "Income protection"].includes(product);
export const isBidvestProduct = (insurer: string, product: string) => insurer === "Bidvest Life / FMI" && ["Life cover", "Severe illness", "Income protection", "Lump sum disability"].includes(product);
export const hasVerifiedProviderFields = (insurer: string, product: string) => isOmpProduct(insurer, product) || isMyriadProduct(insurer, product) || isBidvestProduct(insurer, product);

export function providerFieldApplies(field: FieldDef, option: Record<string, any>) {
  if (field.key === "Bidvest Life / FMI:benefit_term") return option["Bidvest Life / FMI:product"] === "Temporary Income Protector (TIP)";
  if (field.key === "Bidvest Life / FMI:cease_age" && option["Bidvest Life / FMI:product"] === "Whole of Life Cover") return false;
  if (field.key === "Momentum:myriad_cover_growth") return option["Momentum:myriad_increase"] === "Cover Increase: fixed percentage";
  if (field.key === "Momentum:myriad_total_growth") return option["Momentum:myriad_increase"] === "Premium Increase: fixed percentage";
  if (field.key === "Old Mutual:omp_inflation") return option["Old Mutual:omp_cover"] === "Inflation-linked";
  if (field.key === "Old Mutual:omp_currency") return option["Old Mutual:omp_cover"] === "Currency-linked";
  return true;
}

// Verified in the OM Adviser OMP Life quote screen. No inferred Greenlight mappings.
export function providerQuoteFields(insurer: string, product: string): FieldDef[] {
  if (isBidvestProduct(insurer, product)) {
    const life=product==='Life cover', income=product==='Income protection', illness=product==='Severe illness';
    const select=(key:string,label:string,options:string[]):FieldDef=>({key:insurerKey(insurer,key),label,kind:'select',options});
    return [
      {key:income?'monthly_benefit':'benefit_amount',label:income?'Monthly cover':'Lump sum cover',kind:'amount'},
      select('product','Bidvest product',life?['Term Life Cover','Whole of Life Cover']:income?['Temporary Income Protector (TIP)']:illness?['Critical Illness Lump Sum (CILS)']:['Disability Lump Sum (DLS)']),
      ...(!life&&!income?[select('structure','Structure',['Standalone','Accelerated'])]:[]),
      select('annual_increase','Annual benefit increase',['0%','3%','5%','7.5%','10%','CPI']),
      select('premium_pattern','Premium pattern',life||(!income&&!illness)?['5% Compulsory Increase','Age Rated','Level Premium','Age Rated Plus']:['5% Compulsory Increase','Age Rated','Level Premium']),
      select('cease_age','Cease age',illness?['65','70','Whole of Life']:income?['55','60','65','70','75']:life?['55','60','65','70']:['55','60','65','70','Whole of Life']),
      ...(income?[select('waiting','Waiting period',['7 days','14 days','30 days','90 days']),select('benefit_term','Benefit term',['3 months','6 months','12 months','24 months']),select('claim_escalation','Add claim escalation',['No','Yes'])]:[]),
      ...(illness?[select('top_up','Include Top-Up Option',['Yes','No']),select('extender','Include Extender Option',['Yes','No'])]:[]),
      ...(!income&&!life&&!illness?[select('definition','Comprehensive/Occupational',['Comprehensive','Occupational'])]:[]),
    ];
  }
  if (isMyriadProduct(insurer, product)) {
    const life = product === "Life cover", income = product === "Income protection";
    const select = (key: string, label: string, options: string[]): FieldDef => ({ key: insurerKey(insurer, key), label, kind: "select", options });
    return [
      { key: income ? "monthly_benefit" : "benefit_amount", label: income ? "Monthly benefit amount" : "Benefit amount", kind: "amount" },
      select("myriad_product", "Momentum product", [life ? "Death Benefit : Whole life" : income ? "Complete Income Protector" : "Complete Critical Illness Benefit: Whole Life"]),
      ...(income ? [select("myriad_retirement", "Retirement Age", ["55", "60", "65", "70", "Whole life"]), select("myriad_waiting", "Waiting period", ["1 Month", "3 Months", "6 Months", "7 Days", "12 Months", "14 Days", "24 Months"]), {key: "Momentum:myriad_net_income", label: "Actual net income(monthly)", kind: "amount" as const}] : []),
      select("myriad_pattern", "Premium pattern", life ? ["Level", "Compulsory", "LifeStage", "Aggressive LifeStage"] : ["Level", "Compulsory", "LifeStage"]),
      ...(!income ? [select("myriad_guarantee", "Premium guarantee option", life ? ["Standard", "Extended", "Ten-year capped"] : ["Standard", "Extended"])] : []),
      select("myriad_increase", "Increase option", income ? ["- None -", "Cover Increase: fixed percentage", "Cover increase: CPI rate"] : ["- None -", "Cover Increase: fixed percentage", "Cover increase: Rand Depreciation Index", "Cover increase: CPI rate", "Premium Increase: fixed percentage", "Premium increase: CPI rate"]),
      {key: "Momentum:myriad_cover_growth", label: "Cover growth", kind: "percent"},
      ...(!income ? [{key: "Momentum:myriad_total_growth", label: "Total growth", kind: "percent" as const}] : []),
    ];
  }
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

/**
 * Every insurer/product combination needs exactly 3 quoted premium-pattern
 * variants per cover option (per the business rule already proven out for
 * Old Mutual Life and Momentum Life). Each insurer names its own real portal
 * field for this differently (generic/Bidvest: premium_pattern, Momentum:
 * myriad_pattern, Old Mutual: omp_premium) but the underlying "3 quotes to
 * request" concept is the same everywhere, so it is found and curated here
 * once instead of per insurer.
 */
export function premiumPatternField(insurer: string, product: string): FieldDef | undefined {
  return providerQuoteFields(insurer, product).find(
    (f) => f.kind === "select" && /premium_pattern|myriad_pattern|omp_premium/.test(f.key)
  );
}

/**
 * Curated 3-of-N overrides for insurer/product combos whose real portal
 * dropdown offers more than 3 premium-pattern choices, OR whose real terms
 * need reordering. The order here is load-bearing: position 0/1/2 must line
 * up with Elysian's own Stable / Inflationary Increase / Aggressive Increase
 * terminology (see premiumPatternElysianLabel below) — UI shows Elysian's
 * wording at that position while the real insurer term here is what's
 * actually selected on the portal and saved with the quote. Add further
 * entries here (never by branching UI code) as other combinations get the
 * same business review; a combination with no entry falls back to the
 * portal field's raw option order, which is NOT guaranteed to already match
 * Stable/Inflationary/Aggressive.
 */
const CURATED_PREMIUM_PATTERNS: Record<string, string[]> = {
  "Momentum:Life cover": ["Level", "Compulsory", "Aggressive LifeStage"],
  "Bidvest Life / FMI:Life cover": ["Level Premium", "5% Compulsory Increase", "Age Rated"],
  "Bidvest Life / FMI:Severe illness": ["Level Premium", "5% Compulsory Increase", "Age Rated"],
  "Bidvest Life / FMI:Income protection": ["Level Premium", "5% Compulsory Increase", "Age Rated"],
  "Bidvest Life / FMI:Lump sum disability": ["Level Premium", "5% Compulsory Increase", "Age Rated"],
  "Old Mutual:Life cover": ["0% Annual Increase", "5% Annual Increase", "Increase with Age"],
  "Old Mutual:Severe illness": ["0% Annual Increase", "5% Annual Increase", "Increase with Age"],
  "Old Mutual:Income protection": ["0% Annual Increase", "5% Annual Increase", "Increase with Age"],
};

/** The 3 premium-pattern labels to quote for this insurer/product, or undefined if it has no such field. */
export function premiumPatternOptions(insurer: string, product: string): string[] | undefined {
  const field = premiumPatternField(insurer, product);
  if (!field || field.kind !== "select") return undefined;
  return CURATED_PREMIUM_PATTERNS[`${insurer}:${product}`] ?? field.options.slice(0, 3);
}

/**
 * Elysian's own wording for premium-pattern position 0/1/2 (Stable /
 * Inflationary Increase / Aggressive Increase), shown in the UI instead of
 * the insurer's own term at that position. Only trustworthy for insurers
 * whose 3 terms are curated above in that exact order; an insurer still on
 * the raw portal-option fallback hasn't been confirmed to be in Stable →
 * Inflationary → Aggressive order, so its own term is shown instead.
 */
export function premiumPatternElysianLabel(insurer: string, product: string, index: number): string | undefined {
  if (!CURATED_PREMIUM_PATTERNS[`${insurer}:${product}`] && !/^(Discovery|BrightRock|Sanlam|Liberty)$/.test(insurer)) return undefined;
  return PREMIUM_PATTERNS[index];
}

/** Gate for the 3-quotes-per-option UI: any insurer/product with a premium-pattern field qualifies. */
export const supportsPremiumVariants = (insurer: string, product: string) => premiumPatternOptions(insurer, product) !== undefined;

export function ompSettingsComplete(insurer: string, product: string, option: Record<string, any>) {
  if (!hasVerifiedProviderFields(insurer, product)) return true;
  return providerQuoteFields(insurer, product).every(f => {
    if (!providerFieldApplies(f, option)) return true;
    return f.kind === "toggle" || (f.kind === "select" ? f.options.includes(option[f.key]) : String(option[f.key] ?? "").trim() !== "" && Number.isFinite(Number(option[f.key])) && (f.kind === "percent" ? Number(option[f.key]) >= 0 : Number(option[f.key]) > 0));
  });
}
