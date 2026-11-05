import { expect, test } from "bun:test";
import { providerQuoteFields, ompSettingsComplete } from "../src/features/wealth-workflow/map/providerQuoteFields";
import { buildPortalScenarios, clientPortalFields } from "../src/features/wealth-workflow/map/portalPayload";
test("required gender comes from saved client data without inference", () => {
  expect(clientPortalFields({ gender: "Female" })).toEqual([{ label: "Gender", aliases: [], value: "Female", kind: "text" }]);
  expect(clientPortalFields({ gender: null })).toEqual([]);
});
test("OMP does not silently translate legacy settings or send them", () => {
  const old = { benefit_amount: "1700000", growth: "6", premium_pattern: "Level", "Old Mutual:plan": "Greenlight Life Cover" };
  expect(ompSettingsComplete("Old Mutual", "Life cover", old)).toBe(false);
  const fields = buildPortalScenarios({ "Life cover": [old] }, "Old Mutual")[0].fields;
  expect(fields.map(f => f.value)).toEqual(["1700000"]);
  expect(old.growth).toBe("6");
});
test("OMP validates exact offered choices and conditional inflation adjustment", () => {
  const v: Record<string, any> = { benefit_amount: "1700000" };
  for (const f of providerQuoteFields("Old Mutual", "Life cover")) if (f.kind === "select") v[f.key] = f.options[0];
  expect(ompSettingsComplete("Old Mutual", "Life cover", v)).toBe(true);
  v["Old Mutual:omp_cover"] = "6% fixed rate";
  expect(ompSettingsComplete("Old Mutual", "Life cover", v)).toBe(false);
  v["Old Mutual:omp_cover"] = "Inflation-linked";
  delete v["Old Mutual:omp_inflation"];
  expect(ompSettingsComplete("Old Mutual", "Life cover", v)).toBe(false);
});

test("Old Mutual product choices keep insurer-specific guarantees and waiting periods", () => {
  const choices = (product: string, suffix: string) => {
    const f = providerQuoteFields("Old Mutual", product).find(f => f.key === `Old Mutual:${suffix}`);
    return f?.kind === "select" ? f.options : [];
  };
  expect(choices("Severe illness", "omp_guarantee")).toEqual(["5 years", "10 years"]);
  expect(choices("Income protection", "omp_guarantee")).toEqual(["1 year", "5 years"]);
  expect(choices("Income protection", "omp_waiting")).toEqual(["7 days", "1 month", "3 months", "6 months", "12 months", "24 months"]);
  expect(choices("Income protection", "omp_cover")).toEqual(["0% fixed rate", "5% fixed rate", "Inflation-linked"]);
  expect(providerQuoteFields("Old Mutual", "Income protection").some(f => f.key === "benefit_term")).toBe(false);
});

test("generic severe-illness terms never become insurer instructions", () => {
  const old = { benefit_amount: "2050000", premium_pattern: "Compulsory", premium_guarantee: "Standard" };
  expect(ompSettingsComplete("Old Mutual", "Severe illness", old)).toBe(false);
  expect(buildPortalScenarios({ "Severe illness": [old] }, "Old Mutual")[0].fields.map(f=>f.value)).toEqual(["2050000"]);
});
