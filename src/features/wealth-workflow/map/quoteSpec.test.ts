import { describe, expect, it } from "vitest";
import { PRODUCT_TYPES, variationComplete } from "./quoteSpec";
import { DEFAULT_PARAMS, withCoverAmounts } from "./needsProducts";

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
