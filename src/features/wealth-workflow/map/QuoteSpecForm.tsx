import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, X } from "lucide-react";
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
    queryKey: ["quote-insurer-names", user?.id], enabled: !!user && isWM,
    queryFn: async () => {
      const [cat, creds] = await Promise.all([
        db.from("app_integrations_catalog").select("id,name").eq("category", "insurance").eq("is_active", true).order("display_order"),
        db.from("broker_integration_credentials").select("integration_id,status").eq("broker_user_id", user!.id),
      ]);
      const ready = new Set((creds.data ?? []).filter((c: any) => c.status === "configured").map((c: any) => c.integration_id));
      return (cat.data ?? []).filter((c: any) => ready.has(c.id)).map((c: any) => c.name as string);
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

  /** Opening a tab asks the add-on to log in with the saved credentials. No reply = add-on missing. */
  const openTab = (ins: string) => {
    setTab(ins);
    if (login[ins] === "connected" || login[ins] === "connecting") return;
    setLogin((s) => ({ ...s, [ins]: "connecting" }));
    window.postMessage({ source: "holarc", type: "insurer-login", insurer: ins, workflowId }, window.location.origin);
    setTimeout(() => setLogin((s) => (s[ins] === "connecting" ? { ...s, [ins]: "no-addon" } : s)), 8000);
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

  /** Hands the code to the broker-side helper running the insurer's login for this session. */
  const sendOtp = (ins: string) => {
    const code = (otp[ins] ?? "").trim();
    if (!/^\d{4,8}$/.test(code)) return toast({ title: "Enter the 4–8 digit code from the insurer", variant: "destructive" });
    window.postMessage({ source: "holarc", type: "insurer-otp", insurer: ins, workflowId, otp: code }, window.location.origin);
    setOtp((o) => ({ ...o, [ins]: "" }));
    setOtpState((s) => ({ ...s, [ins]: "Waiting for the browser add-on…" }));
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
            return (
              <button key={ins} type="button" aria-pressed={on}
                onClick={() => setChosen((c) => (on ? c.filter((x) => x !== ins) : [...c, ins]))}
                className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
                {ins}
              </button>
            );
          })}
        </div>
      </div>

      {chosen.length > 0 && (
        <div className="space-y-2">
          <p className={label}>2 · Products from the needs analysis · 3 options each</p>
          <div role="tablist" className="flex flex-wrap items-end gap-0.5 border-b border-border">
            {chosen.map((t) => {
              const c = insurerColor(t);
              const on = activeTab === t;
              return (
                <button key={t} role="tab" aria-selected={on} onClick={() => openTab(t)}
                  className={cn("-mb-px flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1 text-[11px] font-medium transition-colors",
                    on ? "text-primary-foreground" : "border-transparent hover:opacity-90")}
                  style={on ? { background: `hsl(${c})`, borderColor: `hsl(${c})` } : { color: `hsl(${c})`, background: `hsl(${c} / 0.08)` }}>
                  {t}
                  <LoginRing state={login[t]} />
                </button>
              );
            })}
          </div>
          {login[activeTab] && login[activeTab] !== "connected" && (
            <p className={label}>{LOGIN_TEXT[login[activeTab]]}</p>
          )}
          <OtpDialog challenge={challenge} onClose={() => setChallenge(null)} onSubmit={submitChallenge} />


          <div className="flex flex-wrap items-center gap-1.5 rounded border border-border/60 px-2 py-1">
            <span className={label}>Shortfall formula · income years</span>
            <Input className="h-6 w-12 px-1.5 text-[11px] tabular-nums" inputMode="numeric" value={params.incomeYears}
              onChange={(e) => applyParams({ ...params, incomeYears: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            <span className={label}>· income protection %</span>
            <Input className="h-6 w-12 px-1.5 text-[11px] tabular-nums" inputMode="numeric" value={params.ipPercent}
              onChange={(e) => applyParams({ ...params, ipPercent: Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, 100) })} />
          </div>

          {products.map((p) => {
            const fields = PRODUCT_TYPES[p] ?? [];
            return (
              <div key={p} className="overflow-x-auto rounded-lg border border-border/60">
                <div className="flex items-center justify-between bg-foreground px-2 py-1 text-background">
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{p}</span>
                  <button aria-label={`Remove ${p}`} className="text-background/70 hover:text-background"
                    onClick={() => setPlan((pl) => { const { [p]: _, ...rest } = pl; return rest; })}><X className="h-3 w-3" /></button>
                </div>
                {formulaFor(p) && <p className="border-t border-border/60 px-2 py-1 text-[10px] tabular-nums text-muted-foreground">{formulaFor(p)}</p>}
                <table className="w-full">
                  <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-2 py-1 text-left font-medium">Variable</th>{plan[p].map((_, i) => <th key={i} className="px-2 py-1 text-left font-medium">Option {String.fromCharCode(65 + i)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.key} className="border-t border-border/60">
                        <td className="whitespace-nowrap px-2 py-0.5 text-muted-foreground">{f.label}</td>
                        {plan[p].map((v, i) => (
                          <td key={i} className="min-w-[120px] px-2 py-0.5">
                            {f.kind === "select" ? (
                              <select className="h-6 w-full rounded border border-input bg-background px-1 text-[11px]" value={v[f.key]} onChange={(e) => setVal(p, i, f.key, e.target.value)}>
                                {f.options.map((o) => <option key={o}>{o}</option>)}
                              </select>
                            ) : f.kind === "toggle" ? (
                              <input type="checkbox" aria-label={f.label} checked={!!v[f.key]} onChange={(e) => setVal(p, i, f.key, e.target.checked)} />
                            ) : (
                              <div className="flex items-center gap-1">
                                {f.kind === "amount" && <span className="text-muted-foreground">R</span>}
                                <Input className="h-6 px-1.5 text-[11px] tabular-nums" inputMode="decimal" value={f.kind === "amount" ? groupDigits(v[f.key]) : v[f.key]}
                                  disabled={f.key === "growth" && String(v.increase_option).includes("No increase")}
                                  onChange={(e) => setVal(p, i, f.key, e.target.value.replace(/[^\d.]/g, ""))} />
                                {f.kind === "percent" && <span className="text-muted-foreground">%</span>}
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
