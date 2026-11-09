import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addonInstalled, OtpDialog, type Challenge } from "./InsurerLogin";
import { CompanionSetup } from "./CompanionSetup";
import { recordPortalConnection } from "./portalLoginStatus";
import { toast } from "sonner";
import { useCompanionVersion } from "./companionDetection";
import { companionVersionCurrent } from "./companionRelease";
import { LOGIN_TEST_STAGES, loginProgressStage, loginTimeoutExplanation, type LoginTestStage, type LoginTestEvent } from "./loginTestDiagnostics";

type Result = { state: "testing" | "verification" | "success" | "error" | "unknown" | "stopped"; message: string };

/** Tests the open credential editor's values, without saving or requesting quotes. */
export function CredentialLoginTest({ integrationId, provider, username, idNumber, password, pin, portalUrl, disabled = false }: {
  integrationId: string; provider: string; username: string; idNumber?: string; password: string; pin?: string; portalUrl: string; disabled?: boolean;
}) {
  const loginIdentifier = idNumber ?? username;
  const [result, setResult] = useState<Result | null>(null);
  const installedVersion=useCompanionVersion();
  const [setup, setSetup] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [history, setHistory] = useState<LoginTestEvent[]>([]);
  const lastStage = useRef<LoginTestStage>("requested");
  const lastResponse = useRef<number | null>(null);
  const attempt = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const stopTimer = () => { if (timer.current) clearTimeout(timer.current); };
  const record = (stage: LoginTestStage) => {
    lastStage.current = stage;
    setHistory(events => events.at(-1)?.stage === stage ? events : [...events, { stage, at: Date.now() }].slice(-16));
  };

  useEffect(() => {
    attempt.current = null;
    setResult(null);
    setChallenge(null);
    setHistory([]);
    lastStage.current = "requested";
    lastResponse.current = null;
    stopTimer();
    return stopTimer;
  }, [integrationId, username, idNumber, password, pin, portalUrl]);

  useEffect(() => {
    const receive = (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== window || e.origin !== location.origin || d?.source !== "holarc-extension" ||
        !attempt.current || d.workflowId !== attempt.current || d.insurer !== provider) return;
      if (d.type === "insurer-login-progress") {
        lastResponse.current = Date.now();
        if (d.phase === "xplan-verification") {
          record("xplan-verification");
          stopTimer();
          setResult({ state: "verification", message: "Xplan is asking for a Security Code. Finish verification in the open Xplan tab." });
          return;
        }
        const stage = loginProgressStage(d.phase);
        if (stage) record(stage);
        else if (lastStage.current === "requested") record("acknowledged");
      }
      if (d.type === "insurer-challenge" && ["otp", "email"].includes(d.method)) {
        lastResponse.current = Date.now();
        record(d.method);
        stopTimer();
        setResult({ state: "verification", message: "Verification required. Complete the provider's OTP or email check to finish the test." });
        setChallenge({ insurer: provider, method: d.method, hint: d.hint });
      }
      if (d.type === "insurer-login-result") {
        attempt.current = null;
        // The app-wide recorder also handles results after this editor closes.
        lastResponse.current = Date.now();
        record(d.ok === true ? "connected" : "failed");
        stopTimer();
        setChallenge(null);
        setResult(d.ok === true
          ? { state: "success", message: "Login successful — a signed-in portal was recognised. If you were already signed in, this confirms access but does not verify the entered password." }
          : { state: "error", message: typeof d.message === "string" ? d.message : "Login could not be confirmed. Check the provider's portal." });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [provider, integrationId]);

  const waitForResult = () => {
    stopTimer();
    timer.current = setTimeout(() => {
      if(attempt.current&&companionVersionCurrent(installedVersion,"1.7.1"))window.postMessage({source:"holarc",type:"insurer-stop",connectionAttemptId:attempt.current,workflowId:attempt.current,insurer:provider},location.origin);
      attempt.current = null;
      setChallenge(null);
      const explanation = loginTimeoutExplanation(lastStage.current);
      record("timeout");
      void recordPortalConnection(integrationId, "unconfirmed").catch(() => toast.error("The connection result could not be saved."));
      setResult({ state: "unknown", message: explanation });
    }, 90_000);
  };
  const test = () => {
    if (integrationId === "astute" && !/^\d{4}$/.test(pin ?? "")) {
      setResult({ state: "error", message: "Enter Astute’s four-digit PIN before testing." });
      return;
    }
    if (!addonInstalled()) { setSetup(true); return; }
    try {
      const url = new URL(portalUrl);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch { setResult({ state: "error", message: "Enter a valid HTTPS portal URL without embedded login details." }); return; }
    attempt.current = `credential-test:${integrationId}:${crypto.randomUUID()}`;
    setHistory([]);
    lastResponse.current = null;
    record("requested");
    setResult({ state: "testing", message: "Testing these credentials in the provider's portal…" });
    waitForResult();
    window.postMessage({ source: "holarc", type: "insurer-login", connectionAttemptId: attempt.current, integrationId, workflowId: attempt.current,
      insurer: provider, loginUrl: portalUrl, password, ...(idNumber === undefined ? { username } : { idNumber: idNumber.trim() }),
      ...(integrationId === "astute" ? { pin } : {}) }, location.origin);
  };
  const verifying = result?.state === "verification";
  const stop = () => {
    if(!companionVersionCurrent(installedVersion,"1.7.1")){setSetup(true);toast.error("Update to Companion v1.7.1 to enable Stop. Close the insurer portal tab to stop an older version.");return;}
    const request=attempt.current;attempt.current=null;stopTimer();setChallenge(null);record("stopped");
    setResult({state:"stopped",message:"Stopped. No further attempts will be made. The portal remains open."});
    if(request)window.postMessage({source:"holarc",type:"insurer-stop",connectionAttemptId:request,workflowId:request,insurer:provider},location.origin);
  };
  return <div className="border-t border-border pt-3">
    <div role="group" aria-label="Credential login test" className="flex items-start gap-3">
    <Button variant="outline" size="sm" className="shrink-0" title="Test entered credentials without saving or requesting quotes. Sign out of the provider first to verify a changed password. Requires the Companion." disabled={disabled || !loginIdentifier.trim() || !password || result?.state === "testing" || verifying} onClick={test}>
      {result?.state === "testing" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}{result?.state === "testing" ? "Testing…" : "Test login"}
    </Button>
    {(result?.state === "testing" || verifying) && <Button variant="outline" size="sm" onClick={stop}>Stop</Button>}
    <div className="min-w-0 flex-1 pt-1.5">
    {!result && (!loginIdentifier.trim() || !password) && <p className="text-xs text-muted-foreground">{idNumber === undefined ? "Enter a username and password to test." : "Enter your ID or passport number and password to test."}</p>}
    {result && <p role="status" className={`text-xs break-words ${result.state === "error" ? "text-destructive" : result.state === "success" ? "text-emerald-700" : "text-muted-foreground"}`}>{result.state === "testing" ? LOGIN_TEST_STAGES[lastStage.current] : result.message}</p>}
    {verifying && !challenge && lastStage.current !== "xplan-verification" && <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { attempt.current = null; setResult(null); }}>Start a new test</Button>}
    </div>
    </div>
    {history.length > 0 && <details open={result?.state === "unknown" || result?.state === "error"} className="mt-2 text-xs">
      <summary className="cursor-pointer font-medium text-muted-foreground">Test history</summary>
      <ol aria-label="Login test history" className="mt-2 space-y-1 text-muted-foreground">
        {history.map(event => <li key={`${event.at}-${event.stage}`}><time>{new Date(event.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time> · {LOGIN_TEST_STAGES[event.stage]}</li>)}
      </ol>
      <p className="mt-2 text-muted-foreground">{lastResponse.current ? `Last Companion response: ${new Date(lastResponse.current).toLocaleTimeString("en-ZA")}` : "No Companion response received for this test."}</p>
    </details>}
    <CompanionSetup open={setup} onClose={() => setSetup(false)} onReady={test} />
    <OtpDialog challenge={challenge} onClose={() => setChallenge(null)} onStop={stop} onSubmit={value => {
      if (!attempt.current || !challenge) return;
      window.postMessage({ source: "holarc", type: challenge.method === "otp" ? "insurer-otp" : "insurer-email-check",
        workflowId: attempt.current, insurer: provider, ...(challenge.method === "otp" ? { otp: value } : {}) }, location.origin);
      setChallenge(null);
      record("verifying");
      setResult({ state: "testing", message: "Verification submitted — waiting for the provider…" });
      waitForResult();
    }} />
  </div>;
}
