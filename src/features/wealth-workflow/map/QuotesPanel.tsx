import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Sparkles, Trash2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useRecommendationHistory } from "../hooks";

type Viewer = "manager" | "client";
const db = supabase as any;
const R = (n?: number | null) => (n == null ? "—" : `R ${Math.round(Number(n)).toLocaleString("en-ZA")}`);

/** Step 3 and Step 4 outputs shown in the Working Window (instead of a repeated document list). */
export const QUOTE_STEPS = new Set([
  "Insurer schedules and claims history", "Cross-alert check", "Push profile to CRM",
  "Quote 6 insurers, rank top 3", "Select options and commentary", "Affordability check", "Generate ROA (versioned)",
]);

const INSURERS = ["Discovery", "Old Mutual", "Sanlam", "Liberty", "Momentum", "Hollard"];
const FACTORS = [1.0, 0.94, 1.08, 1.02, 0.97, 1.12];

export function QuotesPanel({ label, viewer, workflowId, records, clientFirst }: {
  label: string; viewer: Viewer; workflowId: string; records: any; clientFirst: string;
}) {
  const qc = useQueryClient();
  const quotes: any[] = records?.quotes ?? [];
  const holdings: any[] = records?.holdings ?? [];
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ insurer: "", product: "Life cover", premium: "", cover: "" });
  const { data: recs = [] } = useRecommendationHistory(workflowId);
  const { data: fin } = useQuery({
    queryKey: ["fin-cashflow", records?.patientId], enabled: !!records?.patientId,
    queryFn: async () => (await db.from("client_financial_profiles").select("cash_flow").eq("patient_id", records.patientId).maybeSingle()).data,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try { const r = await fn(); if (r?.error) throw r.error; toast({ title: ok }); refresh(); }
    catch (e: any) { toast({ title: "That didn't go through", description: e?.message ?? "Please try again.", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const isWM = viewer === "manager";
  const cf = fin?.cash_flow ?? {};
  const net = Number(cf.net_salary ?? 0);
  const surplus = net - Number(cf.fixed_expenses ?? 0) - Number(cf.discretionary_expenses ?? 0);
  const selected = quotes.filter((q) => q.selected);
  const selPremium = selected.reduce((a, q) => a + Number(q.monthly_premium || 0), 0);

  const QuoteTable = ({ selectable }: { selectable?: boolean }) => (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
          <tr><th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">Insurer</th><th className="px-2 py-1.5 text-right">Cover</th><th className="px-2 py-1.5 text-right">Premium / month</th>{(selectable || isWM) && <th className="w-8" />}</tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className={cn("border-t border-border/60", (q.rank ?? 99) <= 3 && "bg-[hsl(var(--owner-advisor-bg))]")}>
              <td className="px-2 py-1.5 font-semibold">{q.rank ?? "—"}</td>
              <td className="px-2 py-1.5">{q.insurer}<span className="block text-2xs text-muted-foreground">{q.product}{q.method === "assisted" ? " · indicative" : ""}</span></td>
              <td className="px-2 py-1.5 text-right">{R(q.cover_amount)}</td>
              <td className="px-2 py-1.5 text-right font-medium">{R(q.monthly_premium)}</td>
              {selectable && isWM ? (
                <td className="px-2"><input type="checkbox" aria-label={`Select ${q.insurer}`} checked={q.selected} disabled={busy}
                  onChange={() => run(() => db.from("wealth_quotes").update({ selected: !q.selected }).eq("id", q.id), q.selected ? "Removed from recommendation" : "Added to recommendation")} /></td>
              ) : isWM && !selectable ? (
                <td className="px-2"><button aria-label="Remove" className="text-muted-foreground hover:text-destructive" onClick={() => run(() => db.from("wealth_quotes").delete().eq("id", q.id), "Quote removed")}><Trash2 className="h-3.5 w-3.5" /></button></td>
              ) : selectable ? <td className="px-2">{q.selected && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--owner-advisor))]" />}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const rerank = async (rows: any[]) => {
    const sorted = [...rows].sort((a, b) => Number(a.monthly_premium) - Number(b.monthly_premium));
    for (let i = 0; i < sorted.length; i++) await db.from("wealth_quotes").update({ rank: i + 1 }).eq("id", sorted[i].id);
  };

  switch (label) {
    case "Insurer schedules and claims history":
      return holdings.length ? (
        <ul className="space-y-1.5 text-xs">
          {holdings.map((h) => (
            <li key={h.id} className="flex justify-between rounded-lg border border-border/60 px-3 py-2">
              <span>{h.provider}<span className="block text-2xs text-muted-foreground">{h.product} · {h.policy_number ?? "no policy number"}</span></span>
              <span className="text-right">{R(h.premium)}<span className="block text-2xs capitalize text-muted-foreground">{h.status ?? ""}</span></span>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">No policy schedules found yet.</p>;
    case "Cross-alert check": {
      const cats = holdings.reduce((m: Record<string, number>, h) => { const k = h.category ?? "other"; m[k] = (m[k] ?? 0) + 1; return m; }, {});
      const dup = Object.entries(cats).filter(([, n]) => (n as number) > 1);
      return (
        <div className="space-y-1.5 text-xs">
          {dup.length ? dup.map(([k, n]) => (
            <p key={k} className="flex items-start gap-2 rounded-lg bg-[hsl(var(--owner-insurer-bg))] p-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--owner-insurer))]" />{String(n)} policies in <b className="capitalize">{k}</b>. Check for overlapping cover before quoting.</p>
          )) : <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--owner-client))]" />No overlapping cover found across {holdings.length} policies.</p>}
        </div>
      );
    }
    case "Push profile to CRM":
      return <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">The CRM (Iress XPLAN) isn't connected yet. The client profile is kept here until the connection is set up.</p>;

    case "Quote 6 insurers, rank top 3":
      if (!quotes.length) {
        return isWM ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Choose how you'll quote for {clientFirst}:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 p-3 text-xs">
                <p className="mb-1 flex items-center gap-1.5 font-semibold"><PenLine className="h-3.5 w-3.5" />Option A · Enter my quotes</p>
                <p className="mb-2 text-muted-foreground">Capture quotes you got from insurer portals. Ranked by premium.</p>
                <div className="space-y-1.5">
                  <Input placeholder="Insurer" value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} />
                  <Input placeholder="Product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input placeholder="Cover (R)" inputMode="numeric" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
                    <Input placeholder="Premium (R)" inputMode="numeric" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} />
                  </div>
                  <Button size="sm" className="w-full rounded-full" disabled={busy || !form.insurer || !form.premium}
                    onClick={() => run(async () => { const r = await db.from("wealth_quotes").insert({ workflow_id: workflowId, method: "manual", insurer: form.insurer, product: form.product || "Life cover", monthly_premium: Number(form.premium), cover_amount: form.cover ? Number(form.cover) : null, rank: 1 }); setForm({ insurer: "", product: "Life cover", premium: "", cover: "" }); return r; }, "Quote added")}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Add quote
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 text-xs">
                <p className="mb-1 flex items-center gap-1.5 font-semibold"><Sparkles className="h-3.5 w-3.5" />Option B · Indicative comparison</p>
                <p className="mb-2 text-muted-foreground">Elysian AI prepares indicative premiums from 6 insurers, based on {clientFirst}'s income. Confirm final figures with each insurer.</p>
                <Button size="sm" variant="outline" className="w-full rounded-full" disabled={busy}
                  onClick={() => run(async () => {
                    const income = Number(cf.gross_income ?? 50000);
                    const cover = Math.round((income * 12 * 10) / 100000) * 100000;
                    const rows = INSURERS.map((ins, i) => ({ workflow_id: workflowId, method: "assisted", insurer: ins, product: "Life cover", cover_amount: cover, monthly_premium: Math.round((cover / 1000) * 0.11 * FACTORS[i]) }));
                    rows.sort((a, b) => a.monthly_premium - b.monthly_premium).forEach((r: any, i) => (r.rank = i + 1));
                    return db.from("wealth_quotes").insert(rows);
                  }, "Indicative comparison ready")}>
                  {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}Prepare comparison
                </Button>
              </div>
            </div>
          </div>
        ) : <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Quotes are being gathered from insurers.</p>;
      }
      return (
        <div className="space-y-2">
          <QuoteTable />
          <p className="text-2xs text-muted-foreground">Top 3 by premium are highlighted.{quotes.some((q) => q.method === "assisted") ? " Indicative figures — confirm with each insurer." : ""}</p>
          {isWM && quotes.some((q) => q.method === "manual") && (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
              <Input placeholder="Insurer" value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} />
              <Input placeholder="Premium (R)" inputMode="numeric" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} />
              <Button size="sm" disabled={busy || !form.insurer || !form.premium} onClick={() => run(async () => {
                const r = await db.from("wealth_quotes").insert({ workflow_id: workflowId, method: "manual", insurer: form.insurer, product: form.product || "Life cover", monthly_premium: Number(form.premium) }).select("*");
                if (r.error) return r;
                await rerank([...quotes, ...(r.data ?? [])]); setForm({ ...form, insurer: "", premium: "" }); return r;
              }, "Quote added")}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      );

    case "Select options and commentary":
      return quotes.length ? (
        <div className="space-y-2">
          <QuoteTable selectable />
          {selected.map((q) => (
            <div key={q.id} className="space-y-1">
              <p className="text-2xs font-semibold">Why {q.insurer}?</p>
              {isWM ? (
                <Textarea rows={2} defaultValue={q.commentary ?? ""} placeholder="Your reasoning for this option"
                  onBlur={(e) => e.target.value !== (q.commentary ?? "") && run(() => db.from("wealth_quotes").update({ commentary: e.target.value }).eq("id", q.id), "Commentary saved")} className="text-xs" />
              ) : <p className="text-xs text-muted-foreground">{q.commentary || "—"}</p>}
            </div>
          ))}
        </div>
      ) : <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">No quotes yet. Add them in the step above.</p>;

    case "Affordability check": {
      if (!selected.length) return <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Select at least one option to check affordability.</p>;
      const pct = net ? (selPremium / net) * 100 : 0;
      const ok = net > 0 && selPremium <= Math.max(surplus, 0) && pct <= 15;
      return (
        <div className="space-y-1.5 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border/60 p-2"><p className="text-2xs text-muted-foreground">Net salary</p><p className="font-semibold">{R(net)}</p></div>
            <div className="rounded-lg border border-border/60 p-2"><p className="text-2xs text-muted-foreground">Monthly surplus</p><p className="font-semibold">{R(surplus)}</p></div>
            <div className="rounded-lg border border-border/60 p-2"><p className="text-2xs text-muted-foreground">New premiums</p><p className="font-semibold">{R(selPremium)}</p></div>
          </div>
          <p className={cn("flex items-center gap-2 rounded-lg p-3", ok ? "bg-[hsl(var(--owner-client-bg))]" : "bg-[hsl(var(--owner-insurer-bg))]")}>
            {ok ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--owner-client))]" /> : <AlertTriangle className="h-4 w-4 text-[hsl(var(--owner-insurer))]" />}
            {net ? `${pct.toFixed(1)}% of net salary. ${ok ? "Affordable within the monthly surplus." : "Above 15% of net salary or the monthly surplus — review the options."}` : "Net salary not captured yet. Complete Financial Information first."}
          </p>
        </div>
      );
    }

    case "Generate ROA (versioned)": {
      const cur = recs.find((r) => r.status !== "superseded");
      return (
        <div className="space-y-2 text-xs">
          <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
            {isWM ? "Elysian AI drafts the Record of Advice from the selected options and your commentary. You review and approve it before presenting." : `Your Wealth Manager prepares the Record of Advice.`}
          </p>
          {cur ? (
            <p className="flex items-center gap-2 rounded-lg border border-border/60 p-3"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--owner-system))]" />Record of Advice v{cur.version} · <span className="capitalize">{cur.status.replace("_", " ")}</span>{cur.roa_document_id ? " · filed in Documents" : ""}</p>
          ) : isWM && selected.length ? (
            <Button className="w-full rounded-full" disabled={busy} onClick={() => run(() => db.from("wealth_recommendations").insert({
              workflow_id: workflowId, version: 1, status: "draft", title: "Risk cover recommendation",
              summary: selected.map((q) => `${q.insurer} ${q.product}: ${R(q.monthly_premium)}/month${q.commentary ? ` — ${q.commentary}` : ""}`).join("\n"),
            }), "Draft Record of Advice created")}>Draft Record of Advice</Button>
          ) : <p className="text-muted-foreground">Select options first.</p>}
        </div>
      );
    }
    default:
      return null;
  }
}
