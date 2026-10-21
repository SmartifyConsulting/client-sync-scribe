import { describe, expect, it } from "bun:test";
import { activityWaiting, isActivityPhase, updateActivity } from "./quoteActivity";
describe("Truthful quote activity", () => {
  it("flags an unchanged step after 30 seconds despite polling", () => {
    const first = updateActivity(undefined, "credentials", 1000);
    const polled = updateActivity(first, "credentials", 20000);
    expect(activityWaiting(polled, 30999)).toBe(false);
    expect(activityWaiting(polled, 31000)).toBe(true);
  });
  it("resets waiting only when a real step changes", () => {
    const next = updateActivity(updateActivity(undefined, "loading", 1000), "credentials", 30000);
    expect(next.since).toBe(30000);
    expect(activityWaiting(next, 31000)).toBe(false);
  });
  it("never calls required OTP or a saved PDF a stalled login", () => {
    for (const phase of ["otp", "email", "saved", "fields"] as const) expect(activityWaiting(updateActivity(undefined, phase, 0), 60000)).toBe(false);
  });
  it("rejects unknown portal commentary", () => {
    expect(isActivityPhase("credentials")).toBe(true);
    expect(isActivityPhase("untrusted page content")).toBe(false);
  });
});