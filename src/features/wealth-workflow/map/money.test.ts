import { describe, it, expect } from "vitest";
import { fmtR, groupDigits } from "./money";

describe("Rand formatting", () => {
  it("separates every 3 units with a space and shows cents", () => {
    expect(fmtR(1000000)).toBe("R 1 000 000.00");
  });
  it("groups typed amounts in the input", () => {
    expect(groupDigits("1000000")).toBe("1 000 000");
  });
});
