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
