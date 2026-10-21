import { describe, it, expect } from "vitest";
import { startJobs, setStatus, markCaptured, isStalled, needsRetry } from "./quoteJobs";

describe("numbered quote jobs", () => {
  it("creates Quote 1-3 per insurer independently", () => {
    const j = startJobs(startJobs({}, "Discovery", 3, 0), "Momentum", 3, 0);
    expect(j.Discovery.map((x) => x.n)).toEqual([1, 2, 3]);
    expect(j.Momentum).toHaveLength(3);
  });
  it("a saved PDF completes only the earliest in-progress quote", () => {
    let j = startJobs({}, "Discovery", 3, 0);
    j = setStatus(j, "Discovery", 1, "generating", 1);
    j = setStatus(j, "Discovery", 2, "generating", 1);
    j = markCaptured(j, "Discovery", 2);
    expect(j.Discovery.map((x) => x.status)).toEqual(["captured", "generating", "queued"]);
  });
  it("retrying keeps captured quotes and only resets the chosen one", () => {
    let j = startJobs({}, "Discovery", 3, 0);
    j = setStatus(j, "Discovery", 1, "captured", 1);
    j = setStatus(j, "Discovery", 3, "failed", 1);
    j = startJobs(j, "Discovery", 3, 5, [3]);
    expect(j.Discovery.map((x) => x.status)).toEqual(["captured", "queued", "queued"]);
  });
  it("flags a quote stuck 90 seconds as needing retry", () => {
    const j = setStatus(startJobs({}, "Momentum", 3, 0), "Momentum", 2, "generating", 1000).Momentum[1];
    expect(isStalled(j, 90_999)).toBe(false);
    expect(isStalled(j, 91_000)).toBe(true);
    expect(needsRetry(j, 91_000)).toBe(true);
  });
});
