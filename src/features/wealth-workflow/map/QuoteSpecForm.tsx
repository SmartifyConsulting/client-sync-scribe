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
import { defaultVariations, productsFromNeeds } from "./needsProducts";

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
  const [otp, setOtp] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (spec) { setPlan(toPlan(spec)); setChosen(spec.insurers ?? []); return; }
    if (patientId && !finReady) return;
    setPlan(Object.fromEntries(productsFromNeeds(fin).map(({ product, amount }) => [product, defaultVariations(product, amount)])));
  }, [spec, isLoading, fin, finReady, patientId]);

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
    toast({ title: `Code passed to the ${ins} session` });
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
          <div role="tablist" className="flex flex-wrap gap-1 border-b border-border/60 pb-1">
            {chosen.map((t) => (
              <button key={t} role="tab" aria-selected={activeTab === t} onClick={() => setTab(t)}
                className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  activeTab === t ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-card text-muted-foreground hover:text-foreground")}>
                {t}<span className="ml-1 opacity-70">{total}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded border border-border/60 px-2 py-1">
            <KeyRound className="h-3 w-3 text-muted-foreground" />
            <span className={label}>{activeTab} sent a one-time PIN?</span>
            <Input className="h-6 w-24 px-1.5 text-[11px] tabular-nums" inputMode="numeric" autoComplete="one-time-code" placeholder="OTP"
              value={otp[activeTab] ?? ""} onChange={(e) => setOtp((o) => ({ ...o, [activeTab]: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
              onKeyDown={(e) => e.key === "Enter" && sendOtp(activeTab)} />
            <Button size="sm" variant="outline" className="h-6 rounded-full px-2 text-[10px]" onClick={() => sendOtp(activeTab)}>Submit</Button>
          </div>

          {products.map((p) => {
            const fields = PRODUCT_TYPES[p] ?? [];
            return (
              <div key={p} className="overflow-x-auto rounded-lg border border-border/60">
                <div className="flex items-center justify-between bg-muted/40 px-2 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{p}</span>
                  <button aria-label={`Remove ${p}`} className="text-muted-foreground hover:text-destructive"
                    onClick={() => setPlan((pl) => { const { [p]: _, ...rest } = pl; return rest; })}><X className="h-3 w-3" /></button>
                </div>
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
