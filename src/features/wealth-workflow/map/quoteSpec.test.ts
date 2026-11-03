import { describe, expect, it } from "vitest";
import { PRODUCT_TYPES, variationComplete } from "./quoteSpec";

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
