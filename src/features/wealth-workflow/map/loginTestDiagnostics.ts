export const LOGIN_TEST_STAGES = {
  requested: "Login test sent to Companion",
  acknowledged: "Companion received the test request",
  opening: "Companion is opening the provider portal",
  loading: "Portal is loading or its login form has not been recognised",
  credentials: "Companion attempted to submit the login",
  waiting: "Waiting for the provider to finish signing in",
  otp: "Provider requested a one-time PIN",
  "xplan-verification": "Xplan requested a Security Code in its portal",
  email: "Provider requested email verification",
  verifying: "Verification sent to Companion",
  connected: "Companion recognised a signed-in portal",
  failed: "Companion reported that the login could not finish",
  timeout: "Test timed out without a final result",
  stopped: "Stopped by you — no further attempts",
} as const;
export type LoginTestStage = keyof typeof LOGIN_TEST_STAGES;
export type LoginTestEvent = { stage: LoginTestStage; at: number };
export const loginProgressStage = (phase: unknown): LoginTestStage | null =>
  typeof phase === "string" && ["opening", "loading", "credentials", "waiting", "verifying"].includes(phase)
    ? phase as LoginTestStage : null;

export function loginTimeoutExplanation(lastStage: LoginTestStage) {
  if (lastStage === "requested") return "No response from the Companion. Refresh Holarc and check that the extension is enabled with access to this site.";
  if (["acknowledged", "opening", "loading"].includes(lastStage)) return "The Companion responded, but did not report a login submission. Check the portal for a loading page, redirect or login form the Companion did not recognise.";
  if (["credentials", "waiting", "verifying", "otp", "email"].includes(lastStage)) return "The login or verification was attempted, but no signed-in confirmation returned. Check the portal for verification, a security notice, or a signed-in page the Companion did not recognise.";
  return "No final confirmation returned. Check the provider portal and the last reported step below.";
}
