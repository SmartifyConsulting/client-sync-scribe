import type { FieldDef } from "./quoteSpec";

/** Insurer-specific quote options layered on top of the shared product fields.
 *  Built from each insurer's published product guides (public terminology), NOT from
 *  their broker portals — confirm against the live quote screens before relying on them. */
type Dict = Record<string, Partial<Record<string, FieldDef[]>>>;

const sel = (key: string, label: string, options: string[]): FieldDef => ({ key, label, kind: "select", options });

const DICT: Dict = {
  Discovery: {
    "Life cover": [sel("plan_option", "Plan option", ["Classic", "Essential"]), sel("vitality", "Vitality integration", ["Vitality Life Plan", "No Vitality"]), sel("escalation", "Benefit escalation", ["CPI", "CPI + 1%", "Level", "5% fixed"])],
    "Severe illness": [sel("plan_option", "Severe illness option", ["Comprehensive", "Core"]), sel("global_treatment", "Global Treatment", ["Included", "Excluded"])],
    "Income protection": [sel("ip_type", "Income cover", ["Income Continuation", "Capital Disability Top-up"]), sel("vitality", "Vitality integration", ["Vitality Life Plan", "No Vitality"])],
    "Lump sum disability": [sel("definition", "Disability definition", ["Own occupation", "Suited occupation"])],
  },
  Momentum: {
    "Life cover": [sel("plan", "Myriad plan", ["Myriad", "Myriad Lite"]), sel("escalation", "Escalation", ["MaxGrowth", "5% fixed", "Level"])],
    "Severe illness": [sel("plan_option", "Illness benefit", ["Complete Illness", "Core Illness"])],
    "Income protection": [sel("ip_type", "Disability income", ["Permanent + Temporary", "Temporary only"])],
    "Lump sum disability": [sel("definition", "Disability definition", ["Own occupation", "Any occupation"])],
  },
  "Old Mutual": {
    "Life cover": [sel("plan", "Greenlight option", ["Greenlight Life Cover", "Greenlight Smart Cover"]), sel("escalation", "Premium pattern", ["Level", "5% increase", "CPI increase"])],
    "Severe illness": [sel("plan_option", "Severe illness cover", ["Comprehensive", "Standard"])],
    "Income protection": [sel("ip_type", "Income protection", ["Extended", "Core"])],
    "Lump sum disability": [sel("definition", "Disability definition", ["Own occupation", "Similar occupation"])],
  },
  BrightRock: {
    "Life cover": [sel("need_type", "Needs-matched cover", ["Cover to retirement", "Whole of life", "Debt cover"]), sel("escalation", "Cover escalation", ["Fixed", "Dynamic (CPI)", "Level"])],
    "Severe illness": [sel("need_type", "Critical illness need", ["Lump sum", "Recurring payout"])],
    "Income protection": [sel("need_type", "Income need", ["Temporary expense", "Permanent income"])],
    "Lump sum disability": [sel("need_type", "Disability need", ["Once-off expense", "Debt cover"])],
  },
  "Bidvest Life / FMI": {
    "Life cover": [sel("payout", "Life payout", ["Lump sum", "Monthly income to family"])],
    "Severe illness": [sel("payout", "Critical illness payout", ["Monthly critical illness", "Lump sum"])],
    "Income protection": [sel("ip_type", "Income benefit", ["Temporary + Long-term income", "Temporary income", "Long-term income"])],
    "Lump sum disability": [sel("payout", "Disability payout", ["Lump sum", "Monthly income"])],
  },
  Sanlam: {
    "Life cover": [sel("plan", "Matrix option", ["Standard", "Comprehensive"]), sel("escalation", "Escalation", ["Inflation", "Level"])],
    "Severe illness": [sel("plan_option", "Illness option", ["Cancer Plus", "Comprehensive"])],
  },
  Liberty: {
    "Life cover": [sel("plan", "Lifestyle Protector option", ["Standard", "Comprehensive"]), sel("escalation", "Escalation", ["Inflation", "Level"])],
    "Severe illness": [sel("plan_option", "Illness option", ["Early Illness", "Comprehensive"])],
  },
};

/** Extra fields this insurer needs for a product. Stored on each option as `${insurer}:${key}`. */
export function insurerFields(insurer: string, product: string): FieldDef[] {
  const k = Object.keys(DICT).find((n) => insurer.toLowerCase().startsWith(n.toLowerCase().split(" ")[0]));
  return (k && DICT[k][product]) || [];
}
export const insurerKey = (insurer: string, key: string) => `${insurer}:${key}`;
