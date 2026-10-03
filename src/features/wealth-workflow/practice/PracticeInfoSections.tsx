import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PracticeLogos } from "./PracticeLogos";
import { usePracticeInfo, useSavePracticeInfo, type PracticeInfo, type Suppliers } from "./usePracticeInfo";

export const FSCA_CATEGORIES = [
  "1.1 Long-term Insurance – Category A", "1.2 Short-term Insurance Personal Lines", "1.3 Long-term Insurance: Category B1",
  "1.4 Long-term Insurance: Category C", "1.5 Retail Pension Benefits", "1.6 Short-term Insurance Commercial Lines",
  "1.7 Pension Fund Benefits", "1.8 Securities and Instruments: Shares", "1.14 Participatory interests in Collective Investment Schemes",
  "1.20 Long-term Insurance: Category B2", "1.21 Long-term Insurance: Category B2-A", "1.22 Long-term Insurance subcategory B1-A",
  "1.23 Short-term Insurance Personal Lines A-1",
];

type F = { k: string; label: string; long?: boolean; type?: string };
const PLANNER: F[] = [
  { k: "title", label: "Title" }, { k: "planner_name", label: "Name of planner" }, { k: "id_number", label: "ID number" },
  { k: "postal_address", label: "Postal address" }, { k: "phone", label: "Tel / Cell" },
  { k: "email_primary", label: "Email (firm)" }, { k: "email_secondary", label: "Email (personal)" },
  { k: "planner_status", label: "Planner status" }, { k: "qualification", label: "Highest qualification" },
  { k: "experience_years", label: "Experience (years)", type: "number" },
];
const FIRM: F[] = [
  { k: "fsp_name", label: "FSP name" }, { k: "fsb_licence", label: "FSP licence number" },
  { k: "registration_number", label: "Registration number" }, { k: "firm_phone", label: "Firm telephone" },
  { k: "firm_address", label: "Physical address" }, { k: "firm_website", label: "Website" },
  { k: "directors", label: "Directors", long: true }, { k: "fsp_legal_status", label: "FSP and legal status", long: true },
];
const COMPLIANCE: F[] = [
  { k: "compliance_officer", label: "Compliance officer" }, { k: "compliance_phone", label: "Telephone" },
  { k: "compliance_fax", label: "Fax" }, { k: "compliance_email", label: "Email" },
  { k: "complaints_address", label: "Complaints procedure", long: true },
  { k: "conflict_policy", label: "Conflict of interest policy and register", long: true },
];
const SUPPLIER_COLS: { k: keyof Suppliers; label: string }[] = [
  { k: "short_term", label: "Short term" }, { k: "life", label: "Life" }, { k: "investments", label: "Investments" }, { k: "health", label: "Health" },
];

function useDraft() {
  const { user } = useAuth();
  const q = usePracticeInfo(user?.id);
  const save = useSavePracticeInfo(user?.id);
  const { toast } = useToast();
  const [d, setD] = useState<Partial<PracticeInfo>>({});
  useEffect(() => { if (q.data) setD(q.data); }, [q.data]);
  const commit = (patch?: Partial<PracticeInfo>) => {
    const { created_at, updated_at, user_id, ...rest } = { ...d, ...(patch ?? {}) } as any;
    save.mutate(rest, {
      onSuccess: () => toast({ title: "Saved" }),
      onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
    });
  };
  return { d, setD, commit, saving: save.isPending };
}

function Fields({ fields, d, setD }: { fields: F[]; d: any; setD: (v: any) => void }) {
  return (
    <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.k} className={f.long ? "sm:col-span-2 space-y-1" : "flex items-center gap-3"}>
          <Label className={f.long ? "text-xs font-semibold" : "w-40 shrink-0 text-xs font-semibold"}>{f.label}</Label>
          {f.long ? (
            <Textarea rows={3} className="text-xs" value={d[f.k] ?? ""} onChange={(e) => setD({ ...d, [f.k]: e.target.value })} />
          ) : (
            <Input type={f.type} className="h-8 flex-1 text-xs" value={d[f.k] ?? ""}
              onChange={(e) => setD({ ...d, [f.k]: f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value })} />
          )}
        </div>
      ))}
    </div>
  );
}

function Section({ value, title, children }: { value: string; title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="border-0">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <h3 className="text-xs font-semibold text-primary-dark">{title}</h3>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return <div className="mt-3 flex justify-end"><Button size="sm" onClick={onSave} disabled={saving}>Save</Button></div>;
}

/** Planner, firm, compliance, suppliers and remuneration — every field from the FSP Introduction Letter. */
export function PracticeInfoSections() {
  const { d, setD, commit, saving } = useDraft();
  const sup: Suppliers = (d.product_suppliers as Suppliers) ?? { short_term: [], life: [], investments: [], health: [] };
  const top = (d.top_suppliers as any[]) ?? [];
  const topRows = [0, 1, 2].map((i) => top[i] ?? { name: "", percent: null });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Accordion type="multiple" className="divide-y divide-border">
        <Section value="logos" title="Logos">
          <PracticeLogos />
        </Section>
        <Section value="planner" title="Planner Details">
          <Fields fields={PLANNER} d={d} setD={setD} /><SaveBar onSave={() => commit()} saving={saving} />
        </Section>
        <Section value="fsp" title="Financial Services Provider">
          <Fields fields={FIRM} d={d} setD={setD} /><SaveBar onSave={() => commit()} saving={saving} />
        </Section>
        <Section value="compliance" title="Compliance">
          <Fields fields={COMPLIANCE} d={d} setD={setD} /><SaveBar onSave={() => commit()} saving={saving} />
        </Section>
        <Section value="suppliers" title="Product Suppliers">
          <div className="grid gap-4 sm:grid-cols-4">
            {SUPPLIER_COLS.map((c) => (
              <div key={c.k} className="space-y-1">
                <Label className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{c.label}</Label>
                <Textarea rows={9} className="text-xs" placeholder="One per line" value={(sup[c.k] ?? []).join("\n")}
                  onChange={(e) => setD({ ...d, product_suppliers: { ...sup, [c.k]: e.target.value.split("\n") } })} />
              </div>
            ))}
          </div>
          <SaveBar saving={saving} onSave={() => {
            const clean = Object.fromEntries(Object.entries(sup).map(([k, v]) => [k, (v as string[]).map((s) => s.trim()).filter(Boolean)]));
            commit({ product_suppliers: clean as Suppliers });
          }} />
        </Section>
        <Section value="remuneration" title="Remuneration Disclosure">
          <div className="space-y-3">
            <Fields d={d} setD={setD} fields={[
              { k: "remuneration_basis", label: "How representatives are paid", long: true },
              { k: "shareholding_statement", label: "Shareholding in product suppliers", long: true },
            ]} />
            <div>
              <Label className="text-xs font-semibold">Suppliers paying more than 30% of total remuneration (past 12 months)</Label>
              <div className="mt-1.5 space-y-1.5">
                {topRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 text-xs text-muted-foreground">{i + 1}.</span>
                    <Input className="h-8 flex-1 text-xs" placeholder="Supplier" value={r.name ?? ""}
                      onChange={(e) => { const n = [...topRows]; n[i] = { ...r, name: e.target.value }; setD({ ...d, top_suppliers: n }); }} />
                    <Input className="h-8 w-20 text-xs" type="number" placeholder="%" value={r.percent ?? ""}
                      onChange={(e) => { const n = [...topRows]; n[i] = { ...r, percent: e.target.value === "" ? null : Number(e.target.value) }; setD({ ...d, top_suppliers: n }); }} />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SaveBar saving={saving} onSave={() => commit({ top_suppliers: topRows.filter((r) => r.name?.trim()) })} />
        </Section>
      </Accordion>
    </div>
  );
}

/** Credentials tab: authorised FSCA product categories and PI cover. */
export function FscaCategoriesCard() {
  const { d, setD, commit, saving } = useDraft();
  const cats: string[] = (d.fsca_categories as string[]) ?? [];
  const all = Array.from(new Set([...FSCA_CATEGORIES, ...cats]));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-primary-dark">Authorised FSCA product categories</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {all.map((c) => (
          <label key={c} className="flex items-center gap-2 text-xs">
            <Checkbox checked={cats.includes(c)} onCheckedChange={(v) => setD({ ...d, fsca_categories: v ? [...cats, c] : cats.filter((x) => x !== c) })} />
            {c}
          </label>
        ))}
      </div>
      <label className="mt-4 flex items-center gap-2 text-xs font-semibold">
        <Checkbox checked={!!d.pi_cover} onCheckedChange={(v) => setD({ ...d, pi_cover: !!v })} />
        Professional indemnity (PI) cover in place
      </label>
      <SaveBar onSave={() => commit()} saving={saving} />
    </div>
  );
}
