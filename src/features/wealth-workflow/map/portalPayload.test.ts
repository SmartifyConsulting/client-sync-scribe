import { describe, expect, it } from "vitest";
import { buildPortalScenarios, clientPortalFields } from "./portalPayload";
describe("approved portal payload", () => {
  it("includes selected insurer options, separate benefit growth, and actual client rating data", () => {
    const scenarios = buildPortalScenarios({ "Life cover": [{ benefit_amount: "1700000", premium_pattern: "Level", growth: "6", "Momentum:plan": "Myriad Lite" }] }, "Momentum", { first_name: "Georgia", occupation: "Engineer level 2", smoker: "No" });
    expect(scenarios[0].n).toBe(1);
    expect(scenarios[0].fields.find((f) => f.label === "Myriad plan")?.value).toBe("Myriad Lite");
    expect(scenarios[0].fields.find((f) => f.label === "Cover growth")?.aliases).toContain("Yearly base increase");
    expect(scenarios[0].fields.find((f) => f.label === "Cover growth")?.aliases).not.toContain("Premium increase");
    expect(scenarios[0].fields.find((f) => f.label === "Occupation")?.value).toBe("Engineer level 2");
  });
  it("does not invent missing identity, dates, screening, or premium increase", () => {
    expect(clientPortalFields({ name: "Georgia Demo" })).toEqual([]);
    const fields = buildPortalScenarios({ "Life cover": [{ benefit_amount: "1000000" }] }, "BrightRock")[0].fields;
    expect(fields.some((f) => /policy start|screening|premium increase/i.test(f.label))).toBe(false);
  });
  it("numbers three scenarios and keeps their cover amounts separate", () => {
    const scenarios = buildPortalScenarios({ "Life cover": [1, 2, 3].map((n) => ({ benefit_amount: String(n * 1000000) })) }, "Momentum");
    expect(scenarios.map((s) => s.n)).toEqual([1, 2, 3]);
    expect(scenarios.map((s) => s.fields.find((f) => f.label === "Benefit amount")?.value)).toEqual(["1000000", "2000000", "3000000"]);
  });
});
it("omits retained growth when the option switches to No increase", () => {
  const fields = buildPortalScenarios({ "Life cover": [{ benefit_amount: "1700000", increase_option: "No increase", growth: "6" }] }, "Momentum")[0].fields;
  expect(fields.some(f => f.label === "Cover growth")).toBe(false);
  expect(fields.find(f => f.label === "Increase option")?.value).toBe("No increase");
});
