import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionHeader } from "../sectionStyles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Field = { key: string; label: string; type?: "number" | "text" | "date" | "textarea"; options?: string[] };
type Col = { key: string; label: string; type?: "number" | "text"; options?: string[] };
type SectionKey = "cash_flow" | "assets_liabilities" | "risk_portfolio" | "investments" | "goals_risk" | "estate";
type SectionDef = { key: SectionKey; label: string; fields?: Field[]; list?: { key: string; label: string; cols: Col[] } };

const SECTIONS: SectionDef[] = [
  { key: "cash_flow", label: "General & Cash Flow", fields: [
    { key: "gross_income", label: "Gross monthly income (R)", type: "number" },
    { key: "net_salary", label: "Net monthly salary (R)", type: "number" },
    { key: "fixed_expenses", label: "Fixed monthly expenses (R)", type: "number" },
    { key: "discretionary_expenses", label: "Discretionary monthly expenses (R)", type: "number" },
    { key: "tax_bracket", label: "Marginal tax bracket", options: ["18%", "26%", "31%", "36%", "39%", "41%", "45%"] },
  ] },
  { key: "assets_liabilities", label: "Assets & Liabilities", list: { key: "items", label: "Item", cols: [
    { key: "kind", label: "Type", options: ["Property", "Vehicle", "Cash / savings", "Other asset", "Home loan (bond)", "Vehicle finance", "Credit card", "Personal loan", "Other debt"] },
    { key: "description", label: "Description" },
    { key: "value", label: "Value / balance (R)", type: "number" },
  ] } },
  { key: "risk_portfolio", label: "Existing Risk Portfolio", list: { key: "policies", label: "Policy", cols: [
    { key: "kind", label: "Cover type", options: ["Life cover", "Disability", "Income protection", "Severe illness", "Short-term (assets)", "Funeral"] },
    { key: "insurer", label: "Insurer" },
    { key: "cover", label: "Cover amount (R)", type: "number" },
    { key: "premium", label: "Monthly premium (R)", type: "number" },
  ] } },
  { key: "investments", label: "Investments & Retirement", list: { key: "holdings", label: "Investment", cols: [
    { key: "kind", label: "Type", options: ["Retirement annuity", "Pension fund", "Provident fund", "Preservation fund", "Tax-free savings", "Unit trusts", "Endowment", "Other"] },
    { key: "provider", label: "Provider" },
    { key: "value", label: "Current value (R)", type: "number" },
    { key: "contribution", label: "Monthly contribution (R)", type: "number" },
  ] } },
  { key: "goals_risk", label: "Goals & Risk Profile", fields: [
    { key: "retirement_age", label: "Target retirement age", type: "number" },
    { key: "retirement_income", label: "Desired retirement income (R / month)", type: "number" },
    { key: "risk_profile", label: "Investment risk tolerance", options: ["Conservative", "Moderately conservative", "Moderate", "Moderately aggressive", "Aggressive"] },
    { key: "goals", label: "Financial goals", type: "textarea" },
  ] },
  { key: "estate", label: "Estate & Succession Planning", fields: [
    { key: "will_status", label: "Will status", options: ["No will", "Will in place", "Will outdated"] },
    { key: "will_date", label: "Date of latest will", type: "date" },
    { key: "executor", label: "Nominated executor" },
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

  const renderInput = (value: any, onChange: (v: any) => void, f: Field | Col) =>
    f.options ? (
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    ) : (f as Field).type === "textarea" ? (
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />
    ) : (
      <Input className="h-9" type={f.type === "number" ? "number" : (f as Field).type === "date" ? "date" : "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    );

  return (
    <div className="patient-section-frame rounded-xl border border-neutral-400 bg-card overflow-hidden divide-y divide-white">
      {SECTIONS.map((s) => {
        const v = sec(s.key);
        return (
          <Collapsible key={s.key} defaultOpen={false} className="bg-card overflow-hidden">
            <SectionHeader icon={null} label={s.label} />
            <CollapsibleContent className="p-3 space-y-3">
              {s.fields && (
                <div className="grid gap-3 sm:grid-cols-2">
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
                    <div key={i} className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))_auto] items-end rounded-lg border border-border p-2">
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
    </div>
  );
}
