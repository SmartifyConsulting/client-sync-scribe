import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { insurerColor } from "./insurerColors";
import { insurerFields, insurerKey } from "./insurerDictionary";
import { LoginRing, LOGIN_TEXT, OtpDialog, ProtectorDialog, addonInstalled, downloadAddon, type Challenge, type LoginState } from "./InsurerLogin";
import { CompanionSetup } from "./CompanionSetup";
import { QuotePdfCapture } from "./QuotePdfCapture";
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
export function QuoteSpecForm({ workflowId, isWM, patientId }: { workflowId: string; isWM: boolean; patientId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: spec, isLoading } = useQuery({
    queryKey: ["wealth-quote-spec", workflowId],
    queryFn: async () => (await db.from("wealth_quote_specs").select("*").eq("workflow_id", workflowId).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const { data: fin, isFetched: finReady } = useQuery({
    queryKey: ["fin-needs", patientId], enabled: !!patientId,
    queryFn: async () => (await db.from("client_financial_profiles").select("cash_flow,assets_liabilities,risk_portfolio").eq("patient_id", patientId).maybeSingle()).data,
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
  const [tab, setTab] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState<Record<string, LoginState>>({});
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [adding, setAdding] = useState("");
  const [params, setParams] = useState<NeedsParams>(DEFAULT_PARAMS);
  const needs = productsFromNeeds(fin, params);
  const formulaFor = (p: string) => needs.find((n) => n.product === p)?.formula;

  useEffect(() => {
    if (isLoading) return;
    if (spec) { setPlan(toPlan(spec)); setChosen(spec.insurers ?? []); return; }
    if (patientId && !finReady) return;
    setPlan(Object.fromEntries(productsFromNeeds(fin).map(({ product, amount }) => [product, defaultVariations(product, amount)])));
  }, [spec, isLoading, fin, finReady, patientId]);

  // Messages from the broker-side add-on driving the insurer login.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (e.origin !== window.location.origin || d?.source !== "holarc-extension" || d.workflowId !== workflowId) return;
      if (d.type === "insurer-login-progress") setLogin((s) => ({ ...s, [d.insurer]: d.state }));
      if (d.type === "insurer-challenge") {
        setLogin((s) => ({ ...s, [d.insurer]: "challenge" }));
        setChallenge({ insurer: d.insurer, method: d.method === "email" ? "email" : "otp", hint: d.hint });
      }
      if (d.type === "insurer-otp-result" || d.type === "insurer-login-result") {
        setLogin((s) => ({ ...s, [d.insurer]: d.ok ? "connected" : "failed" }));
        if (d.ok) setChallenge((c) => (c?.insurer === d.insurer ? null : c));
        else toast({ title: `${d.insurer} login failed`, description: d.message, variant: "destructive" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [workflowId]);

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
    setLogin((s) => ({ ...s, [ins]: "connecting" }));
    const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "reveal", integrationId: row.id, token } });
    if (error || data?.error) {
      sessionStorage.removeItem(TOKEN_KEY);
      setLogin((s) => ({ ...s, [ins]: "failed" }));
      return toast({ title: `Couldn't unlock the ${ins} login`, description: data?.error ?? "Please try again.", variant: "destructive" });
    }
    const f = data.fields ?? {};
    window.postMessage({ source: "holarc", type: "insurer-login", insurer: ins, workflowId, loginUrl: f.portal_url || row.portal_url,
      username: f.username ?? data.username, password: f.password }, window.location.origin);
  };
  const openTab = (ins: string) => {
    setTab(ins);
    if (login[ins] === "connected" || login[ins] === "connecting" || login[ins] === "challenge") return;
    if (!addonInstalled()) { setSetupOpen(true); return setLogin((s) => ({ ...s, [ins]: "no-addon" })); }
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

  const submitChallenge = (value: string) => {
    if (!challenge) return;
    window.postMessage({ source: "holarc", type: challenge.method === "otp" ? "insurer-otp" : "insurer-email-check", insurer: challenge.insurer, workflowId, otp: value }, window.location.origin);
    setLogin((s) => ({ ...s, [challenge.insurer]: "connecting" }));
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

  const label = "text-[10px] font-normal text-muted-foreground";
  return (
    <div className="space-y-2.5 rounded-lg border border-border/60 p-2.5 text-[11px] leading-tight">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Quote plan</p>

      <div>
        <p className={cn(label, "mb-1")}>1 · Insurers to quote</p>
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
      </div>

      {chosen.length > 0 && (
        <div className="space-y-2">
          <p className={label}>2 · Products from the needs analysis · 3 options each</p>
          <div role="tablist" className="flex flex-wrap items-end gap-0.5 border-b-2" style={{ borderColor: activeTab ? `hsl(${insurerColor(activeTab)})` : undefined }}>
            {chosen.map((t) => {
              const c = insurerColor(t);
              const on = activeTab === t;
              return (
                <button key={t} role="tab" aria-selected={on} onClick={() => openTab(t)}
                  className={cn("flex items-center gap-1.5 rounded-t-md px-3 font-semibold transition-all",
                    on ? "py-1.5 text-[11px] shadow-sm" : "py-1 text-[11px] opacity-75 hover:opacity-100")}
                  style={{ background: `hsl(${c})`, color: "hsl(var(--insurer-foreground))" }}>
                  {t}
                  <LoginRing state={login[t]} />
                </button>
              );
            })}
          </div>
          {login[activeTab] && login[activeTab] !== "connected" && (
            <p className={label}>{LOGIN_TEXT[login[activeTab]]}
              {login[activeTab] === "no-addon" && <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => setSetupOpen(true)}>One-time setup</Button>}
            </p>
          )}
          <OtpDialog challenge={challenge} onClose={() => setChallenge(null)} onSubmit={submitChallenge} />
          <ProtectorDialog open={!!askFor} busy={unlocking} onClose={() => setAskFor(null)} onSubmit={unlock} />
          <CompanionSetup open={setupOpen} onClose={() => setSetupOpen(false)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              const value = insurerRows.find((r) => r.name === activeTab)?.portal_url;
              try { const url = new URL(value ?? ""); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); window.open(url.href, "_blank", "noopener,noreferrer"); }
              catch { toast({ title: "Set this insurer's portal URL first.", variant: "destructive" }); }
            }}>Open portal</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setPortalEdit(activeTab); setPortalUrl(insurerRows.find((r) => r.name === activeTab)?.portal_url ?? ""); }}>Edit portal URL</Button>
            <span className={label}>Password Protector · 15-minute quote session</span>
          </div>
          {portalEdit === activeTab && <div className="flex gap-1.5">
            <Input type="url" aria-label={`${activeTab} portal URL`} className="h-7 text-xs" value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} />
            <Button size="sm" className="h-7 text-xs" onClick={savePortal}>Save URL</Button>
          </div>}
          {patientId && <QuotePdfCapture workflowId={workflowId} patientId={patientId} insurer={activeTab} />}


          <div className="flex flex-wrap items-center gap-1.5 rounded border border-border/60 px-2 py-1">
            <span className={label}>Shortfall formula · income years</span>
            <Input className="h-6 w-12 px-1.5 text-[11px] tabular-nums" inputMode="numeric" value={params.incomeYears}
              onChange={(e) => applyParams({ ...params, incomeYears: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            <span className={label}>· income protection %</span>
            <Input className="h-6 w-12 px-1.5 text-[11px] tabular-nums" inputMode="numeric" value={params.ipPercent}
              onChange={(e) => applyParams({ ...params, ipPercent: Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, 100) })} />
          </div>

          {products.map((p) => {
            const extra = activeTab ? insurerFields(activeTab, p).map((f) => ({ ...f, key: insurerKey(activeTab, f.key) })) : [];
            const fields = [...(PRODUCT_TYPES[p] ?? []), ...extra];
            return (
              <div key={p} className="overflow-x-auto rounded-lg border border-border/60">
                <div className="flex items-center justify-between bg-foreground px-2 py-1 text-background">
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{p}</span>
                  <button aria-label={`Remove ${p}`} className="text-background/70 hover:text-background"
                    onClick={() => setPlan((pl) => { const { [p]: _, ...rest } = pl; return rest; })}><X className="h-3 w-3" /></button>
                </div>
                {formulaFor(p) && <p className="border-t border-border/60 px-2 py-1 text-[10px] tabular-nums text-muted-foreground">{formulaFor(p)}</p>}
                <table className="w-full min-w-[560px] table-fixed">
                  <colgroup><col className="w-44" />{plan[p].map((_, i) => <col key={i} />)}</colgroup>
                  <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-2 py-1 text-left font-medium">Variable</th>{plan[p].map((_, i) => <th key={i} className="px-2 py-1 text-left font-medium">Option {String.fromCharCode(65 + i)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.key} className={cn("border-t border-border/60", f.key.includes(":") && "bg-muted/30")}>
                        <td className="truncate px-2 py-0.5 text-muted-foreground" title={f.label}>{f.label}</td>
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
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className={label}>{total} × {chosen.length} = <b>{total * chosen.length}</b> quotes to collect</p>
        <Button size="sm" className="h-7 rounded-full px-3 text-[11px]" disabled={busy || !allComplete || !chosen.length} onClick={save}>
          {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{spec ? "Update quote plan" : "Save quote plan"}
        </Button>
      </div>
      {chosen.length > 0 && !allComplete && <p className={label}>Fill in every amount for each option to save.</p>}
    </div>
  );
}
