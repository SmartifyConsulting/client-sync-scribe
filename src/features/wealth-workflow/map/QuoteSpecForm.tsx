import { providerQuoteFields, hasVerifiedProviderFields, isOmpProduct, providerFieldApplies, ompSettingsComplete, withQuoteDefaults, premiumPatternField, premiumPatternOptions, premiumPatternElysianLabel, supportsPremiumVariants } from "./providerQuoteFields";
import { OMP_RATING_OPTIONS, ompRatingIssues } from "./providerRatingFields";
import { BidvestClientFields, bidvestIssues } from './BidvestClientFields';
import {editQuoteOption} from './optionInheritance';
import { useCompanionInstalled, useCompanionVersion } from "./companionDetection";
import { useCompanionRelease, companionVersionCurrent } from "./companionRelease";
import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, Pencil, Check, ChevronDown } from "lucide-react";
import { QuoteOptionReference } from "./QuoteOptionReference";
import { quoteReference, quoteResult, quoteSettingsKey, withQuoteReference } from "./quoteReferences";
import { usePublishQuoteInsurers } from "./QuoteInsurerSelection";
import { productLetter } from "./productLetter";
import { insurerColor } from "./insurerColors";
import { LoginRing, LOGIN_TEXT, OtpDialog, ProtectorDialog, addonInstalled, downloadAddon, type Challenge, type LoginState } from "./InsurerLogin";
import { CompanionSetup } from "./CompanionSetup";
import { QuotePdfCapture } from "./QuotePdfCapture";
import { DiscoveryScreenScan } from "./DiscoveryScreenScan";
import { InsurerActivity } from "./InsurerActivity";
import { isActivityPhase, updateActivity, type QuoteActivity, type ActivityPhase } from "./quoteActivity";
import { releaseBlockedQueues, startJobs, setStatus, type QuoteJobs } from "./quoteJobs";
import { buildPortalScenarios, OMP_RATING_LABELS } from "./portalPayload";
import { QuoteJobsPanel } from "./QuoteJobsPanel";
import { QuoteSourceSelector } from "./QuoteSourceSelector";
import { DocumentRequestComposer } from "./DocumentRequestComposer";
import { canStartPortal, planningPremiumKey, type QuoteSource } from "./quoteSourcing";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPES, PREMIUM_PATTERNS, QUOTES_PER_COVER, coverOptionLabel, variationComplete } from "./quoteSpec";
import { groupDigits } from "./money";
import { DEFAULT_PARAMS, type NeedsParams, defaultVariations, productsFromNeeds, withCoverAmounts, hasNoCurrentCover } from "./needsProducts";

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
    queryFn: async () => (await db.from("client_financial_profiles").select("cash_flow,assets_liabilities,risk_portfolio,goals_risk").eq("patient_id", clientId).maybeSingle()).data,
  });
  const { data: quoteClient } = useQuery({
    queryKey: ["quote-client-inputs", clientId], enabled: !!clientId && isWM,
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase.from("clients").select("title,first_name,last_name,id_passport_number,email,dob,gender,smoker,highest_education,occupation,marital_status").eq("id", clientId).maybeSingle();
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

  const [draftPlan, setPlan] = useState<Plan>({});
  const submittedOptions = useRef<Record<string, {product:string; settings:string; pattern?: string}>>({});
  const specRevision = useRef<string>();
  useEffect(()=>{specRevision.current=spec?.updated_at;},[spec?.id,spec?.updated_at]);
  const [source, setSource] = useState<QuoteSource>("companion");
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
  // Persisted so the per-insurer progress/status bars (and the "needs attention" OTP
  // indicator) survive navigating away from this screen and back — the Companion's
  // managed portal tab keeps running in the background regardless of this page's mount state.
  const LOGIN_KEY = `holarc-quote-login-${workflowId}`;
  const [login, setLogin] = useState<Record<string, LoginState>>(() => { try { return JSON.parse(localStorage.getItem(LOGIN_KEY) || "{}"); } catch { return {}; } });
  useEffect(() => { localStorage.setItem(LOGIN_KEY, JSON.stringify(login)); }, [login, LOGIN_KEY]);
  const [activity, setActivity] = useState<Record<string, QuoteActivity>>({});
  const recordActivity = (insurer: string, phase: ActivityPhase, detail?: string) => setActivity((s) => ({ ...s, [insurer]: updateActivity(s[insurer], phase, Date.now(), detail) }));
  const JOBS_KEY = `holarc-quote-jobs-${workflowId}`;
  const [jobs, setJobs] = useState<QuoteJobs>(() => { try { return releaseBlockedQueues(JSON.parse(localStorage.getItem(JOBS_KEY) || "{}")); } catch { return {}; } });
  useEffect(() => { localStorage.setItem(JOBS_KEY, JSON.stringify(jobs)); }, [jobs, JOBS_KEY]);
  const jobsRef = useRef(jobs);
  useEffect(() => { jobsRef.current = jobs; }, [jobs]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [adding, setAdding] = useState("");
  const [params, setParams] = useState<NeedsParams>(DEFAULT_PARAMS);
  const plan: Plan = Object.fromEntries(Object.entries(draftPlan).map(([product, options]) =>
    [product, withCoverAmounts(product, options, fin, params).map(option => withQuoteDefaults(product, option, chosen, fin))]));

  useEffect(() => {
    if (isLoading) return;
    if (spec) { setPlan(toPlan(spec)); setChosen(spec.insurers ?? []); return; }
    if (clientId && !finReady) return;
    setPlan(Object.fromEntries(productsFromNeeds(fin).map(product => [product, defaultVariations(product)])));
  }, [spec, isLoading, fin, finReady, clientId]);

  // Messages from the broker-side add-on driving the insurer login.
  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== window || e.origin !== window.location.origin || d?.source !== "holarc-extension" || d.workflowId !== workflowId || typeof d.insurer !== "string") return;
      if(d.connectionAttemptId&&connectionAttempts.current[d.insurer]&&connectionAttempts.current[d.insurer]!==d.connectionAttemptId)return;
      if (d.type === "insurer-stopped") { recordActivity(d.insurer,"stopped"); setLogin(s=>({...s,[d.insurer]:"stopped"})); return; }
      if (stoppedConnections.current.has(d.insurer)) return;
      if (d.type === "insurer-quote-calculated") {
        const submitted = submittedOptions.current[`${d.insurer}:${d.n}`];
        const result = d.result;
        if (!submitted || result?.product !== submitted.product || !/^\d{1,30}$/.test(result?.number ?? '') ||
            typeof result.monthlyPremium !== 'number' || !Number.isFinite(result.monthlyPremium) || result.monthlyPremium <= 0 ||
            typeof result.cashbackPremium !== 'number' || !Number.isFinite(result.cashbackPremium) || result.cashbackPremium < 0 || result.cashbackPremium > result.monthlyPremium) return;
        delete submittedOptions.current[`${d.insurer}:${d.n}`];
        const {data:latest,error:readError}=await db.from('wealth_quote_specs').select('*').eq('workflow_id',workflowId).order('created_at',{ascending:false}).limit(1).maybeSingle();
        const current=toPlan(latest), option=current[submitted.product]?.[d.n-1];
        if(readError || !option || quoteSettingsKey(submitted.product,option,d.insurer)!==submitted.settings) {
          toast({title:'Quote calculated, but its settings have changed. Review the portal result before saving it.',variant:'destructive'}); return;
        }
        const evidence = { ...result, settings: submitted.settings, source: "companion-verified", verifiedAt: new Date().toISOString() };
        const updated = submitted.pattern ? {
          ...option,
          _premiumVariants: { ...option._premiumVariants, [d.insurer]: {
            ...option._premiumVariants?.[d.insurer], [submitted.pattern]: evidence,
          } },
        } : {
          ...withQuoteReference(submitted.product, option, d.insurer, result.number),
          _quoteResults: { ...option._quoteResults, [d.insurer]: evidence },
        };
        const variations={...current,[submitted.product]:current[submitted.product].map((v,i)=>i===d.n-1?updated:v)};
        const {data:saved,error}=await db.from('wealth_quote_specs').update({variations,updated_at:new Date().toISOString()}).eq('id',latest.id).eq('updated_at',latest.updated_at).select('id,updated_at');
        if(error || !saved?.length){toast({title:'Quote calculated but could not be saved. Keep the insurer tab open.',variant:'destructive'});return;}
        specRevision.current=saved[0].updated_at;
        setPlan(previous => ({
          ...previous,
          [submitted.product]: (previous[submitted.product] ?? []).map((value, index) => index === d.n - 1
            ? submitted.pattern
              ? { ...value, _premiumVariants: { ...value._premiumVariants, [d.insurer]: { ...value._premiumVariants?.[d.insurer], [submitted.pattern]: evidence } } }
              : { ...value, _quoteReferences: { ...value._quoteReferences, [d.insurer]: (updated as any)._quoteReferences[d.insurer] },
                _quoteResults: { ...value._quoteResults, [d.insurer]: (updated as any)._quoteResults[d.insurer] } }
            : value),
        }));
        toast({title:`Quote ${result.number} saved to ${coverOptionLabel(d.n - 1)}`,description:'Calculation recorded. PDF not yet filed.'});
        return;
      }
      if (d.type === "insurer-login-progress" && isActivityPhase(d.phase)) recordActivity(d.insurer, d.phase);
      if (d.type === "insurer-scan-result" && d.ok && ["fields", "no-fields"].includes(d.scan?.state)) recordActivity(d.insurer, d.scan.state);
      if (d.type === "insurer-pdf") {
        recordActivity(d.insurer, "saving");
        if (Number.isInteger(d.n)) setJobs(previous => ({ ...previous, [d.insurer]: (previous[d.insurer] ?? []).map(job => job.n === d.n ? { ...job, pdfReceived: true } : job) }));
      }
      if (d.type === "insurer-pdf-error") recordActivity(d.insurer, "pdf-error");
      if (d.type === "insurer-quote-status" && Number.isInteger(d.n) && ["submitting", "generating", "calculated", "no-fields", "failed"].includes(d.status))
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
  /** Manual expand/collapse overrides, keyed by a section id (e.g. "connect:Momentum" or
   *  "product:Momentum:Life cover"). Absent = auto: collapsed once that step/product is
   *  done, expanded otherwise — saves space without hiding anything still in progress. */
  const [expandOverride, setExpandOverride] = useState<Record<string, boolean>>({});
  const isExpanded = (key: string, autoDone: boolean) => expandOverride[key] ?? !autoDone;
  const toggleExpand = (key: string, autoDone: boolean) => setExpandOverride(s => ({ ...s, [key]: !isExpanded(key, autoDone) }));
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
  };
  const unlock = async (passcode: string) => {
    setUnlocking(true);
    const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "reauth", passcode } });
    setUnlocking(false);
    if (error || data?.error) return toast({ title: data?.error ?? "Incorrect Password Protector", variant: "destructive" });
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: data.token, uid: user?.id, exp: Date.now() + Math.min(data.expiresInMs ?? 1800000, 1800000) }));
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
  const submitScenarios = async (ins: string, only?: number[], product?: string, pattern?: number) => {
    if (!canStartPortal(source)) return;
    const requestedPlan: Plan = {};
    for (const [name, options] of Object.entries(product ? { [product]: plan[product] } : plan)) {
      const eligible = options.slice();
      options.forEach((option, index) => {
        if (hasNoCurrentCover(name, option, index)) delete eligible[index];
      });
      if (eligible.some(Boolean)) requestedPlan[name] = eligible;
    }
    // Any insurer/product with a premium-pattern field (see providerQuoteFields.premiumPatternOptions)
    // can be requested under one of its 3 pattern variants; `pattern` is the index into that list.
    const patternField = product && pattern != null ? premiumPatternField(ins, product) : undefined;
    const premiumVariant = patternField && product ? premiumPatternOptions(ins, product)?.[pattern!] : undefined;
    if (premiumVariant && product && requestedPlan[product]) {
      // Never redo work: drop options whose quote for this pattern is already saved with the same settings.
      const remaining = requestedPlan[product].slice();
      remaining.forEach((option, index) => {
        const saved = option?._premiumVariants?.[ins]?.[premiumVariant];
        if (saved?.number && saved.settings === quoteSettingsKey(product, option, ins)) delete remaining[index];
      });
      if (!remaining.some(Boolean)) return;
      requestedPlan[product] = remaining;
    }
    if (premiumVariant && patternField && product && requestedPlan[product]) {
      requestedPlan[product] = requestedPlan[product].map(option => option && ({
        ...option, [patternField.key]: premiumVariant,
      }));
      if (ins === "Old Mutual" && requestedPlan[product].some((option, index) => only?.includes(index + 1) &&
          !["0% fixed rate", "5% fixed rate", "10% fixed rate"].includes(option["Old Mutual:omp_cover"]))) {
        toast({ title: "Old Mutual’s inflation-linked growth requires portal review. Use the portal for these variants." });
        return;
      }
    }
    // Defaults to the standard 5% until the Wealth Manager overrides it in Needs Analysis.
    const rawCpi = fin?.goals_risk?.quote_cpi;
    const goals = { ...fin?.goals_risk, quote_cpi: rawCpi == null || String(rawCpi).trim() === "" ? "5" : rawCpi };
    if (!Number.isFinite(Number(goals.quote_cpi))) {
      toast({ title: "Set the annual CPI assumption in Needs Analysis first." });
      return;
    }
    if (requestedPlan["Income protection"] &&
        (!Number(goals.retirement_age) || !goals.retirement_payment_term?.trim() ||
          !goals.income_protection_term || goals.income_protection_term === "Not applicable")) {
      toast({ title: "Complete the retirement age and benefit payment terms in Needs Analysis first." });
      return;
    }
    if(ins==='Bidvest Life / FMI') {
      const issues=bidvestIssues(Object.values(requestedPlan)[0]?.[0]?._bidvestInputs);
      if(issues.length){toast({title:'Complete the Bidvest client questions first.',description:issues.join('; '),variant:'destructive'});return;}
    }
    const missingRating = Object.entries(requestedPlan).flatMap(([p, options]) => options.flatMap((v,i) => isOmpProduct(ins,p) && (!only || only.includes(i+1)) ? ompRatingIssues(v._ompInputs).map(label=>`${p} ${coverOptionLabel(i)} · ${label}`) : []));
    if(missingRating.length) {toast({title:'Complete the required insurer details first.',description:missingRating.slice(0,5).join('; '),variant:'destructive'});return;}
    if(ins==='Old Mutual' && Object.keys(requestedPlan).some(p=>p!=='Life cover')) {toast({title:'Use Get quote under a Life cover option. Other Old Mutual products are not yet mapped.'});return;}
    if (Object.entries(requestedPlan).some(([p, options]) => options.some((v,i) => (!only || only.includes(i+1)) && !ompSettingsComplete(ins, p, v)))) { toast({ title: "Complete the insurer’s required product settings first." }); return; }
    if (login[ins] !== "connected") { toast({ title: `Connect ${ins} first.` }); return; }
    if(ins==='Old Mutual' && !companionVersionCurrent(installedVersion,'1.7.6')) {setSetupOpen(true);return;}
    if(ins==='Old Mutual') {
      if(!spec?.id){toast({title:'Save the quote plan before requesting the quote.'});return;}
      const {data:saved,error}=await db.from('wealth_quote_specs').update({variations:plan,updated_at:new Date().toISOString()}).eq('id',spec.id).eq('updated_at',specRevision.current ?? spec.updated_at).select('id,updated_at');
      if(error || !saved?.length){toast({title:'The quote plan changed. Refresh it before requesting a quote.',variant:'destructive'});return;}
      specRevision.current=saved[0].updated_at;
    }
    const prods = Object.keys(plan);
    const count = Math.max(...prods.map((p) => plan[p].length), 0);
    const scenarios = buildPortalScenarios(requestedPlan, ins, quoteClient).filter((s) =>
      (!only || only.includes(s.n)) && Object.values(requestedPlan).some(options => options[s.n - 1]) &&
      (premiumVariant || jobs[ins]?.find((j) => j.n === s.n)?.status !== "captured"));
    if (!scenarios.length) return toast({ title: "No remaining applicable quote requests." });
    if (product) for (const s of scenarios) submittedOptions.current[`${ins}:${s.n}`] = { product, settings: quoteSettingsKey(product, plan[product][s.n - 1], ins), pattern: premiumVariant };
    setJobs((j) => {
      const queued = startJobs(j, ins, count, Date.now(), only);
      const submitted = new Set(scenarios.map(scenario => scenario.n));
      return { ...queued, [ins]: [
        ...(j[ins] ?? []).filter(job => !submitted.has(job.n)),
        ...queued[ins].filter(job => submitted.has(job.n)).map(job => premiumVariant ? { n: job.n, status: "queued" as const, since: Date.now(), premiumVariant } : job),
      ].sort((a, b) => a.n - b.n) };
    });
    window.postMessage({ source: "holarc", type: "insurer-quote-submit", insurer: ins, workflowId, scenarios }, window.location.origin);
  };

  const submittingVariants = useRef(new Set<string>()); // per insurer: one insurer waiting on an OTP never holds up the others
  const [variantProgress, setVariantProgress] = useState<{ ins: string; product: string; done: number; total: number } | null>(null);
  const [collectingAll, setCollectingAll] = useState(false);
  /**
   * Requests all 3 premium-pattern variants for every option of one insurer/product (any
   * insurer/product with a pattern field, not just Momentum Life). Every pattern reuses the
   * same scenario number as its option (n = option index + 1) — the universal _premiumVariants
   * model, not Momentum's old distinct-n-per-pattern range — so two patterns for the same option
   * must never be in flight together: submittedOptions.current (keyed by insurer:n) can only
   * remember one pattern at a time per n. Each pattern's batch is awaited to a terminal job
   * status before the next pattern is submitted.
   */
  const submitAllVariants = async (ins: string, product: string) => {
    if (submittingVariants.current.has(ins)) return;
    const patterns = premiumPatternOptions(ins, product);
    if (!patterns) return;
    submittingVariants.current.add(ins);
    setVariantProgress({ ins, product, done: 0, total: patterns.length });
    try {
      for (let index = 0; index < patterns.length; index++) {
        await submitScenarios(ins, undefined, product, index);
        const deadline = Date.now() + 3 * 60_000;
        while (Date.now() < deadline && (jobsRef.current[ins] ?? []).some(j => ["queued", "submitting", "generating"].includes(j.status))) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        setVariantProgress({ ins, product, done: index + 1, total: patterns.length });
      }
    } finally {
      submittingVariants.current.delete(ins);
      setVariantProgress(null);
    }
  };

  /** Requests every premium-pattern variant for every connected insurer, one insurer/product at a
   *  time (reuses submitAllVariants' own serialization), so the single button on the insurer row
   *  collects everything instead of the Wealth Manager running each insurer's button separately. */
  const requestAllQuotes = async () => {
    if (collectingAll || submittingVariants.current.size) return;
    setCollectingAll(true);
    try {
      // Insurers run side by side; products within one insurer stay sequential.
      await Promise.all(chosen.filter(ins => login[ins] === "connected").map(async ins => {
        for (const p of products) {
          if (!supportsPremiumVariants(ins, p)) continue;
          await submitAllVariants(ins, p);
        }
      }));
    } finally {
      setCollectingAll(false);
    }
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

  const products = Object.keys(plan);
  const activeTab = chosen.includes(tab) ? tab : chosen[0] ?? "";
  visibleInsurer.current = activeTab;
  const connected = login[activeTab] === "connected";

  /** Saved quote completion for one insurer, across every product/option/pattern that
   *  applies to it (or just `onlyProduct` when given) — derived from the persisted quote
   *  plan, so it survives navigating away and back (unlike the ephemeral in-flight
   *  variantProgress tracker above). Also used to auto-collapse a finished product/step. */
  const insurerProgress = (ins: string, onlyProduct?: string) => {
    let done = 0, total = 0;
    for (const p of onlyProduct ? [onlyProduct] : products) {
      const patterns = premiumPatternOptions(ins, p);
      if (!patterns) continue;
      for (const [i, option] of plan[p].entries()) {
        if (hasNoCurrentCover(p, option, i)) continue;
        const settings = quoteSettingsKey(p, option, ins);
        const saved = option._premiumVariants?.[ins] ?? {};
        total += patterns.length;
        done += patterns.filter(pattern => saved[pattern]?.settings === settings && saved[pattern]?.number).length;
      }
    }
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };
  // Saved position is a hint only: Companion must verify the existing portal.
  // A refresh must never replay login or quote submission for a saved session.
  useEffect(() => {
    if (!canStartPortal(source) || !activeTab || !user?.id || !insurerRows.length || !companionInstalled || resumeChecked.current.has(activeTab)) return;
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
  }, [source, activeTab, user?.id, insurerRows.length, companionInstalled, installedVersion, resumeKey]);
  const quotesRunning = (jobs[activeTab] ?? []).some(job => ["queued", "submitting", "generating"].includes(job.status));
  useEffect(() => {
    if (!connected || pendingReview.current !== activeTab) return;
    pendingReview.current = null;
    // Scroll only for a new confirmed connection in the visible insurer tab.
    // Routine tab switches, field edits and background insurer results do not steal focus.
    reviewSection.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    reviewSection.current?.focus({ preventScroll: true });
  }, [activeTab, connected]);
  // Changing insurer tabs only inspects saved progress; Connect explicitly starts login.
  useEffect(() => {
    if (!canStartPortal(source) || !activeTab || !insurerRows.length || (login[activeTab] && login[activeTab] !== "no-addon") || !companionInstalled || resumePending || resumeRequests.current.has(activeTab)) return;
    try { if (JSON.parse(localStorage.getItem(resumeKey) || "{}").connected?.[activeTab]) return; } catch { /* No saved session. */ }
    setSetupOpen(false);
    setLogin(s => { if (s[activeTab] !== "no-addon") return s; const next = { ...s }; delete next[activeTab]; return next; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, activeTab, insurerRows.length, companionInstalled, resumePending]);
  const setVal = (p: string, i: number, k: string, val: any) =>
    setPlan((pl) => ({ ...pl, [p]: editQuoteOption(pl[p],i,k,val) }));
  const total = products.reduce((a, p) => a + plan[p].filter((option, i) => !hasNoCurrentCover(p, option, i)).length, 0);
  const optionComplete = (p: string, v: Record<string, any>) => hasVerifiedProviderFields(activeTab,p) ? ompSettingsComplete(activeTab,p,v) : variationComplete(PRODUCT_TYPES[p] ?? [],v);
  const allComplete = products.length > 0 && products.every((p) => plan[p].every((v, i) => hasNoCurrentCover(p, v, i) || optionComplete(p, v)));

  const save = async () => {
    setBusy(true);
    const row = { workflow_id: workflowId, product_type: products.join(" | "), variations: plan, insurers: chosen, updated_at: new Date().toISOString() };
    const { error } = spec ? await db.from("wealth_quote_specs").update(row).eq("id", spec.id) : await db.from("wealth_quote_specs").insert(row);
    setBusy(false);
    if (error) return toast({ title: "Couldn't save the quote plan", description: error.message, variant: "destructive" });
    toast({ title: "Quote plan saved", description: `${total * chosen.length * QUOTES_PER_COVER} premium variants planned across the selected insurers.` });
    qc.invalidateQueries({ queryKey: ["wealth-quote-spec", workflowId] });
  };


  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!isWM) return null;

  const label = "text-xs text-muted-foreground";
  const incompleteOptions = products.flatMap(p => plan[p].flatMap((v, i) =>
    hasNoCurrentCover(p, v, i) || optionComplete(p, v) ? [] : [`${p} · ${coverOptionLabel(i)}`]));
  return (
    <div className="space-y-4 text-xs leading-relaxed">
      <div>
        <h3 className="text-sm font-semibold">Prepare insurer quotes</h3>
        <p className={label}>Collect three premium variants from each insurer for every applicable cover option on each product.</p>
      </div>

      <QuoteSourceSelector value={source} onChange={setSource} />
      {source !== "companion" && Object.values(login).some(state => ["connecting", "challenge", "connected"].includes(state)) && <p role="status" className="text-xs text-muted-foreground">Previously started portal sessions remain open. Return to Live Companion RPA to monitor or stop them.</p>}
      <section className="frame p-3 space-y-3" aria-label="Choose insurers">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="text-xs font-semibold">Choose insurers</h4>
          {source === "companion" && chosen.length > 0 && <Button size="sm" disabled={collectingAll || quotesRunning || !chosen.some(ins => login[ins] === "connected")} onClick={() => void requestAllQuotes()}>
            {collectingAll ? "Getting quotes…" : "Get quotes for selected insurers"}
          </Button>}
        </div>
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
        {chosen.length > 0 && <p className={label}>Select an insurer to view its connection and quote options.</p>}
          <div role="tablist" aria-label="Insurer workspaces" className="flex flex-wrap items-center gap-2">
            {chosen.map((t) => {
              const c = insurerColor(t);
              const on = activeTab === t;
              return (
                <button key={t} role="tab" aria-selected={on} onClick={() => openTab(t)}
                  className={cn("flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                    on ? "shadow-sm ring-2 ring-offset-2 ring-primary/30" : "opacity-75 hover:opacity-100")}
                  style={{ background: `hsl(${c})`, color: "hsl(var(--insurer-foreground))" }}>
                  {t}
                  {source === "companion" && <LoginRing state={login[t]} />}
                </button>
              );
            })}
          </div>
      {source === "companion" && chosen.length > 0 && <div className="space-y-3 pt-1" aria-label="Quote progress">
        <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
          {chosen.map(ins => {
            const { done, total, pct } = insurerProgress(ins);
            const needsOtp = login[ins] === "challenge";
            const isConnected = login[ins] === "connected" || done > 0;
            const c = insurerColor(ins);
            const finished = products.filter(p => { const pr = insurerProgress(ins, p); return pr.total > 0 && pr.done === pr.total; });
            return <div key={ins} className="flex items-center gap-2" aria-label={`${ins} quote progress`}>
              <span className="w-24 shrink-0 truncate text-[11px] font-medium">{ins}</span>
              <span title={isConnected ? "Connected" : login[ins] ? LOGIN_TEXT[login[ins]] : "Not connected"} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", isConnected ? "bg-success text-success-foreground" : "border border-border bg-muted")}>
                {isConnected ? <Check className="h-3 w-3" aria-label="Connected" /> : login[ins] === "connecting" ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
              </span>
              <div className="relative h-5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted" title={total ? `${done}/${total} quotes` : "No quotes planned"}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 8)}%`, background: `hsl(${c})` }} />
              </div>
              {finished.map(p => <span key={p} title={`${p} quotes complete`} className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground">
                {productLetter(p)}<Check className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-background text-success" aria-hidden="true" />
              </span>)}
              {needsOtp && <button type="button" className="shrink-0 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-warning/30"
                title={challenge?.insurer === ins ? "Enter the code in the dialog — other insurers keep running" : "Code still needed — other insurers keep running"}
                onClick={() => {
                  openTab(ins);
                  if (challenge?.insurer === ins) return;
                  if (!(companionInstalled || addonInstalled())) { setSetupOpen(true); return; }
                  const token = getToken();
                  if (token) void startLogin(ins, token); else setAskFor(ins);
                }}>
                OTP waiting
              </button>}
            </div>;
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">Green circle = connected. Letters show finished products (L Life, D Dread disease, I Income protection, C Car, H Home). Progress is saved — you can leave and come back.</p>
      </div>}
      </section>

      {chosen.length > 0 && (
        <div className="space-y-2">
          {source === "companion" && (() => {
            const connectKey = `connect:${activeTab}`;
            const connectOpen = isExpanded(connectKey, connected);
            return <section className={cn("frame p-3", connected && "quote-step-done")} aria-label="Connect insurer">
          <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => toggleExpand(connectKey, connected)}>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold", connected ? "bg-success text-success-foreground" : "bg-primary/10 text-primary")}>{connected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : "1"}</span>
            <h4 className="font-semibold">Connect to {activeTab}</h4>
            {connected && <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-success-foreground">Done</span>}
            <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", !connectOpen && "-rotate-90")} aria-hidden="true" />
          </button>
          {connectOpen && <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-4">
          <div className="min-w-0 space-y-3">
          <InsurerActivity insurer={activeTab} activity={activity[activeTab]}
            onStop={()=>stopConnection(activeTab)} canStop={["connecting","challenge","connected"].includes(login[activeTab])||(jobs[activeTab]||[]).some(j=>["queued","submitting","generating"].includes(j.status))}
            idleText={!(companionInstalled || addonInstalled()) ? `Update to the latest Companion v${companionRelease.version}` : "Saved quote progress is available. Connect when you are ready to request more quotes."}
            idleAction={!(companionInstalled || addonInstalled()) ? "Update Companion" : getToken() ? "Connect" : "Unlock & connect"}
            onRetry={() => { if (!(companionInstalled || addonInstalled())) { setSetupOpen(true); return; } const token = getToken(); if (token) void startLogin(activeTab, token); else setAskFor(activeTab); }} />
          {login[activeTab] === "no-addon" && (
            <p className={label}>{LOGIN_TEXT[login[activeTab]]}
              {login[activeTab] === "no-addon" && <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => setSetupOpen(true)}>Update to Companion v{companionRelease.version}</Button>}
            </p>
          )}
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
          </div>}
          <OtpDialog challenge={challenge} onClose={() => setChallenge(null)} onStop={()=>{if(challenge)stopConnection(challenge.insurer);}} onSubmit={submitChallenge} />
          <ProtectorDialog open={!!askFor} busy={unlocking} onClose={() => setAskFor(null)} onSubmit={unlock} />
          <CompanionSetup open={setupOpen} onClose={() => setSetupOpen(false)} onReady={() => openTab(activeTab)} />
          </section>;
          })()}
          <section ref={reviewSection} tabIndex={-1} className={cn("frame scroll-mt-6 p-3 space-y-3", connected && "quote-step-active")} aria-label="Review quote options" aria-current={connected ? "step" : undefined}>
            <div className="flex flex-wrap items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">2</span><h4 className="font-semibold">Review quote options</h4>{source === "companion" && connected && <span role="status" className="quote-progress-badge">In Progress</span>}{source === "companion" && connected && <Button className="ml-auto font-semibold" disabled={!allComplete || quotesRunning} title={!allComplete ? "Complete the option values first" : quotesRunning ? "Quote requests are already in progress" : undefined} onClick={() => submitScenarios(activeTab)}>Get quotes</Button>}</div>
            <p className="font-medium text-foreground">Review your options, then request quotes.</p>
            {source === "companion" && <p className={label}>Get quotes requests the selected terms for each applicable cover option. The Momentum life-cover batch requests all three premium patterns.</p>}
            <p className={label}>{quotesRunning ? "Quote requests are in progress. Follow the bars above each option." : "Waiting for your review. Open a product to review Desired, Current and Agreed Cover."}</p>
          <details className="rounded-lg border border-border p-2">
            <summary className="cursor-pointer text-xs font-medium">Calculation assumptions</summary>
            <p className="mt-2 text-xs text-muted-foreground">Annual CPI assumption · {fin?.goals_risk?.quote_cpi == null || fin.goals_risk.quote_cpi === "" ? "5" : fin.goals_risk.quote_cpi}% <span className="text-muted-foreground/70">(edit in Needs Analysis)</span></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={label}>Desired Cover · income years</span>
            <Input aria-label="Income years" className="h-8 w-14 px-2 text-xs tabular-nums" inputMode="numeric" value={params.incomeYears}
              onChange={(e) => setParams({ ...params, incomeYears: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            <span className={label}>· income protection % of net income</span>
            <Input aria-label="Net income protection percentage" className="h-8 w-14 px-2 text-xs tabular-nums" inputMode="numeric" value={params.ipPercent}
              onChange={(e) => setParams({ ...params, ipPercent: Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, 100) })} />
            </div>
          </details>
          {activeTab === "BrightRock" && <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            BrightRock uses one needs-matched individual life policy. The Companion can open a proposal and fill recognised fields. Review the cover in the portal and upload the quote PDF after retrieving it through BrightRock.
          </p>}

          {activeTab==='Bidvest Life / FMI' && products.length>0 && <BidvestClientFields answers={plan[products[0]]?.[0]?._bidvestInputs??{}} onChange={answers=>setPlan(pl=>Object.fromEntries(Object.entries(pl).map(([product,options])=>[product,options.map(option=>({...option,_bidvestInputs:answers}))])))} />}
          {products.map((p) => {
            const fields = providerQuoteFields(activeTab, p);
            const hasPortalChoices = hasVerifiedProviderFields(activeTab, p);
            const productProgress = insurerProgress(activeTab, p);
            const productDone = productProgress.total > 0 && productProgress.done === productProgress.total;
            const productKey = `product:${activeTab}:${p}`;
            const productOpen = isExpanded(productKey, productDone);
            return (
              <section key={p} className="rounded-lg border border-border">
                <div role="button" tabIndex={0} aria-expanded={productOpen} className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-left cursor-pointer"
                  onClick={() => toggleExpand(productKey, productDone)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(productKey, productDone); } }}>
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", !productOpen && "-rotate-90")} aria-hidden="true" />
                    {p} <span className="font-normal text-muted-foreground">· {plan[p].filter((option, i) => !hasNoCurrentCover(p, option, i)).length * QUOTES_PER_COVER} quotes per insurer</span>
                    {productDone && <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-success-foreground">Done</span>}
                  </span>
                  <button type="button" aria-label={`Remove ${p}`} className="shrink-0 text-background/70 hover:text-background"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlan((pl) => { const { [p]: _, ...rest } = pl; return rest; }); }}><X className="h-3 w-3" /></button>
                </div>
                {productOpen && <>
                <div className="grid gap-2 p-3 sm:grid-cols-3">
                  {plan[p].map((option, i) => {
                    const settings = quoteSettingsKey(p, option, activeTab);
                    const saved = option._premiumVariants?.[activeTab] ?? {};
                    const patterns = premiumPatternOptions(activeTab, p) ?? PREMIUM_PATTERNS;
                    const legacyJob = jobs[activeTab]?.find(job => job.n === i + 1);
                    const active = legacyJob && ["queued", "submitting", "generating"].includes(legacyJob.status);
                    const complete = patterns.every((pattern) => saved[pattern]?.settings === settings && saved[pattern]?.number);
                    const needsReview = legacyJob && ["failed", "no-fields", "calculated", "stopped"].includes(legacyJob.status);
                    const reference = quoteReference(p, option, activeTab);
                    return <section key={i} className="min-w-0 rounded-lg border border-border p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h5 className="font-semibold">{coverOptionLabel(i)}</h5>
                        {!hasNoCurrentCover(p, option, i) && <span role="status" className={active ? "quote-progress-badge" : label}>
                          {active ? "In progress" : complete ? "Complete" : needsReview ? "Needs review" : "Pending"}
                        </span>}
                      </div>
                      {hasNoCurrentCover(p, option, i)
                        ? <span className="mt-1 block normal-case tracking-normal">No existing cover to re-quote</span>
                        : <div className="my-2 space-y-1 font-normal normal-case tracking-normal">
                            {patterns.map((pattern, index) => {
                              const entry = saved[pattern];
                              const elysianLabel = premiumPatternElysianLabel(activeTab, p, index);
                              return <div key={pattern} className="rounded border border-border px-2 py-1">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="font-medium">
                                    {elysianLabel ?? pattern}
                                    {elysianLabel && elysianLabel !== pattern && <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground">Insurer term: {pattern}</span>}
                                  </span>
                                  <QuoteOptionReference value={entry?.settings === settings ? entry.number : ""}
                                    label={`${activeTab} ${p} ${coverOptionLabel(i)} ${pattern} reference`}
                                    className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground"
                                    onChange={number => setPlan(previous => ({
                                      ...previous,
                                      [p]: previous[p].map((value, index) => index !== i ? value : {
                                        ...value,
                                        _premiumVariants: {
                                          ...value._premiumVariants,
                                          [activeTab]: { ...value._premiumVariants?.[activeTab], [pattern]: { number, settings } },
                                        },
                                      }),
                                    }))} />
                                </div>
                                {entry?.settings === settings && entry.source === "companion-verified" && <p className={label}>R {Number(entry.monthlyPremium).toFixed(2)} / month · PDF pending</p>}
                                {entry?.number && entry.settings !== settings && <span>Previous reference {entry.number}</span>}
                              </div>;
                            })}
                          </div>}
                      {reference && <p className={label}>Configured quote no. {reference}</p>}
                    </section>;
                  })}
                </div>
                {supportsPremiumVariants(activeTab, p) && source === "companion" && <div className="flex flex-wrap items-center gap-2 p-2">
                  <Button size="sm" disabled={!connected || quotesRunning || collectingAll} onClick={() => void submitAllVariants(activeTab, p)}>Request all {p.toLowerCase()} variants</Button>
                  {variantProgress && variantProgress.ins === activeTab && variantProgress.product === p && <div className="flex min-w-[140px] flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((variantProgress.done / variantProgress.total) * 100)}%` }} />
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">{variantProgress.done}/{variantProgress.total} · {Math.round((variantProgress.done / variantProgress.total) * 100)}%</span>
                  </div>}
                </div>}
                <details className="border-t border-border">
                  <summary className="cursor-pointer px-3 py-2 font-medium">Shared quote variables</summary>
                <div className="overflow-x-auto">
                {!hasPortalChoices && activeTab !== "BrightRock" && <p className="px-2 py-2 text-xs text-muted-foreground">Check the product and terms against the insurer’s portal before requesting the quote.</p>}
                {activeTab === "Discovery" && p === "Life cover" && <p className="px-2 py-2 text-xs text-muted-foreground">Discovery also lists Purple Life and Dollar Life publicly. Confirm their availability and terms directly with Discovery.</p>}
                {activeTab === "Bidvest Life / FMI" && p === "Income protection" && <p className="px-2 py-2 text-xs text-muted-foreground">Extended Income Protection is also listed by Bidvest Life. Confirm eligibility and terms in the portal.</p>}
                {activeTab === "Momentum" && hasVerifiedProviderFields(activeTab,p) && <p className="px-2 py-2 text-xs text-muted-foreground">Select the Momentum product terms for each option. These choices match the named product shown below; other product variants still need verification. Saved generic choices are retained separately. Automated quoting is still being verified.</p>}
                {isOmpProduct(activeTab, p) && <p className="px-2 py-2 text-xs text-muted-foreground">Choose Old Mutual’s product terms for each option. Saved generic settings are retained separately and are not automatically translated. {p === "Income protection" ? "The benefit term is determined in the insurer quote; the previous generic 2-year term does not apply automatically. " : ""}{p === "Life cover" ? "Companion currently supports fixed cover growth; linked increases require portal review. " : "These product choices are verified; automated submission still requires a completed product mapping. "}A calculated premium is shown separately from PDF filing.</p>}

                <table className="w-full min-w-[560px] table-fixed text-xs">
                  <colgroup><col className="w-44" />{plan[p].map((_, i) => <col key={i} />)}</colgroup>
                  <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-2 py-1 text-left font-medium">Variable</th>{plan[p].map((option, i) => <th key={i} className="px-2 py-2 text-left align-top font-medium">
                      <span className="block">{coverOptionLabel(i)}</span>
                      {option._quoteReferences?.[activeTab]?.number && !quoteReference(p,option,activeTab) && <div className="my-2 rounded border border-border p-2 font-normal normal-case tracking-normal"><p className="font-semibold">Previous quote: {option._quoteReferences[activeTab].number}</p><p className="text-muted-foreground">Saved for earlier settings. Current draft requires a new calculation.</p>{option._quoteResults?.[activeTab]?.monthlyPremium>0&&<p>R {Number(option._quoteResults[activeTab].monthlyPremium).toFixed(2)} / month</p>}</div>}
                      {isWM && isOmpProduct(activeTab,p) && <>
                        <details className="my-2 normal-case tracking-normal font-normal"><summary className="cursor-pointer">Required rating details{ompRatingIssues(option._ompInputs).length ? ` · ${ompRatingIssues(option._ompInputs).length} to complete` : ' · Complete'}</summary>
                          <div className="space-y-2 pt-2">{OMP_RATING_LABELS.map(label=><label key={label} className="block text-[10px] font-semibold">{label} *{OMP_RATING_OPTIONS[label] ? <select required aria-label={label} className="mt-1 h-7 w-full rounded border border-input bg-background px-1 text-xs font-normal" value={option._ompInputs?.[label]??''} onChange={e=>setVal(p,i,'_ompInputs',{...option._ompInputs,[label]:e.target.value})}><option value="" disabled>Select an insurer option</option>{OMP_RATING_OPTIONS[label].map(value=><option key={value}>{value}</option>)}</select> : <Input required type={label==='Date of birth'?'date':'text'} className="mt-1 h-7 text-xs font-normal" value={option._ompInputs?.[label] ?? ''} onChange={e=>setVal(p,i,'_ompInputs',{...option._ompInputs,[label]:e.target.value})} />}</label>)}{ompRatingIssues(option._ompInputs).length>0 && <p className="text-destructive" role="status">Complete or correct: {ompRatingIssues(option._ompInputs).join(', ')}.</p>}</div>
                        </details>
                        {p === "Life cover" && <Button className="my-1 h-7 text-xs normal-case tracking-normal" size="sm" disabled={!connected || quotesRunning || collectingAll || !ompSettingsComplete(activeTab,p,option) || ompRatingIssues(option._ompInputs).length>0} onClick={()=>void submitScenarios(activeTab,[i+1],p)}>Get quote</Button>}
                      </>}
                      <QuoteOptionReference key={`${activeTab}:${p}:${i}`} value={quoteReference(p, option, activeTab)} label={`${activeTab} ${p} ${coverOptionLabel(i)} quote number`}
                        onChange={number => setPlan(pl => ({ ...pl, [p]: pl[p].map((value, n) => n === i ? withQuoteReference(p, option, activeTab, number) : value) }))} />
                      {(() => { const result = quoteResult(p, option, activeTab); return result ? <div className="mt-2 space-y-1 normal-case tracking-normal">
                        <p className="text-xs font-semibold text-foreground">{new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(result.monthlyPremium)} / month</p>
                        {typeof result.cashbackPremium === "number" && <p className="text-[10px] font-normal">Includes R{result.cashbackPremium} cashback premium</p>}
                        <p className="text-[10px] font-normal">{result.source === "portal-verified" ? "Verified in insurer portal" : "Verified by Companion"}</p>
                        <p className="text-[10px] font-normal">Calculation recorded · PDF filing tracked in Documents</p>
                      </div> : null; })()}
                    </th>)}</tr>
                  </thead>
                  <tbody>
                    {source === "planning" && <tr className="border-t border-border bg-muted/30">
                      <td className="px-2 py-2 text-xs text-muted-foreground">Estimated premium / month <span className="block text-destructive">Unconfirmed · broker estimate</span></td>
                      {plan[p].map((v, i) => <td key={i} className="px-2 py-2"><Input aria-label={`${activeTab} ${p} ${coverOptionLabel(i)} estimated monthly premium`} className="h-8 text-xs tabular-nums" inputMode="decimal" placeholder="Not estimated" value={groupDigits(v[planningPremiumKey(activeTab)] ?? "")} onChange={e => setVal(p, i, planningPremiumKey(activeTab), e.target.value.replace(/[^\d.]/g, ""))} /></td>)}
                    </tr>}
                    {fields.map((f) => (
                      <tr key={f.key} className={cn("border-t border-border/60", f.key.includes(":") && "bg-muted/30")}>
                        <td className="px-2 py-1 text-xs leading-relaxed text-muted-foreground" title={f.label}>{f.label}</td>
                        {plan[p].map((v, i) => (
                          <td key={i} className="px-2 py-0.5">
                            {f.kind === "select" ? (
                              <select disabled={!providerFieldApplies(f,v)} className="h-6 w-full rounded border border-input bg-background px-1 text-[11px] disabled:opacity-50" value={providerFieldApplies(f,v) ? v[f.key] ?? (hasVerifiedProviderFields(activeTab, p) ? "" : f.options[0]) : ""} onChange={(e) => setVal(p, i, f.key, e.target.value)}>
                                {hasVerifiedProviderFields(activeTab, p) && <option value="" disabled>{providerFieldApplies(f,v) ? "Select an insurer option" : "Not applicable"}</option>}
                                {v[f.key] && !f.options.includes(v[f.key]) && <option value={v[f.key]} disabled>{v[f.key]} (saved)</option>}
                                {f.options.map((o) => <option key={o}>{o}</option>)}
                              </select>
                            ) : f.key === "benefit_amount" || f.key === "monthly_benefit" ? (
                              <span className="tabular-nums">{v[f.key] === "0" && i === 1 ? "No existing cover" : v[f.key] ? `R ${groupDigits(v[f.key])}` : i === 2 ? "Set in Needs Analysis" : "Financial information required"}</span>
                            ) : f.kind === "toggle" ? (
                              <div className="flex h-6 items-center"><input type="checkbox" aria-label={f.label} checked={!!v[f.key]} onChange={(e) => setVal(p, i, f.key, e.target.checked)} /></div>
                            ) : (
                              <div className="flex h-6 items-center gap-1">
                                <span className="w-3 shrink-0 text-muted-foreground">{f.kind === "amount" ? "R" : ""}</span>
                                <Input className="h-6 w-full px-1.5 text-[11px] tabular-nums" inputMode="decimal" value={f.kind === "amount" ? groupDigits(v[f.key]) : v[f.key]}
                                  disabled={!providerFieldApplies(f,v) || (f.key === "growth" && (v.increase_option === "No increase" || v.increase_option === "Cover increase: CPI rate"))}
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
                </>}
              </section>
            );
          })}

          <div className="flex items-center gap-1.5">
            <select className="h-6 rounded border border-input bg-background px-1.5 text-[11px]" value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Add a product…</option>
              {Object.keys(PRODUCT_TYPES).filter((p) => !plan[p]).map((p) => <option key={p}>{p}</option>)}
            </select>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" disabled={!adding}
              onClick={() => { setPlan((pl) => ({ ...pl, [adding]: defaultVariations(adding) })); setAdding(""); }}><Plus className="mr-0.5 h-3 w-3" />Add</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className={label}>{total * chosen.length * QUOTES_PER_COVER} premium variants planned across {chosen.length} selected insurer{chosen.length === 1 ? "" : "s"}</p>
            <Button size="sm" disabled={busy || products.length === 0} onClick={save}>{busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{spec ? "Update quote plan" : "Save quote plan"}</Button>
          </div>
          {!allComplete && <p className="text-xs text-destructive" role="status">{incompleteOptions.length ? `Complete missing values in: ${incompleteOptions.join(", ")}.` : "Add a product to prepare your quote plan."}</p>}
          </section>
          <section className="frame p-3 space-y-3" aria-label="Request and collect quotes">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">3</span><h4 className="font-semibold">Request & collect quotes</h4></div>
          {source === "planning" && <p className="text-xs text-muted-foreground">Save estimates with the quote plan. They stay separate from insurer quotes, do not increase the document count and do not unlock recommendations. Replace them with confirmed insurer figures before proceeding.</p>}
          {source === "email" && clientId && <DocumentRequestComposer unframed kind="quotes" workflowId={workflowId} clientId={clientId} clientName={[quoteClient?.first_name, quoteClient?.last_name].filter(Boolean).join(" ") || "the client"} />}
          {source === "companion" && <QuoteJobsPanel jobs={Object.fromEntries(chosen.map(ins => [ins, jobs[ins] ?? []]))} onStop={stopConnection} onRetry={(ins, n) => void submitScenarios(ins, [n])} />}
          {clientId && <QuotePdfCapture workflowId={workflowId} clientId={clientId} insurer={activeTab}
            onActivity={(ins, phase, detail) => recordActivity(ins, phase, detail)}
            premiumVariantFor={(ins, n) => jobs[ins]?.find((j) => j.n === n)?.premiumVariant}
            onScenarioSaved={(ins, n) => setJobs((j) => setStatus(j, ins, n, "captured", Date.now()))} />}
          {source === "companion" && /^discovery$/i.test(activeTab) && <DiscoveryScreenScan workflowId={workflowId} connected={login[activeTab] === "connected"} />}


          </section>
        </div>
      )}

    </div>
  );
}



