import { describe, expect, it } from "vitest";
import { PRODUCT_TYPES, variationComplete } from "./quoteSpec";
import { DEFAULT_PARAMS, withCoverAmounts } from "./needsProducts";
import { withQuoteDefaults } from "./providerQuoteFields";
import { buildMomentumLifeVariants, momentumLifeVariantLabel } from "./portalPayload";

describe("quote option completeness", () => {
  const option = { benefit_amount: "1700000", increase_option: "No increase", growth: "" };
  it("allows a disabled blank growth field for No increase", () => {
    expect(variationComplete(PRODUCT_TYPES["Life cover"], option)).toBe(true);
  });
  it("requires growth for percentage increases and still requires the benefit amount", () => {
    expect(variationComplete(PRODUCT_TYPES["Life cover"], { ...option, increase_option: "Cover increase: fixed percentage" })).toBe(false);
    expect(variationComplete(PRODUCT_TYPES["Life cover"], { ...option, benefit_amount: "" })).toBe(false);
  });
});

describe("calculated cover options", () => {
  it("keeps the target, existing cover and agreed cover separate", () => {
    const fin = {
      cash_flow: { gross_income: 30_000 },
      risk_portfolio: { policies: [{ kind: "Life cover", cover: 500_000 }] },
      goals_risk: { agreed_cover: { "Life cover": 1_200_000 } },
    };
    const options = [{}, {}, { benefit_amount: "100000" }];
    expect(withCoverAmounts("Life cover", options, fin, DEFAULT_PARAMS).map(v => v.benefit_amount))
      .toEqual(["1800000", "500000", "1200000"]);
    expect(withCoverAmounts("Life cover", options, { ...fin, goals_risk: {} }, DEFAULT_PARAMS)[2].benefit_amount)
      .toBe("");
  });
});

it("applies the shared CPI and maps only available insurer defaults", () => {
  const fin = { goals_risk: { quote_cpi: 4.5, retirement_age: 65, income_protection_term: "24 months" } };
  const defaults = withQuoteDefaults("Income protection", {}, ["Momentum", "Bidvest Life / FMI", "Old Mutual"], fin);
  expect(defaults).toMatchObject({
    growth: "4.5",
    benefit_term: "24 months",
    "Momentum:myriad_retirement": "65",
    "Bidvest Life / FMI:benefit_term": "24 months",
    "Bidvest Life / FMI:annual_increase": "CPI",
    "Old Mutual:omp_product": "OMP Disability Income",
  });
  expect(defaults["Old Mutual:omp_cover"]).toBeUndefined();
  expect(withQuoteDefaults("Income protection", {}, ["Momentum"], { goals_risk: { retirement_age: 63 } })["Momentum:myriad_retirement"]).toBeUndefined();
});

it("requests three distinct Momentum life patterns per applicable cover without renumbering Agreed Cover", () => {
  const scenarios = buildMomentumLifeVariants([{ benefit_amount: "1000000" }, { benefit_amount: "0" }, { benefit_amount: "800000" }]);
  expect(scenarios.map(s => s.n)).toEqual([7, 8, 9, 13, 14, 15]);
  expect(scenarios.slice(0, 3).map(s => s.fields.find(field => field.label === "Premium pattern")?.value))
    .toEqual(["Level", "Compulsory", "Aggressive LifeStage"]);
  expect(scenarios[5].fields.find(field => field.label === "Benefit amount")?.value).toBe("800000");
  expect(momentumLifeVariantLabel(15)).toBe("Life cover · Agreed Cover · Aggressive Increase");
});
