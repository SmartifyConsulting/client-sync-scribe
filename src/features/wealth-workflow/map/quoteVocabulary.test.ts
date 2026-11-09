import { describe, expect, it } from "vitest";
import { buildPortalScenarios } from "./portalPayload";
import { providerQuoteFields } from "./providerQuoteFields";
import { quoteFieldLabel, quoteRatingLabel } from "./quoteVocabulary";

describe("standard quote terms", () => {
  it("shows the same label for income waiting periods while sending the exact portal value", () => {
    const field = providerQuoteFields("Momentum", "Income protection").find(field => field.key === "Momentum:myriad_waiting")!;
    const other = providerQuoteFields("Old Mutual", "Income protection").find(field => field.key === "Old Mutual:omp_waiting")!;
    expect(quoteFieldLabel(field)).toBe("Income waiting period");
    expect(quoteFieldLabel(other)).toBe("Income waiting period");
    const [scenario] = buildPortalScenarios({ "Income protection": [{ [field.key]: "1 Month" }] }, "Momentum");
    expect(scenario.fields).toContainEqual(expect.objectContaining({ label: "Waiting period", value: "1 Month" }));
  });

  it("keeps nicotine screening and tax-specific income distinct", () => {
    expect(quoteRatingLabel("Nicotine use in the last 6 months")).toBe("Nicotine use in the last six months");
    expect(quoteRatingLabel("Gross taxable monthly income")).toBe("Gross taxable monthly income");
    expect(quoteRatingLabel("Before-tax monthly income")).toBe("Gross monthly income");
  });
});
