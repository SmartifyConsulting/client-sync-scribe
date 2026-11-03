import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addonInstalled, OtpDialog, type Challenge } from "./InsurerLogin";
import { CompanionSetup } from "./CompanionSetup";

type Result = { state: "testing" | "verification" | "success" | "error" | "unknown"; message: string };

/** Tests the open credential editor's values, without saving or requesting quotes. */
export function CredentialLoginTest({ integrationId, provider, username, password, portalUrl, disabled = false }: {
  integrationId: string; provider: string; username: string; password: string; portalUrl: string; disabled?: boolean;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [setup, setSetup] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const attempt = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const stopTimer = () => { if (timer.current) clearTimeout(timer.current); };

  useEffect(() => {
    attempt.current = null;
    setResult(null);
    setChallenge(null);
    stopTimer();
    return stopTimer;
  }, [integrationId, username, password, portalUrl]);

  useEffect(() => {
    const receive = (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== window || e.origin !== location.origin || d?.source !== "holarc-extension" ||
        !attempt.current || d.workflowId !== attempt.current || d.insurer !== provider) return;
      if (d.type === "insurer-challenge" && ["otp", "email"].includes(d.method)) {
        stopTimer();
        setResult({ state: "verification", message: "Verification required. Complete the provider's OTP or email check to finish the test." });
        setChallenge({ insurer: provider, method: d.method, hint: d.hint });
      }
      if (d.type === "insurer-login-result") {
        stopTimer();
        setChallenge(null);
        setResult(d.ok === true
          ? { state: "success", message: "Login successful — a signed-in portal was recognised. If you were already signed in, this confirms access but does not verify the entered password." }
          : { state: "error", message: typeof d.message === "string" ? d.message : "Login could not be confirmed. Check the provider's portal." });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [provider]);

  const waitForResult = () => {
    stopTimer();
    timer.current = setTimeout(() => {
      attempt.current = null;
      setChallenge(null);
      setResult({ state: "unknown", message: "Login not confirmed within 90 seconds. Check the provider's portal; this does not mean the password is incorrect." });
    }, 90_000);
  };
  const test = () => {
    if (!addonInstalled()) { setSetup(true); return; }
    try {
      const url = new URL(portalUrl);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch { setResult({ state: "error", message: "Enter a valid HTTPS portal URL without embedded login details." }); return; }
    attempt.current = `credential-test:${integrationId}:${crypto.randomUUID()}`;
    setResult({ state: "testing", message: "Testing these credentials in the provider's portal…" });
    waitForResult();
    window.postMessage({ source: "holarc", type: "insurer-login", workflowId: attempt.current,
      insurer: provider, loginUrl: portalUrl, username, password }, location.origin);
  };
  const verifying = result?.state === "verification";
  return <div className="border-t border-border pt-3">
    <div role="group" aria-label="Credential login test" className="flex items-start gap-3">
    <Button variant="outline" size="sm" className="shrink-0" title="Test entered credentials without saving or requesting quotes. Sign out of the provider first to verify a changed password. Requires the Companion." disabled={disabled || !username.trim() || !password || result?.state === "testing" || verifying} onClick={test}>
      {result?.state === "testing" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}{result?.state === "testing" ? "Testing…" : "Test login"}
    </Button>
    <div className="min-w-0 flex-1 pt-1.5">
    {!result && (!username.trim() || !password) && <p className="text-xs text-muted-foreground">Enter a username and password to test.</p>}
    {result && result.state !== "testing" && <p role="status" className={`text-xs break-words ${result.state === "error" ? "text-destructive" : result.state === "success" ? "text-emerald-700" : "text-muted-foreground"}`}>{result.message}</p>}
    {verifying && !challenge && <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { attempt.current = null; setResult(null); }}>Start a new test</Button>}
    </div>
    </div>
    <CompanionSetup open={setup} onClose={() => setSetup(false)} onReady={test} />
    <OtpDialog challenge={challenge} onClose={() => setChallenge(null)} onSubmit={value => {
      if (!attempt.current || !challenge) return;
      window.postMessage({ source: "holarc", type: challenge.method === "otp" ? "insurer-otp" : "insurer-email-check",
        workflowId: attempt.current, insurer: provider, ...(challenge.method === "otp" ? { otp: value } : {}) }, location.origin);
      setChallenge(null);
      setResult({ state: "testing", message: "Verification submitted — waiting for the provider…" });
      waitForResult();
    }} />
  </div>;
}
