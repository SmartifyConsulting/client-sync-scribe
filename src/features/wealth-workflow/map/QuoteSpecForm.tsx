import { useCompanionInstalled, useCompanionVersion } from "./companionDetection";
import { useCompanionRelease, companionVersionCurrent } from "./companionRelease";
import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, Pencil, Check } from "lucide-react";
import { QuoteOptionReference } from "./QuoteOptionReference";
import { quoteReference, withQuoteReference } from "./quoteReferences";
import { usePublishQuoteInsurers } from "./QuoteInsurerSelection";
import { SegmentedProgress } from "./SegmentedProgress";
import { insurerColor } from "./insurerColors";
import { insurerFields, insurerKey } from "./insurerDictionary";
import { LoginRing, LOGIN_TEXT, OtpDialog, ProtectorDialog, addonInstalled, downloadAddon, type Challenge, type LoginState } from "./InsurerLogin";
import { CompanionSetup } from "./CompanionSetup";
import { QuotePdfCapture } from "./QuotePdfCapture";
import { DiscoveryScreenScan } from "./DiscoveryScreenScan";
import { InsurerActivity } from "./InsurerActivity";
import { isActivityPhase, updateActivity, type QuoteActivity, type ActivityPhase } from "./quoteActivity";
import { releaseBlockedQueues, startJobs, setStatus, quoteCheckpoints, isStalled, SCENARIO_TEXT, type QuoteJobs } from "./quoteJobs";
import { buildPortalScenarios } from "./portalPayload";
import { QuoteJobsPanel } from "./QuoteJobsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPES, variationComplete } from "./quoteSpec";
import { groupDigits } from "./money";
import { DEFAULT_PARAMS, type NeedsParams, defaultVariations, productsFromNeeds, withAmount } from "./needsProducts";

const db = supabase as any;
type Plan = Record<string, Record<string, any>[]>; // product -> variations

/** Saved specs were one product + array; newer ones are product -> variations. */
const toPlan = (spec: any): Plan =>
  Array.isArray(spec?.variations) ? { [spec.product_type]: spec.variations } : (spec?.variations ?? {});

/** Step 4: insurers first (they set the tabs), then the products the needs analysis asks for,
 *  each pre-filled with three graded options ready for the WM to adjust. */
export function QuoteSpecForm({ workflowId, isWM, clientId }: { workflowId: string; isWM: boolean; clientId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const companionInstalled = useCompanionInstalled();
  const installedVersion = useCompanionVersion();
  const companionRelease = useCompanionRelease();
  const { data: spec, isLoading } = useQuery({
    queryKey: ["wealth-quote-spec", workflowId],
    queryFn: async () => (await db.from("wealth_quote_specs").select("*").eq("workflow_id", workflowId).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const { data: fin, isFetched: finReady } = useQuery({
    queryKey: ["fin-needs", clientId], enabled: !!clientId,
    queryFn: async () => (await db.from("client_financial_profiles").select("cash_flow,assets_liabilities,risk_portfolio").eq("patient_id", clientId).maybeSingle()).data,
  });
  const { data: quoteClient } = useQuery({
    queryKey: ["quote-client-inputs", clientId], enabled: !!clientId && isWM,
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.from("clients").select("title,first_name,last_name,id_passport_number,email,dob,smoker,highest_education,occupation,marital_status").eq("id", clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: insurerRows = [] } = useQuery({
    queryKey: ["quote-insurer-rows", user?.id], enabled: !!user && isWM,
    queryFn: async () => {
      if (!user) return [];
      const [cat, creds] = await Promise.all([
        db.from("app_integrations_catalog").select("id,name,portal_url").eq("category", "insurance").eq("is_active", true).order("display_order"),
        supabase.functions.invoke("manage-broker-credentials", { body: { action: "list" } }),
      ]);
      const statuses = creds.data?.credentials ?? [];
      const ready = new Set(statuses.filter((c: any) => c.status === "configured" && c.is_enabled).map((c: any) => c.integration_id));
      return (cat.data ?? []).filter((c: any) => ready.has(c.id)).map((c: any) => ({ ...c, portal_url: statuses.find((s: any) => s.integration_id === c.id)?.portal_url || c.portal_url })) as { id: string; name: string; portal_url: string | null }[];
    },
  });

  // Older cached entries were {name, ready}; always render plain names.
  const insurers: string[] = (insurerRows as any[]).map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean);

  const [plan, setPlan] = useState<Plan>({});
  const [chosen, setChosen] = useState<string[]>([]);
  usePublishQuoteInsurers(workflowId, chosen);
  const [tab, setTab] = useState("");
  const resumeKey = `holarc-quote-position-${user?.id}-${workflowId}`;
  const resumeChecked = useRef(new Set<string>());
  const resumeRequests = useRef(new Set<string>());
  const [resumePending, setResumePending] = useState(false);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(resumeKey) || "null"); if (typeof saved?.tab === "string") setTab(saved.tab); } catch { /* No saved position. */ }
  }, [resumeKey]);
  useEffect(() => {
    if (!tab) return;
    try {
      const saved = JSON.parse(localStorage.getItem(resumeKey) || "{}");
      localStorage.setItem(resumeKey, JSON.stringify({ ...saved, tab }));
    } catch { /* Storage can be disabled. */ }
  }, [tab, resumeKey]);
  const [busy, setBusy] = useState(false);
  const pendingConnections = useRef(new Set<string>());
  const stoppedConnections = useRef(new Set<string>());
  const connectionAttempts = useRef<Record<string, string | null>>({});
  const reviewSection = useRef<HTMLElement>(null);
  const pendingReview = useRef<string | null>(null);
  const visibleInsurer = useRef("");
  const [login, setLogin] = useState<Record<string, LoginState>>({});
  const [activity, setActivity] = useState<Record<string, QuoteActivity>>({});
  const recordActivity = (insurer: string, phase: ActivityPhase, detail?: string) => setActivity((s) => ({ ...s, [insurer]: updateActivity(s[insurer], phase, Date.now(), detail) }));
  const JOBS_KEY = `holarc-quote-jobs-${workflowId}`;
  const [jobs, setJobs] = useState<QuoteJobs>(() => { try { return releaseBlockedQueues(JSON.parse(localStorage.getItem(JOBS_KEY) || "{}")); } catch { return {}; } });
  useEffect(() => { localStorage.setItem(JOBS_KEY, JSON.stringify(jobs)); }, [jobs, JOBS_KEY]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [adding, setAdding] = useState("");
  const [params, setParams] = useState<NeedsParams>(DEFAULT_PARAMS);
  const needs = productsFromNeeds(fin, params);
  const formulaFor = (p: string) => needs.find((n) => n.product === p)?.formula;

  useEffect(() => {
    if (isLoading) return;
    if (spec) { setPlan(toPlan(spec)); setChosen(spec.insurers ?? []); return; }
    if (clientId && !finReady) return;
    setPlan(Object.fromEntries(productsFromNeeds(fin).map(({ product, amount }) => [product, defaultVariations(product, amount)])));
  }, [spec, isLoading, fin, finReady, clientId]);

  // Messages from the broker-side add-on driving the insurer login.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== window || e.origin !== window.location.origin || d?.source !== "holarc-extension" || d.workflowId !== workflowId || typeof d.insurer !== "string") return;
      if(d.connectionAttemptId&&connectionAttempts.current[d.insurer]&&connectionAttempts.current[d.insurer]!==d.connectionAttemptId)return;
      if (d.type === "insurer-stopped") { recordActivity(d.insurer,"stopped"); setLogin(s=>({...s,[d.insurer]:"stopped"})); return; }
      if (stoppedConnections.current.has(d.insurer)) return;
      if (d.type === "insurer-login-progress" && isActivityPhase(d.phase)) recordActivity(d.insurer, d.phase);
      if (d.type === "insurer-scan-result" && d.ok && ["fields", "no-fields"].includes(d.scan?.state)) recordActivity(d.insurer, d.scan.state);
      if (d.type === "insurer-pdf") {
        recordActivity(d.insurer, "saving");
        if (Number.isInteger(d.n)) setJobs(previous => ({ ...previous, [d.insurer]: (previous[d.insurer] ?? []).map(job => job.n === d.n ? { ...job, pdfReceived: true } : job) }));
      }
      if (d.type === "insurer-pdf-error") recordActivity(d.insurer, "pdf-error");
      if (d.type === "insurer-quote-status" && Number.isInteger(d.n) && ["submitting", "generating", "no-fields", "failed"].includes(d.status))
        setJobs((j) => setStatus(j, d.insurer, d.n, d.status, Date.now(), typeof d.detail === "string" ? d.detail.slice(0, 160) : undefined));
      if (d.type === "insurer-login-progress") setLogin((s) => ({ ...s, [d.insurer]: d.state }));
      if (d.type === "insurer-challenge") {
        recordActivity(d.insurer, d.method === "email" ? "email" : "otp");
        setLogin((s) => ({ ...s, [d.insurer]: "challenge" }));
        setChallenge({ insurer: d.insurer, method: d.method === "email" ? "email" : "otp", hint: d.hint });
      }
      if (d.type === "insurer-otp-result" || d.type === "insurer-login-result") {
        if (d.ok) try {
          const saved = JSON.parse(localStorage.getItem(resumeKey) || "{}");
          localStorage.setItem(resumeKey, JSON.stringify({ ...saved, connected: { ...saved.connected, [d.insurer]: true } }));
        } catch { /* Storage can be disabled. */ }
        if (d.type === "insurer-login-result" && pendingConnections.current.delete(d.insurer)) {
          const provider = insurerRows.find(row => row.name === d.insurer);
          // Connection metadata is recorded by the app-wide CompanionCoordinator.
        }
        recordActivity(d.insurer, d.ok ? "connected" : "failed", d.ok ? undefined : d.message);
        setLogin((s) => ({ ...s, [d.insurer]: d.ok ? "connected" : "failed" }));
        if (d.ok) { if (visibleInsurer.current === d.insurer) pendingReview.current = d.insurer; setChallenge((c) => (c?.insurer === d.insurer ? null : c)); }
        else toast({ title: `${d.insurer} login failed`, description: d.message, variant: "destructive" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [workflowId, insurerRows, resumeKey]);

  /** Opening a tab unlocks the saved login and asks the add-on to open and log into the insurer portal. */
  const TOKEN_KEY = "holarc-cred-token";
  const [askFor, setAskFor] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [portalEdit, setPortalEdit] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState("");
  const getToken = () => {
    try { const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null"); return t && t.uid === user?.id && t.exp > Date.now() ? t.token as string : null; } catch { return null; }
  };
  const startLogin = async (ins: string, token: string) => {
    const row = (insurerRows as any[]).find((r) => r?.name === ins);
    if (!row?.id) return;
    const attemptId=crypto.randomUUID();
    connectionAttempts.current[ins]=attemptId;
    stoppedConnections.current.delete(ins);
    setLogin((s) => ({ ...s, [ins]: "connecting" }));
    recordActivity(ins, "unlocking");
    const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "reveal", integrationId: row.id, token } });
    if(connectionAttempts.current[ins]!==attemptId)return;
    if (error || data?.error) {
      sessionStorage.removeItem(TOKEN_KEY);
      setLogin((s) => ({ ...s, [ins]: "failed" }));
      recordActivity(ins, "failed", "Saved login could not be unlocked. Try your Password Protector again.");
      return toast({ title: `Couldn't unlock the ${ins} login`, description: data?.error ?? "Please try again.", variant: "destructive" });
    }
    const f = data.fields ?? {};
    pendingConnections.current.add(ins);
    window.postMessage({ source: "holarc", type: "insurer-login", connectionAttemptId: attemptId, integrationId: row.id, insurer: ins, workflowId, loginUrl: f.portal_url || row.portal_url,
      username: f.username ?? data.username, password: f.password, autoReconnect: true, ownerId: user?.id }, window.location.origin);
  };
  const openTab = (ins: string) => {
    setTab(ins);
    if (login[ins] === "connected" || login[ins] === "connecting" || login[ins] === "challenge" || login[ins] === "stopped") return;
    if (!(companionInstalled || addonInstalled())) { setSetupOpen(true); return setLogin((s) => ({ ...s, [ins]: "no-addon" })); }
    const token = getToken();
    if (token) startLogin(ins, token); else setAskFor(ins);
  };
  const unlock = async (passcode: string) => {
    setUnlocking(true);
    const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "reauth", passcode } });
    setUnlocking(false);
    if (error || data?.error) return toast({ title: data?.error ?? "Incorrect Password Protector", variant: "destructive" });
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: data.token, uid: user?.id, exp: Date.now() + Math.min(data.expiresInMs ?? 900000, 900000) }));
    const ins = askFor; setAskFor(null);
    if (ins) startLogin(ins, data.token);
  };
  const savePortal = async () => {
    const token = getToken();
    if (!token) { toast({ title: "Unlock saved insurer logins before editing the portal URL." }); setAskFor(portalEdit); return; }
    const row = insurerRows.find((r) => r.name === portalEdit);
    if (!row) return;
    try {
      const url = new URL(portalUrl);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("Enter a valid HTTPS portal URL without login details.");
      const revealed = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "reveal", integrationId: row.id, token } });
      if (revealed.error || revealed.data?.error) throw new Error("Please unlock again.");
      const saved = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "save", integrationId: row.id, token, username: revealed.data.username, fields: { ...revealed.data.fields, portal_url: portalUrl } } });
      if (saved.error || saved.data?.error) throw new Error(saved.data?.error ?? "Could not save portal URL.");
      qc.invalidateQueries({ queryKey: ["quote-insurer-rows"] });
      qc.invalidateQueries({ queryKey: ["broker-integration-credentials"] });
      setLogin((s) => ({ ...s, [row.name]: "failed" }));
      setPortalEdit(null);
      toast({ title: "Portal URL saved" });
    } catch (e) { toast({ title: e instanceof Error ? e.message : "Could not save portal URL.", variant: "destructive" }); }
  };

  /** Send each option (Quote 1 = Option A …) to the connected portal; values only, labelled by field name. */
  const submitScenarios = (ins: string, only?: number[]) => {
    if (login[ins] !== "connected") { toast({ title: `Connect ${ins} first.` }); return; }
    const prods = Object.keys(plan);
    const count = Math.max(...prods.map((p) => plan[p].length), 0);
    const scenarios = buildPortalScenarios(plan, ins, quoteClient).filter((s) => (!only || only.includes(s.n)) && jobs[ins]?.find((j) => j.n === s.n)?.status !== "captured");
    setJobs((j) => startJobs(j, ins, count, Date.now(), only));
    window.postMessage({ source: "holarc", type: "insurer-quote-submit", insurer: ins, workflowId, scenarios }, window.location.origin);
  };

  const submitChallenge = (value: string) => {
    if (!challenge || stoppedConnections.current.has(challenge.insurer)) return;
    window.postMessage({ source: "holarc", type: challenge.method === "otp" ? "insurer-otp" : "insurer-email-check", insurer: challenge.insurer, workflowId, otp: value }, window.location.origin);
    setLogin((s) => ({ ...s, [challenge.insurer]: "connecting" }));
    recordActivity(challenge.insurer, "verifying");
  };
  const stopConnection = (ins:string) => {
    if(!companionVersionCurrent(installedVersion,"1.7.1")){setSetupOpen(true);toast({title:"Update Companion to enable Stop",description:"Install v1.7.1 or later. For the older version, close its insurer portal tab to stop it."});return;}
    const connectionAttemptId=connectionAttempts.current[ins];
    connectionAttempts.current[ins]=null;
    stoppedConnections.current.add(ins); pendingConnections.current.delete(ins);
    setChallenge(c=>c?.insurer===ins?null:c);
    setAskFor(current=>current===ins?null:current);
    setLogin(s=>({...s,[ins]:"stopped"}));recordActivity(ins,"stopped");
    setJobs(current=>({...current,[ins]:(current[ins]||[]).map(j=>j.status==='captured'?j:{...j,status:"stopped",since:Date.now()})}));
    window.postMessage({source:"holarc",type:"insurer-stop",insurer:ins,workflowId,...(connectionAttemptId?{connectionAttemptId}:{})},location.origin);
  };

  /** Changing a formula input recalculates the suggested amount on all three options. */
  const applyParams = (next: NeedsParams) => {
    setParams(next);
    const fresh = productsFromNeeds(fin, next);
    setPlan((pl) => {
      const out = { ...pl };
      for (const n of fresh) if (out[n.product]) out[n.product] = withAmount(n.product, out[n.product], n.amount);
      return out;
    });
  };

  const products = Object.keys(plan);
  const activeTab = chosen.includes(tab) ? tab : chosen[0] ?? "";
  visibleInsurer.current = activeTab;
  const connected = login[activeTab] === "connected";
  // Saved position is a hint only: Companion must verify the existing portal.
  // A refresh must never replay login or quote submission for a saved session.
  useEffect(() => {
    if (!activeTab || !user?.id || !insurerRows.length || !companionInstalled || resumeChecked.current.has(activeTab)) return;
    let saved: any;
    try { saved = JSON.parse(localStorage.getItem(resumeKey) || "{}"); } catch { saved = {}; }
    const hadSession = !!saved.connected?.[activeTab];
    if (!hadSession && !companionVersionCurrent(installedVersion, "1.7.4")) { resumeChecked.current.add(activeTab); return; }
    const ins = activeTab;
    const row = insurerRows.find(r => r.name === ins);
    if (!row) return;
    resumeChecked.current.add(ins);
    resumeRequests.current.add(ins);
    setResumePending(true);
    setLogin(s => ({ ...s, [ins]: "connecting" }));
    recordActivity(ins, "waiting", "Checking your existing portal session…");
    const requestId = crypto.randomUUID();
    let finished = false;
    const finish = (state: string, attempt?: string) => {
      finished = true;
      resumeRequests.current.delete(ins);
      setResumePending(false);
      if (stoppedConnections.current.has(ins)) return;
      if (attempt) connectionAttempts.current[ins] = attempt;
      if (state === "connected") {
        try {
          const previous = JSON.parse(localStorage.getItem(resumeKey) || "{}");
          localStorage.setItem(resumeKey, JSON.stringify({ ...previous, connected: { ...previous.connected, [ins]: true } }));
        } catch { /* Storage can be disabled. */ }
        setLogin(s => ({ ...s, [ins]: "connected" })); recordActivity(ins, "connected");
      } else if (state === "missing" && !hadSession) {
        setLogin(s => { const next = { ...s }; delete next[ins]; return next; });
        setActivity(s => { const next = { ...s }; delete next[ins]; return next; });
      } else {
        setLogin(s => ({ ...s, [ins]: "failed" }));
        recordActivity(ins, "failed", state === "expired" || state === "missing" ? "Session expired—reconnect to continue. Saved quote progress has been kept." : "Could not verify the existing portal session. Update Companion to v1.7.4 or reconnect. Saved quote progress has been kept.");
      }
    };
    const onResume = (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== window || e.origin !== location.origin || d?.source !== "holarc-extension" || d.type !== "insurer-session-status-result" || d.requestId !== requestId || d.ownerId !== user.id || d.workflowId !== workflowId || d.insurer !== ins) return;
      clearTimeout(timer); window.removeEventListener("message", onResume); finish(d.state, d.connectionAttemptId);
    };
    const timer = window.setTimeout(() => { window.removeEventListener("message", onResume); finish("unknown"); }, 10000);
    window.addEventListener("message", onResume);
    window.postMessage({ source: "holarc", type: "insurer-session-status", requestId, workflowId, insurer: ins, integrationId: row.id, ownerId: user.id }, location.origin);
    return () => { clearTimeout(timer); window.removeEventListener("message", onResume); resumeRequests.current.delete(ins); if (!finished) resumeChecked.current.delete(ins); };
  }, [activeTab, user?.id, insurerRows.length, companionInstalled, installedVersion, resumeKey]);
  const quotesRunning = (jobs[activeTab] ?? []).some(job => ["queued", "submitting", "generating"].includes(job.status));
  useEffect(() => {
    if (!connected || pendingReview.current !== activeTab) return;
    pendingReview.current = null;
    // Scroll only for a new confirmed connection in the visible insurer tab.
    // Routine tab switches, field edits and background insurer results do not steal focus.
    reviewSection.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    reviewSection.current?.focus({ preventScroll: true });
  }, [activeTab, connected]);
  // Auto-connect the visible insurer (any insurer) when the 15-minute unlock is already active.
  useEffect(() => {
    if (!activeTab || !insurerRows.length || (login[activeTab] && login[activeTab] !== "no-addon") || !companionInstalled || resumePending || resumeRequests.current.has(activeTab)) return;
    try { if (JSON.parse(localStorage.getItem(resumeKey) || "{}").connected?.[activeTab]) return; } catch { /* No saved session. */ }
    setSetupOpen(false);
    const token = getToken();
    if (token) void startLogin(activeTab, token);
    else setLogin(s => { if (s[activeTab] !== "no-addon") return s; const next = { ...s }; delete next[activeTab]; return next; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, insurerRows.length, companionInstalled, resumePending]);
  const setVal = (p: string, i: number, k: string, val: any) =>
    setPlan((pl) => ({ ...pl, [p]: pl[p].map((x, j) => (j === i ? { ...x, [k]: val } : x)) }));
  const total = products.reduce((a, p) => a + plan[p].length, 0);
  const allComplete = products.length > 0 && products.every((p) => plan[p].every((v) => variationComplete(PRODUCT_TYPES[p] ?? [], v)));

  const save = async () => {
    setBusy(true);
    const row = { workflow_id: workflowId, product_type: products.join(" | "), variations: plan, insurers: chosen, updated_at: new Date().toISOString() };
    const { error } = spec ? await db.from("wealth_quote_specs").update(row).eq("id", spec.id) : await db.from("wealth_quote_specs").insert(row);
    setBusy(false);
    if (error) return toast({ title: "Couldn't save the quote plan", description: error.message, variant: "destructive" });
    toast({ title: "Quote plan saved", description: `${total} option(s) × ${chosen.length} insurer(s) = ${total * chosen.length} quotes to collect.` });
    qc.invalidateQueries({ queryKey: ["wealth-quote-spec", workflowId] });
  };


  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!isWM) return null;

  const label = "text-xs text-muted-foreground";
  const incompleteOptions = products.flatMap(p => plan[p].flatMap((v, i) =>
    variationComplete(PRODUCT_TYPES[p] ?? [], v) ? [] : [`${p} · Option ${String.fromCharCode(65 + i)}`]));
  return (
    <div className="space-y-4 text-xs leading-relaxed">
      <div>
        <h3 className="text-sm font-semibold">Prepare insurer quotes</h3>
        <p className={label}>Choose your insurers, review the options, then request and collect your quotes.</p>
      </div>

      <section className="frame p-3 space-y-3" aria-label="Choose insurers">
        <h4 className="text-xs font-semibold">Choose insurers</h4>
        {!insurers.length && <p className="text-[10px] text-muted-foreground">No saved insurer logins found.</p>}
        <div className="flex flex-wrap gap-1.5">
          {insurers.map((ins: string) => {
            const on = chosen.includes(ins);
            const c = "var(--insurer-badge)"; // badges stay orange; only tabs use legend colours
            return (
              <button key={ins} type="button" aria-pressed={on}
                onClick={() => setChosen((c) => (on ? c.filter((x) => x !== ins) : [...c, ins]))}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                style={on ? { background: `hsl(${c})`, borderColor: `hsl(${c})`, color: "hsl(var(--insurer-foreground))" } : { borderColor: `hsl(${c})`, color: `hsl(${c})` }}>
                {ins}
              </button>
            );
          })}
        </div>
      </section>

      {chosen.length > 0 && (
        <div className="space-y-2">
          <p className={label}>Select an insurer to view its connection and quote options.</p>
          <div role="tablist" aria-label="Insurer workspaces" className="flex flex-wrap items-center gap-2 border-b border-border pb-3" style={{ borderColor: activeTab ? `hsl(${insurerColor(activeTab)})` : undefined }}>
            {chosen.map((t) => {
              const c = insurerColor(t);
              const on = activeTab === t;
              return (
                <button key={t} role="tab" aria-selected={on} onClick={() => openTab(t)}
                  className={cn("flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                    on ? "shadow-sm ring-2 ring-offset-2 ring-primary/30" : "opacity-75 hover:opacity-100")}
                  style={{ background: `hsl(${c})`, color: "hsl(var(--insurer-foreground))" }}>
                  {t}
                  <LoginRing state={login[t]} />
                </button>
              );
            })}
          </div>
          <section className={cn("frame p-3", connected && "quote-step-done")} aria-label="Connect insurer">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-4">
          <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2"><span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold", connected ? "bg-success text-success-foreground" : "bg-primary/10 text-primary")}>{connected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : "1"}</span><h4 className="font-semibold">Connect to {activeTab}</h4>{connected && <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-success-foreground">Done</span>}</div>
          <InsurerActivity insurer={activeTab} activity={activity[activeTab]}
            onStop={()=>stopConnection(activeTab)} canStop={["connecting","challenge","connected"].includes(login[activeTab])||(jobs[activeTab]||[]).some(j=>["queued","submitting","generating"].includes(j.status))}
            idleText={!(companionInstalled || addonInstalled()) ? `Update to the latest Companion v${companionRelease.version}` : getToken() ? "Connecting automatically…" : "Unlock your saved logins to connect in the background"}
            idleAction={!(companionInstalled || addonInstalled()) ? "Update Companion" : getToken() ? "Connect" : "Unlock & connect"}
            onRetry={() => { if (!(companionInstalled || addonInstalled())) { setSetupOpen(true); return; } const token = getToken(); if (token) void startLogin(activeTab, token); else setAskFor(activeTab); }} />
          {login[activeTab] === "no-addon" && (
            <p className={label}>{LOGIN_TEXT[login[activeTab]]}
              {login[activeTab] === "no-addon" && <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => setSetupOpen(true)}>Update to Companion v{companionRelease.version}</Button>}
            </p>
          )}
          <OtpDialog challenge={challenge} onClose={() => setChallenge(null)} onStop={()=>{if(challenge)stopConnection(challenge.insurer);}} onSubmit={submitChallenge} />
          <ProtectorDialog open={!!askFor} busy={unlocking} onClose={() => setAskFor(null)} onSubmit={unlock} />
          <CompanionSetup open={setupOpen} onClose={() => setSetupOpen(false)} onReady={() => openTab(activeTab)} />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                const value = insurerRows.find(r => r.name === activeTab)?.portal_url;
                try { const url = new URL(value ?? ""); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); window.open(url.href, "_blank", "noopener,noreferrer"); }
                catch { toast({ title: "Set this insurer's portal URL first.", variant: "destructive" }); }
              }}>Open portal</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit portal URL" title="Edit portal URL" onClick={() => {
                setPortalEdit(portalEdit === activeTab ? null : activeTab);
                setPortalUrl(insurerRows.find(r => r.name === activeTab)?.portal_url ?? "");
              }}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
            {portalEdit === activeTab && <div className="space-y-2">
              <Input type="url" aria-label={`${activeTab} portal URL`} className="h-8 text-xs" value={portalUrl} onChange={e => setPortalUrl(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPortalEdit(null)}>Cancel</Button>
                <Button size="sm" className="h-8 text-xs" onClick={savePortal}>Save URL</Button>
              </div>
            </div>}
          </div>
          </div>
          </section>
          <section ref={reviewSection} tabIndex={-1} className={cn("frame scroll-mt-6 p-3 space-y-3", connected && "quote-step-active")} aria-label="Review quote options" aria-current={connected ? "step" : undefined}>
            <div className="flex flex-wrap items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">2</span><h4 className="font-semibold">Review quote options</h4>{connected && <span role="status" className="quote-progress-badge">In Progress</span>}{connected && <Button className="ml-auto font-semibold" disabled={!allComplete || quotesRunning} title={!allComplete ? "Complete the option values first" : quotesRunning ? "Quote requests are already in progress" : undefined} onClick={() => submitScenarios(activeTab)}>Get quotes</Button>}</div>
            <p className="font-medium text-foreground">Review your options, then request quotes.</p>
            <p className={label}>{quotesRunning ? "Quote requests are in progress. Follow the bars above each option." : "Waiting for your review. Open a product to compare and edit Options A, B and C."}</p>
          <details className="rounded-lg border border-border p-2">
            <summary className="cursor-pointer text-xs font-medium">Calculation assumptions</summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={label}>Shortfall formula · income years</span>
            <Input aria-label="Income years" className="h-8 w-14 px-2 text-xs tabular-nums" inputMode="numeric" value={params.incomeYears}
              onChange={(e) => applyParams({ ...params, incomeYears: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            <span className={label}>· income protection %</span>
            <Input aria-label="Income protection percentage" className="h-8 w-14 px-2 text-xs tabular-nums" inputMode="numeric" value={params.ipPercent}
              onChange={(e) => applyParams({ ...params, ipPercent: Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, 100) })} />
            </div>
          </details>

          {products.map((p) => {
            const extra = activeTab ? insurerFields(activeTab, p).map((f) => ({ ...f, key: insurerKey(activeTab, f.key) })) : [];
            const fields = [...(PRODUCT_TYPES[p] ?? []), ...extra];
            return (
              <details key={p} open={p === products[0]} className="rounded-lg border border-border">
                <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-xs font-semibold">{p} <span className="font-normal text-muted-foreground">· {plan[p].length} options</span></span>
                  <button aria-label={`Remove ${p}`} className="text-background/70 hover:text-background"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlan((pl) => { const { [p]: _, ...rest } = pl; return rest; }); }}><X className="h-3 w-3" /></button>
                </summary>
                <div className="overflow-x-auto">
                {formulaFor(p) && <p className="border-t border-border/60 px-2 py-1 text-[10px] tabular-nums text-muted-foreground">{formulaFor(p)}</p>}
                <table className="w-full min-w-[560px] table-fixed text-xs">
                  <colgroup><col className="w-44" />{plan[p].map((_, i) => <col key={i} />)}</colgroup>
                  <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-2 py-1 text-left font-medium">Variable</th>{plan[p].map((option, i) => <th key={i} className="px-2 py-2 text-left align-top font-medium">
                      {(() => { const job = jobs[activeTab]?.find(j => j.n === i + 1); return job ? <div className="mb-2 min-w-0 space-y-1 font-normal normal-case tracking-normal" title="This option's request includes the selected products">
                        <SegmentedProgress label={`${activeTab} ${p} Option ${String.fromCharCode(65 + i)} progress`} completed={quoteCheckpoints(job).filter(point => point.done).length} active={["submitting", "generating"].includes(job.status) && !isStalled(job, Date.now())} activeUntil={job.since + 90_000} />
                        <p className="quote-option-status">{job.pdfReceived && job.status === "generating" ? "Saving quote PDF…" : SCENARIO_TEXT[job.status]}</p>
                      </div> : null; })()}
                      <span className="block">Option {String.fromCharCode(65 + i)}</span>
                      <QuoteOptionReference key={`${activeTab}:${p}:${i}`} value={quoteReference(p, option, activeTab)} label={`${activeTab} ${p} Option ${String.fromCharCode(65 + i)} quote number`}
                        onChange={number => setPlan(pl => ({ ...pl, [p]: pl[p].map((value, n) => n === i ? withQuoteReference(p, value, activeTab, number) : value) }))} />
                    </th>)}</tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.key} className={cn("border-t border-border/60", f.key.includes(":") && "bg-muted/30")}>
                        <td className="px-2 py-1 text-xs leading-relaxed text-muted-foreground" title={f.label}>{f.label}</td>
                        {plan[p].map((v, i) => (
                          <td key={i} className="px-2 py-0.5">
                            {f.kind === "select" ? (
                              <select className="h-6 w-full rounded border border-input bg-background px-1 text-[11px]" value={v[f.key] ?? f.options[0]} onChange={(e) => setVal(p, i, f.key, e.target.value)}>
                                {f.options.map((o) => <option key={o}>{o}</option>)}
                              </select>
                            ) : f.kind === "toggle" ? (
                              <div className="flex h-6 items-center"><input type="checkbox" aria-label={f.label} checked={!!v[f.key]} onChange={(e) => setVal(p, i, f.key, e.target.checked)} /></div>
                            ) : (
                              <div className="flex h-6 items-center gap-1">
                                <span className="w-3 shrink-0 text-muted-foreground">{f.kind === "amount" ? "R" : ""}</span>
                                <Input className="h-6 w-full px-1.5 text-[11px] tabular-nums" inputMode="decimal" value={f.kind === "amount" ? groupDigits(v[f.key]) : v[f.key]}
                                  disabled={f.key === "growth" && String(v.increase_option).includes("No increase")}
                                  onChange={(e) => setVal(p, i, f.key, e.target.value.replace(/[^\d.]/g, ""))} />
                                <span className="w-3 shrink-0 text-muted-foreground">{f.kind === "percent" ? "%" : ""}</span>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </details>
            );
          })}

          <div className="flex items-center gap-1.5">
            <select className="h-6 rounded border border-input bg-background px-1.5 text-[11px]" value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Add a product…</option>
              {Object.keys(PRODUCT_TYPES).filter((p) => !plan[p]).map((p) => <option key={p}>{p}</option>)}
            </select>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" disabled={!adding}
              onClick={() => { setPlan((pl) => ({ ...pl, [adding]: defaultVariations(adding, 0) })); setAdding(""); }}><Plus className="mr-0.5 h-3 w-3" />Add</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className={label}>{total * chosen.length} quote options across {chosen.length} insurer{chosen.length === 1 ? "" : "s"}</p>
            <Button size="sm" disabled={busy || !allComplete} onClick={save}>{busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{spec ? "Update quote plan" : "Save quote plan"}</Button>
          </div>
          {!allComplete && <p className="text-xs text-destructive" role="status">{incompleteOptions.length ? `Complete missing values in: ${incompleteOptions.join(", ")}.` : "Add a product to prepare your quote plan."}</p>}
          </section>
          <section className="frame p-3 space-y-3" aria-label="Request and collect quotes">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">3</span><h4 className="font-semibold">Request & collect quotes</h4></div>
          <QuoteJobsPanel jobs={Object.fromEntries(chosen.map(ins => [ins, jobs[ins] ?? []]))} onStop={stopConnection} onRetry={(ins, n) => submitScenarios(ins, [n])} />
          {clientId && <QuotePdfCapture workflowId={workflowId} clientId={clientId} insurer={activeTab}
            onActivity={(ins, phase, detail) => recordActivity(ins, phase, detail)}
            onScenarioSaved={(ins, n) => setJobs((j) => setStatus(j, ins, n, "captured", Date.now()))} />}
          {/^discovery$/i.test(activeTab) && <DiscoveryScreenScan workflowId={workflowId} connected={login[activeTab] === "connected"} />}


          </section>
        </div>
      )}

    </div>
  );
}

