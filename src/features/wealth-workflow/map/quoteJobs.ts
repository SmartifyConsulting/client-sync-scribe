/** Numbered quote jobs: one per option (Quote 1 = Option A …) per insurer, each tracked on its own
 *  so a slow or failed scenario never holds back the others. Status only advances on Companion
 *  reports or a successfully saved PDF. */
export type ScenarioStatus = "queued" | "submitting" | "generating" | "captured" | "no-fields" | "failed";
export type ScenarioJob = { n: number; status: ScenarioStatus; since: number; detail?: string };
export type QuoteJobs = Record<string, ScenarioJob[]>;

export const STALL_MS = 90_000;
export const SCENARIO_TEXT: Record<ScenarioStatus, string> = {
  queued: "Queued",
  submitting: "Entering options in the portal",
  generating: "Waiting for the insurer's PDF",
  captured: "PDF saved",
  "no-fields": "Quote fields not found — enter in portal or upload",
  failed: "Failed",
};

export const startJobs = (jobs: QuoteJobs, insurer: string, count: number, now: number, only?: number[]): QuoteJobs => {
  const prev = jobs[insurer] ?? [];
  const list = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const old = prev.find((j) => j.n === n);
    if (old && (old.status === "captured" || (only && !only.includes(n)))) return old;
    return { n, status: "queued" as const, since: now };
  });
  return { ...jobs, [insurer]: list };
};

export const setStatus = (jobs: QuoteJobs, insurer: string, n: number, status: ScenarioStatus, now: number, detail?: string): QuoteJobs => {
  const list = jobs[insurer];
  if (!list) return jobs;
  return { ...jobs, [insurer]: list.map((j) => (j.n !== n || j.status === "captured" ? j : { n, status, since: j.status === status ? j.since : now, detail })) };
};

/** A saved PDF completes the earliest scenario still in progress for that insurer. */
export const markCaptured = (jobs: QuoteJobs, insurer: string, now: number): QuoteJobs => {
  const list = jobs[insurer];
  const next = list?.find((j) => j.status === "generating") ?? list?.find((j) => j.status === "submitting");
  return next ? setStatus(jobs, insurer, next.n, "captured", now) : jobs;
};

export const isStalled = (j: ScenarioJob, now: number) => (j.status === "submitting" || j.status === "generating") && now - j.since >= STALL_MS;
export const needsRetry = (j: ScenarioJob, now: number) => j.status === "failed" || j.status === "no-fields" || isStalled(j, now);
