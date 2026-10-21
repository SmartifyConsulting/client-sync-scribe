export const ACTIVITY_TEXT = {
  unlocking: "Unlocking saved login…",
  opening: "Opening portal in the background…",
  loading: "Waiting for the portal login screen…",
  credentials: "Login submitted · waiting for the insurer…",
  otp: "Waiting for your one-time PIN",
  email: "Waiting for email verification",
  verifying: "Verification submitted · waiting for the insurer…",
  waiting: "Waiting for the portal to finish signing in…",
  connected: "Signed in · checking for quote fields…",
  fields: "Quote fields detected · scenario submission is not automated yet",
  "no-fields": "Signed in · quote form not found on this screen",
  capturing: "Reading downloaded quote PDF…",
  saving: "Saving quote PDF to Working Window and Documents…",
  saved: "Quote PDF saved",
  failed: "Connection stopped",
  "pdf-error": "PDF could not be saved · upload the downloaded file instead",
} as const;
export type ActivityPhase = keyof typeof ACTIVITY_TEXT;
export type QuoteActivity = { phase: ActivityPhase; since: number; updated: number; detail?: string; history: { phase: ActivityPhase; at: number }[] };
export function updateActivity(previous: QuoteActivity | undefined, phase: ActivityPhase, now: number, detail?: string): QuoteActivity {
  const changed = previous?.phase !== phase;
  return { phase, since: changed ? now : previous.since, updated: now, detail,
    history: changed ? [...(previous?.history ?? []), { phase, at: now }].slice(-4) : previous.history };
}
export function activityWaiting(activity: QuoteActivity, now: number) {
  return ["unlocking", "opening", "loading", "credentials", "verifying", "waiting", "capturing", "saving", "connected"].includes(activity.phase) && now - activity.since >= 30000;
}
export function isActivityPhase(value: unknown): value is ActivityPhase {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ACTIVITY_TEXT, value);
}