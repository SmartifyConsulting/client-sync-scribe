import { describe, expect, it } from "vitest";
import { REAUTH_TTL_MS, isExpired } from "./session";

describe("Password Protector session", () => {
  it("unlocks insurer quoting for exactly 30 minutes", () => expect(REAUTH_TTL_MS).toBe(1800000));
  it("requires unlocking again at the 30-minute boundary", () => {
    expect(isExpired(1800000, 1799999)).toBe(false);
    expect(isExpired(1800000, 1800000)).toBe(true);
  });
});