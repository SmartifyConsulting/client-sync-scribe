import { describe, expect, it } from "vitest";
import { canStartPortal, mayUseForAdvice, planningPremiumKey } from "./quoteSourcing";

describe("quote sourcing safeguards", () => {
  it("never permits indicative planning estimates as advice quotes", () => {
    expect(mayUseForAdvice({ method: "planning" })).toBe(false);
    expect(mayUseForAdvice({ method: "assisted" })).toBe(false);
    expect(mayUseForAdvice({ method: "manual" })).toBe(true);
  });
  it("only Companion sourcing can start a portal login", () => {
    expect(canStartPortal("companion")).toBe(true);
    expect(canStartPortal("email")).toBe(false);
    expect(canStartPortal("planning")).toBe(false);
  });
  it("keeps insurer planning premiums separate from official premium fields", () => {
    expect(planningPremiumKey("Momentum")).toBe("planning:Momentum:monthly_premium");
    expect(planningPremiumKey("Discovery")).not.toBe(planningPremiumKey("Momentum"));
  });
});