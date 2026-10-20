import { describe, expect, it } from "vitest";
import { REAUTH_TTL_MS, isExpired } from "./session";

describe("Password Protector session", () => {
  it("unlocks insurer quoting for exactly 15 minutes", () => expect(REAUTH_TTL_MS).toBe(900000));
  it("requires unlocking again at the 15-minute boundary", () => {
    expect(isExpired(900000, 899999)).toBe(false);
    expect(isExpired(900000, 900000)).toBe(true);
  });
});