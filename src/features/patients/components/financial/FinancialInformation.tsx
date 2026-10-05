import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionHeader, FIELD_GRID_2_CLASS } from "../sectionStyles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Wallet, Landmark, ShieldCheck, TrendingUp, Target, ScrollText, Car, StickyNote, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Field = { key: string; label: string; type?: "number" | "text" | "date" | "textarea"; options?: string[]; placeholder?: string };
type Col = { key: string; label: string; type?: "number" | "text"; options?: string[]; placeholder?: string };
type SectionKey = "cash_flow" | "assets_liabilities" | "risk_portfolio" | "investments" | "goals_risk" | "estate" | "car_insurance";
type SectionDef = { key: SectionKey; label: string; icon: any; fields?: Field[]; list?: { key: string; label: string; cols: Col[] } };
const GENERAL_NOTES_KEY = "general_notes";

const SECTIONS: SectionDef[] = [
  { key: "cash_flow", label: "General & Cash Flow", icon: Wallet, fields: [
    { key: "gross_income", label: "Gross monthly income (R)", type: "number", placeholder: "e.g. 45000" },
    { key: "net_salary", label: "Net monthly salary (R)", type: "number", placeholder: "e.g. 34000" },
    { key: "fixed_expenses", label: "Fixed monthly expenses (R)", type: "number", placeholder: "Rent, loans, school fees…" },
    { key: "discretionary_expenses", label: "Discretionary monthly expenses (R)", type: "number", placeholder: "Entertainment, shopping…" },
    { key: "tax_bracket", label: "Marginal tax bracket", options: ["18%", "26%", "31%", "36%", "39%", "41%", "45%"] },
  ] },
  { key: "assets_liabilities", label: "Assets & Liabilities", icon: Landmark, list: { key: "items", label: "Item", cols: [
    { key: "kind", label: "Type", options: ["Property", "Vehicle", "Cash / savings", "Other asset", "Home loan (bond)", "Vehicle finance", "Credit card", "Personal loan", "Other debt"] },
    { key: "description", label: "Description", placeholder: "e.g. Primary residence, Sandton" },
    { key: "value", label: "Value / balance (R)", type: "number" },
  ] } },
  { key: "risk_portfolio", label: "Existing Risk Portfolio", icon: ShieldCheck, list: { key: "policies", label: "Policy", cols: [
    { key: "kind", label: "Cover type", options: ["Life cover", "Disability", "Income protection", "Severe illness", "Short-term (assets)", "Funeral"] },
    { key: "insurer", label: "Insurer", placeholder: "e.g. Sanlam" },
    { key: "cover", label: "Cover amount (R)", type: "number" },
    { key: "premium", label: "Monthly premium (R)", type: "number" },
  ] } },
  { key: "car_insurance", label: "Car / Short-Term Insurance", icon: Car, fields: [
    { key: "current_insurer", label: "Current insurer", placeholder: "e.g. Outsurance" },
    { key: "monthly_premium", label: "Monthly premium (R)", type: "number" },
    { key: "years_continuous_cover", label: "Years of continuous, uninterrupted cover", type: "number", placeholder: "e.g. 5" },
    { key: "vehicle_colour", label: "Colour of vehicle(s)", placeholder: "e.g. White" },
    { key: "has_claims", label: "Any previous claims?", options: ["Yes", "No"] },
    { key: "claim_date", label: "When was the last claim?", type: "date" },
    { key: "claim_reason", label: "What was the claim for?", placeholder: "e.g. Windscreen, collision…" },
    { key: "wants_quote", label: "Wants a free, no-obligation quote?", options: ["Yes", "No"] },
  ] },
  { key: "investments", label: "Investments & Retirement", icon: TrendingUp, list: { key: "holdings", label: "Investment", cols: [
    { key: "kind", label: "Type", options: ["Retirement annuity", "Pension fund", "Provident fund", "Preservation fund", "Tax-free savings", "Unit trusts", "Endowment", "Other"] },
    { key: "provider", label: "Provider", placeholder: "e.g. Allan Gray" },
    { key: "value", label: "Current value (R)", type: "number" },
    { key: "contribution", label: "Monthly contribution (R)", type: "number" },
  ] } },
  { key: "goals_risk", label: "Goals & Risk Profile", icon: Target, fields: [
    { key: "retirement_age", label: "Target retirement age", type: "number", placeholder: "e.g. 65" },
    { key: "retirement_income", label: "Desired retirement income (R / month)", type: "number" },
    { key: "risk_profile", label: "Investment risk tolerance", options: ["Conservative", "Moderately conservative", "Moderate", "Moderately aggressive", "Aggressive"] },
    { key: "goals", label: "Financial goals", type: "textarea", placeholder: "e.g. Save for children's tertiary education, buy a holiday home…" },
  ] },
  { key: "estate", label: "Estate & Succession Planning", icon: ScrollText, fields: [
    { key: "will_status", label: "Will status", options: ["No will", "Will in place", "Will outdated"] },
    { key: "will_date", label: "Date of latest will", type: "date" },
    { key: "executor", label: "Nominated executor", placeholder: "Full name" },
    { key: "trusts", label: "Trusts", type: "textarea" },
  ] },
];

const zar = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;
const num = (v: any) => Number(v) || 0;
const LIAB = ["Home loan (bond)", "Vehicle finance", "Credit card", "Personal loan", "Other debt"];

export function estateDuty(netEstate: number) {
  const dutiable = Math.max(0, netEstate - 3_500_000);
  return dutiable <= 30_000_000 ? dutiable * 0.2 : 6_000_000 + (dutiable - 30_000_000) * 0.25;
}

export function FinancialInformation({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["client-financial-profile", patientId],
    queryFn: async () => (await (supabase as any).from("client_financial_profiles").select("*").eq("patient_id", patientId).maybeSingle()).data,
  });
  const issued = useQuery({
    queryKey: ["client-issued-policies", patientId],
    queryFn: async () => (await (supabase as any).from("wealth_applications").select("id,product,provider,monthly_premium,status,wealth_workflows!inner(patient_id)").eq("wealth_workflows.patient_id", patientId).eq("status", "issued")).data ?? [],
  });
  const [data, setData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { if (q.data !== undefined) setData(q.data ?? {}); }, [q.data]);

  const sec = (k: SectionKey) => data[k] ?? {};
  const set = (k: SectionKey, v: any) => setData((d) => ({ ...d, [k]: v }));

  /** How much of a section is filled in — drives the progress pill in its header. */
  const progress = (s: SectionDef): { filled: number; total: number } => {
    const v = sec(s.key);
    if (s.list) {
      const rows: any[] = v[s.list.key] ?? [];
      return { filled: rows.length, total: Math.max(rows.length, 1) };
    }
    const fields = s.fields ?? [];
    return { filled: fields.filter((f) => v[f.key] !== undefined && v[f.key] !== null && v[f.key] !== "").length, total: fields.length };
  };
  const completedSections = SECTIONS.filter((s) => { const p = progress(s); return p.filled > 0; }).length;

  const summary = useMemo(() => {
    const cf = sec("cash_flow");
    const surplus = num(cf.net_salary) - num(cf.fixed_expenses) - num(cf.discretionary_expenses);
    const items: any[] = sec("assets_liabilities").items ?? [];
    const assets = items.filter((i) => !LIAB.includes(i.kind)).reduce((s, i) => s + num(i.value), 0);
    const liabs = items.filter((i) => LIAB.includes(i.kind)).reduce((s, i) => s + num(i.value), 0);
    const inv = (sec("investments").holdings ?? []).reduce((s: number, i: any) => s + num(i.value), 0);
    const net = assets + inv - liabs;
    return { surplus, assets, liabs, net, duty: estateDuty(net) };
  }, [data]);

  const save = async (k: SectionKey) => {
    setSaving(k);
    const { error } = await (supabase as any).from("client_financial_profiles").upsert({ patient_id: patientId, [k]: sec(k) }, { onConflict: "patient_id" });
    setSaving(null);
    if (error) return toast.error("Couldn't save. You may not have access to this client's record.");
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["client-financial-profile", patientId] });
  };

  const saveNotes = async () => {
    setSaving(GENERAL_NOTES_KEY);
    const { error } = await (supabase as any).from("client_financial_profiles").upsert({ patient_id: patientId, general_notes: data[GENERAL_NOTES_KEY] ?? null }, { onConflict: "patient_id" });
    setSaving(null);
    if (error) return toast.error("Couldn't save. You may not have access to this client's record.");
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["client-financial-profile", patientId] });
  };

  const renderInput = (value: any, onChange: (v: any) => void, f: Field | Col) =>
    f.options ? (
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    ) : (f as Field).type === "textarea" ? (
      <Textarea placeholder={f.placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />
    ) : (
      <Input className="h-9" placeholder={f.placeholder} type={f.type === "number" ? "number" : (f as Field).type === "date" ? "date" : "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    );

  const ProgressPill = ({ filled, total }: { filled: number; total: number }) => (
    <span className={cn(
      "section-count-pill flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold",
      filled === 0 ? "bg-white/15 text-white/80" : filled >= total ? "bg-white text-primary" : "bg-white/25 text-white",
    )}>
      {filled >= total && total > 0 && <Check className="h-3 w-3" />}
      {filled}/{total}
    </span>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm">
        <span className="font-medium text-foreground">Needs Analysis progress</span>
        <span className="text-muted-foreground">{completedSections} of {SECTIONS.length} sections started</span>
      </div>
      <div className="patient-section-frame rounded-xl border border-border bg-card overflow-hidden divide-y divide-white">
      {SECTIONS.map((s) => {
        const v = sec(s.key);
        const p = progress(s);
        return (
          <Collapsible key={s.key} defaultOpen={false} className="bg-card overflow-hidden">
            <SectionHeader icon={s.icon} label={s.label} extra={<ProgressPill filled={p.filled} total={p.total} />} />
            <CollapsibleContent className="p-3 space-y-3">
              {s.fields && (
                <div className={FIELD_GRID_2_CLASS}>
                  {s.fields.map((f) => (
                    <div key={f.key} className={f.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                      <Label className="text-xs">{f.label}</Label>
                      {renderInput(v[f.key], (nv) => set(s.key, { ...v, [f.key]: nv }), f)}
                    </div>
                  ))}
                </div>
              )}
              {s.list && (
                <div className="space-y-2">
                  {(v[s.list.key] ?? []).map((row: any, i: number) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))_auto] items-end rounded-xl border border-border p-2">
                      {s.list!.cols.map((c) => (
                        <div key={c.key} className="space-y-1">
                          <Label className="text-xs">{c.label}</Label>
                          {renderInput(row[c.key], (nv) => {
                            const rows = [...(v[s.list!.key] ?? [])]; rows[i] = { ...row, [c.key]: nv };
                            set(s.key, { ...v, [s.list!.key]: rows });
                          }, c)}
                        </div>
                      ))}
                      <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => {
                        const rows = [...(v[s.list!.key] ?? [])]; rows.splice(i, 1); set(s.key, { ...v, [s.list!.key]: rows });
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => set(s.key, { ...v, [s.list!.key]: [...(v[s.list!.key] ?? []), {}] })}>
                    <Plus className="h-4 w-4 mr-1" />Add {s.list.label.toLowerCase()}
                  </Button>
                </div>
              )}

              {s.key === "cash_flow" && <p className="text-sm">Monthly surplus: <strong className={summary.surplus < 0 ? "text-destructive" : "text-primary-dark"}>{zar(summary.surplus)}</strong></p>}
              {s.key === "assets_liabilities" && (
                <p className="text-sm">Assets {zar(summary.assets)} · Liabilities {zar(summary.liabs)} · <strong className="text-primary-dark">Net worth (incl. investments) {zar(summary.net)}</strong></p>
              )}
              {s.key === "risk_portfolio" && (issued.data as any[])?.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-primary-dark">Issued through Holarc Wealth</p>
                  {(issued.data as any[]).map((a) => (
                    <p key={a.id} className="text-muted-foreground">{a.product} · {a.provider}{a.monthly_premium ? ` · ${zar(num(a.monthly_premium))}/m` : ""}</p>
                  ))}
                </div>
              )}
              {s.key === "estate" && (
                <p className="text-sm">Estimated estate duty: <strong className="text-primary-dark">{zar(summary.duty)}</strong>
                  <span className="block text-xs text-muted-foreground">Guide only: 20% on the net estate above R3.5m and 25% above R30m. Excludes executor fees, CGT and spousal deductions.</span></p>
              )}
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save(s.key)} disabled={saving === s.key}>{saving === s.key ? "Saving…" : "Save"}</Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
      <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
        <SectionHeader icon={StickyNote} label="General Notes" />
        <CollapsibleContent className="p-3 space-y-3">
          <p className="text-xs text-muted-foreground">Meeting commentary that doesn't belong under a specific field above.</p>
          <Textarea value={data[GENERAL_NOTES_KEY] ?? ""} onChange={(e) => setData((d) => ({ ...d, [GENERAL_NOTES_KEY]: e.target.value }))} rows={5} />
          <div className="flex justify-end">
            <Button size="sm" onClick={saveNotes} disabled={saving === GENERAL_NOTES_KEY}>{saving === GENERAL_NOTES_KEY ? "Saving…" : "Save"}</Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
      </div>
    </div>
  );
}
