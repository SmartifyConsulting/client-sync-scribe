/** Numbered quote jobs: one per option (Quote 1 = Option A …) per insurer, each tracked on its own
 *  so a slow or failed scenario never holds back the others. Status only advances on Companion
 *  reports or a successfully saved PDF. */
export type ScenarioStatus = "queued" | "submitting" | "generating" | "captured" | "calculated" | "no-fields" | "failed" | "stopped";
export type ScenarioJob = { n: number; status: ScenarioStatus; since: number; detail?: string; pdfReceived?: boolean; settingsHash?: string };
export type QuoteJobs = Record<string, ScenarioJob[]>;

/** A blocked batch cannot advance its queued options. Also repairs saved older batches. */
export function releaseBlockedQueues(jobs: QuoteJobs): QuoteJobs {
  return Object.fromEntries(Object.entries(jobs).map(([insurer, list]) => [insurer,
    list.some(j => j.status === "no-fields" || j.status === "failed" || j.status === "calculated") &&
    !list.some(j => j.status === "submitting" || j.status === "generating")
      ? list.map(j => j.status === "queued" ? { ...j, status: "stopped" as const, detail: list.some(previous => previous.status === "calculated") ? "Not started: the previous option's PDF still needs to be filed." : "Not started: an earlier option blocked this batch." } : j)
      : list
  ]));
}

export const STALL_MS = 90_000;
export const SCENARIO_TEXT: Record<ScenarioStatus, string> = {
  queued: "Queued",
  submitting: "Entering options in the portal",
  generating: "Waiting for the insurer's PDF",
  captured: "PDF saved",
  calculated: "Quote calculated · PDF not filed",
  "no-fields": "Quote fields not found — enter in portal or upload",
  failed: "Failed",
  stopped: "Stopped",
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
  return releaseBlockedQueues({ ...jobs, [insurer]: list.map((j) => (j.n !== n || j.status === "captured" ? j : { ...j, n, status, since: j.status === status ? j.since : now, detail })) });
};

/** Checkpoints reflect acknowledgements, never a timer or assumed insurer calculation. */
export function quoteCheckpoints(job: ScenarioJob) {
  const started = ["submitting", "generating", "calculated", "no-fields", "failed", "captured"].includes(job.status);
  return [
    { label: "Connected", done: started || job.status === "queued" },
    { label: "Request started", done: started },
    { label: "PDF received", done: job.pdfReceived === true || job.status === "captured" },
    { label: "Saved", done: job.status === "captured" },
  ];
}

/** A saved PDF completes the earliest scenario still in progress for that insurer. */
export const markCaptured = (jobs: QuoteJobs, insurer: string, now: number): QuoteJobs => {
  const list = jobs[insurer];
  const next = list?.find((j) => j.status === "generating") ?? list?.find((j) => j.status === "submitting");
  return next ? setStatus(jobs, insurer, next.n, "captured", now) : jobs;
};

export const isStalled = (j: ScenarioJob, now: number) => (j.status === "submitting" || j.status === "generating") && now - j.since >= STALL_MS;
export const needsRetry = (j: ScenarioJob, now: number) => j.status === "failed" || j.status === "no-fields" || isStalled(j, now);
