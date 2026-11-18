import { describe, expect, it } from "vitest";
import { estateDuty, futureValue, loanPayment, presentValue, realReturn, savingsContribution } from "./calculations";

describe("planning reference cases", () => {
  it("matches Microsoft's published present-value example", () => {
    expect(presentValue(500, 0.08 / 12, 240)).toBeCloseTo(59_777.15, 2);
  });
  it("matches the loan and savings reference cases", () => {
    expect(loanPayment(100_000, 0.12 / 12, 60)).toBeCloseTo(2224.44, 2);
    expect(futureValue(100_000, 1000, 0.06 / 12, 120)).toBeCloseTo(345_819.02, 2);
    const contribution = savingsContribution(100_000, 500_000, 0.06 / 12, 120);
    expect(futureValue(100_000, contribution, 0.06 / 12, 120)).toBeCloseTo(500_000, 6);
  });
  it("handles zero and negative returns and rejects invalid inputs", () => {
    expect(loanPayment(1200, 0, 12)).toBe(100);
    expect(futureValue(100, 10, 0, 12)).toBe(220);
    expect(presentValue(10, 0, 12)).toBe(120);
    expect(savingsContribution(500, 100, 0, 12)).toBe(0);
    expect(futureValue(100, 0, -0.01, 12)).toBeCloseTo(88.6385, 4);
    expect(() => loanPayment(100, -1, 12)).toThrow();
    expect(() => presentValue(100, 0.01, 0)).toThrow();
    expect(() => futureValue(NaN, 0, 0, 12)).toThrow();
  });
  it("uses real returns and both estate-duty bands", () => {
    expect(realReturn(0.08, 0.05)).toBeCloseTo(0.028571428571);
    expect(estateDuty(43_500_000, 0, 3_500_000)).toEqual({ dutiable: 40_000_000, duty: 8_500_000 });
    expect(estateDuty(1_000_000, 0, 3_500_000).duty).toBe(0);
  });
});
