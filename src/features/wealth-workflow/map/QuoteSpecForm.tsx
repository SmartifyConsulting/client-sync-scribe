import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPES, defaultVariation, variationComplete, type FieldDef } from "./quoteSpec";

const db = supabase as any;

/** Step 4: the WM chooses the insurance type, how many variations, what differs in each,
 *  and which insurers (with saved logins) to quote against. */
export function QuoteSpecForm({ workflowId, isWM }: { workflowId: string; isWM: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: spec, isLoading } = useQuery({
    queryKey: ["wealth-quote-spec", workflowId],
    queryFn: async () => (await db.from("wealth_quote_specs").select("*").eq("workflow_id", workflowId).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const { data: insurers = [] } = useQuery({
    queryKey: ["quote-insurers", user?.id], enabled: !!user && isWM,
    queryFn: async () => {
      const [cat, creds] = await Promise.all([
        db.from("app_integrations_catalog").select("id,name").eq("category", "insurance").eq("is_active", true).order("display_order"),
        db.from("broker_integration_credentials").select("integration_id,is_enabled,status").eq("broker_user_id", user!.id),
      ]);
      const ready = new Set((creds.data ?? []).filter((c: any) => c.is_enabled && c.status === "configured").map((c: any) => c.integration_id));
      return (cat.data ?? []).map((c: any) => ({ name: c.name, ready: ready.has(c.id) }));
    },
  });

  const [product, setProduct] = useState("Life cover");
  const [variations, setVariations] = useState<Record<string, any>[]>([defaultVariation(PRODUCT_TYPES["Life cover"])]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!spec) return;
    setProduct(spec.product_type); setVariations(spec.variations ?? []); setChosen(spec.insurers ?? []);
  }, [spec]);

  const fields: FieldDef[] = PRODUCT_TYPES[product] ?? [];
  const setCount = (n: number) => setVariations((v) => Array.from({ length: n }, (_, i) => v[i] ?? defaultVariation(fields)));
  const changeProduct = (p: string) => { setProduct(p); setVariations((v) => v.map(() => defaultVariation(PRODUCT_TYPES[p]))); };
  const setVal = (i: number, k: string, val: any) => setVariations((v) => v.map((x, j) => (j === i ? { ...x, [k]: val } : x)));

  const allComplete = variations.length > 0 && variations.every((v) => variationComplete(fields, v));
  const save = async () => {
    setBusy(true);
    const row = { workflow_id: workflowId, product_type: product, variations, insurers: chosen, updated_at: new Date().toISOString() };
    const { error } = spec ? await db.from("wealth_quote_specs").update(row).eq("id", spec.id) : await db.from("wealth_quote_specs").insert(row);
    setBusy(false);
    if (error) return toast({ title: "Couldn't save the quote plan", description: error.message, variant: "destructive" });
    toast({ title: "Quote plan saved", description: `${variations.length} variation(s) × ${chosen.length} insurer(s) = ${variations.length * chosen.length} quotes to collect.` });
    qc.invalidateQueries({ queryKey: ["wealth-quote-spec", workflowId] });
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!isWM) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3 text-xs">
      <p className="font-semibold">Quote plan</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1"><span className="text-2xs text-muted-foreground">1 · Type of insurance</span>
          <select className="h-8 w-full rounded-md border border-input bg-background px-2" value={product} onChange={(e) => changeProduct(e.target.value)}>
            {Object.keys(PRODUCT_TYPES).map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="space-y-1"><span className="text-2xs text-muted-foreground">2 · Number of quote variations</span>
          <select className="h-8 w-full rounded-md border border-input bg-background px-2" value={variations.length} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-1 text-2xs text-muted-foreground">3 · What makes each variation different</p>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full">
            <thead className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-2 py-1.5 text-left">Variable</th>{variations.map((_, i) => <th key={i} className="px-2 py-1.5 text-left">Option {String.fromCharCode(65 + i)}</th>)}</tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.key} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-2 py-1">{f.label}</td>
                  {variations.map((v, i) => (
                    <td key={i} className="min-w-[130px] px-2 py-1">
                      {f.kind === "select" ? (
                        <select className="h-7 w-full rounded-md border border-input bg-background px-1" value={v[f.key]} onChange={(e) => setVal(i, f.key, e.target.value)}>
                          {f.options.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : f.kind === "toggle" ? (
                        <input type="checkbox" aria-label={f.label} checked={!!v[f.key]} onChange={(e) => setVal(i, f.key, e.target.checked)} />
                      ) : (
                        <div className="flex items-center gap-1">
                          {f.kind === "amount" && <span className="text-muted-foreground">R</span>}
                          <Input className="h-7 text-xs" inputMode="decimal" value={v[f.key]} disabled={f.key === "growth" && String(v.increase_option).includes("No increase")}
                            onChange={(e) => setVal(i, f.key, e.target.value.replace(/[^\d.]/g, ""))} />
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
      </div>

      <div>
        <p className="mb-1 text-2xs text-muted-foreground">4 · Insurers to quote (logins saved in App Integrations)</p>
        <div className="flex flex-wrap gap-1.5">
          {insurers.map((ins: any) => {
            const on = chosen.includes(ins.name);
            return (
              <button key={ins.name} type="button" disabled={!ins.ready}
                title={ins.ready ? "" : "Add this insurer's login in App Integrations first"}
                onClick={() => setChosen((c) => (on ? c.filter((x) => x !== ins.name) : [...c, ins.name]))}
                className={cn("flex items-center gap-1 rounded-full border px-3 py-1",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                  !ins.ready && "opacity-50")}>
                {!ins.ready && <Lock className="h-3 w-3" />}{ins.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs text-muted-foreground">{variations.length} × {chosen.length} = <b>{variations.length * chosen.length}</b> quotes to collect</p>
        <Button size="sm" className="rounded-full" disabled={busy || !allComplete || !chosen.length} onClick={save}>
          {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{spec ? "Update quote plan" : "Save quote plan"}
        </Button>
      </div>
      {!allComplete && <p className="text-2xs text-muted-foreground">Fill in every amount for each option to save.</p>}
    </div>
  );
}
