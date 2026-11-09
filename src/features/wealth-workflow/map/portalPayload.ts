import { providerQuoteFields, hasVerifiedProviderFields, isOmpProduct, providerFieldApplies, premiumPatternField, premiumPatternOptions } from "./providerQuoteFields";
import { PREMIUM_PATTERNS, coverOptionLabel } from "./quoteSpec";
import { insurerFields, insurerKey } from "./insurerDictionary";
import { OMP_RATING_LABELS } from "./providerRatingFields";
import { bidvestQuestions } from './BidvestClientFields';
export { OMP_RATING_LABELS } from "./providerRatingFields";

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
    ["email", "Email", ["Email address"]], ["dob", "Date of birth", []], ["gender", "Gender", []],
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
    fields: [...(insurer === 'Old Mutual' && plan['Life cover']?.[i]?._ompInputs
      ? OMP_RATING_LABELS.flatMap((label): PortalField[] => { const value = (plan['Life cover'][i]._ompInputs as Record<string, unknown>)[label]; return typeof value === 'string' && value.trim() ? [{label,value:value.trim(),kind:'text'}] : []; })
      : clientPortalFields(client)), ...(insurer==='Bidvest Life / FMI' ? (()=>{const answers=plan[products[0]]?.[i]?._bidvestInputs as Record<string,string>|undefined;return answers?[...bidvestQuestions(answers).map(([label])=>label),'Before-tax monthly income','After-tax monthly income'].flatMap(label=>answers[label]?[{label,value:answers[label],kind:'text'}]:[]):[];})():[]), ...products.flatMap((product) => {
      const option = plan[product][i];
      if (!option) return [];
      const fields = providerQuoteFields(insurer, product);
      return fields.flatMap((f): PortalField[] => {
        if (f.key === "growth" && option.increase_option === "No increase") return [];
        if (!providerFieldApplies(f, option)) return [];
        const value = option[f.key] ?? (hasVerifiedProviderFields(insurer, product) ? "" : f.kind === "select" ? f.options[0] : f.kind === "toggle" ? false : "");
        return value === "" ? [] : [{ product, label: f.label, aliases: ALIASES[f.key] || [], kind: f.kind, value: String(value) }];
      });
    })],
  }));
}

export const VARIANT_COMPANION_VERSION = "1.7.18";
/** @deprecated kept only so existing call sites keep compiling until Phase 2/3 switch to the generic premium-variant path below. */
const MOMENTUM_LIFE_PATTERNS = ["Level", "Compulsory", "Aggressive LifeStage"];
/** @deprecated kept only so existing call sites keep compiling; use premiumPatternOptions("Old Mutual", product) instead. */
export const OLD_MUTUAL_LIFE_PATTERNS = ["0% Annual Increase", "5% Annual Increase", "Increase with Age"];

/** @deprecated numbered-scenario mechanism, superseded by the universal _premiumVariants model (see buildPremiumVariantScenario). */
export function momentumLifeVariantLabel(n: number) {
  if (!Number.isInteger(n) || n < 7 || n > 15) return undefined;
  return `Life cover · ${coverOptionLabel(Math.floor((n - 7) / 3))} · ${PREMIUM_PATTERNS[(n - 7) % 3]}`;
}

/** @deprecated numbered-scenario mechanism, superseded by the universal _premiumVariants model (see buildPremiumVariantScenario). */
export function buildMomentumLifeVariants(options: Record<string, unknown>[], client?: Record<string, unknown> | null) {
  return options.flatMap((option, index) => {
    if (!option || !(Number(option.benefit_amount) > 0)) return [];
    return MOMENTUM_LIFE_PATTERNS.map((pattern, variant) => ({
      ...buildPortalScenarios({ "Life cover": [{ ...option, "Momentum:myriad_pattern": pattern }] }, "Momentum", client)[0],
      n: 7 + index * 3 + variant,
    }));
  });
}

/**
 * Architecture decision (Phase 1): every insurer/product now gets its 3
 * premium-pattern quotes through this ONE generic path, keyed by
 * insurer → pattern label → evidence on the option's `_premiumVariants`
 * (the data-structure mechanism originally built for Old Mutual Life),
 * rather than Momentum's numbered-scenario range (n=7-15, hardcoded to one
 * insurer/product). The numbered-scenario mechanism cannot generalize —
 * scenario numbers are a single shared sequence across all insurers/products
 * in a plan, so a fixed per-insurer range only ever works for one combo.
 * The _premiumVariants object has no such ceiling: it scales to every
 * insurer × every product × every option without reserving scenario-number
 * ranges, so it is kept as the universal mechanism and the Momentum
 * numbered-scenario functions above are deprecated (Phase 2/3 will move
 * their call sites over and delete them).
 */
export function buildPremiumVariantScenario(
  insurer: string,
  product: string,
  option: Record<string, unknown>,
  pattern: string,
  client?: Record<string, unknown> | null
) {
  const field = premiumPatternField(insurer, product);
  if (!field) return undefined;
  return buildPortalScenarios({ [product]: [{ ...option, [field.key]: pattern }] }, insurer, client)[0];
}

/** The 3 premium-pattern scenarios to request for one option of one insurer/product, or [] if it has no pattern field. */
export function buildPremiumVariantScenarios(
  insurer: string,
  product: string,
  option: Record<string, unknown>,
  client?: Record<string, unknown> | null
) {
  const patterns = premiumPatternOptions(insurer, product);
  if (!patterns) return [];
  return patterns.map((pattern) => ({ pattern, scenario: buildPremiumVariantScenario(insurer, product, option, pattern, client) }));
}

