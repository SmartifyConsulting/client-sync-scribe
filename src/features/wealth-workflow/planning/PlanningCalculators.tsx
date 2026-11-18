import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CALCULATION_VERSION, estateDuty, futureValue, loanPayment, presentValue, realReturn, savingsContribution } from "./calculations";

const MONEY = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
const METHODS = {
  savings: { title: "Savings projection", fields: ["initial", "contribution", "rate", "years"] },
  goal: { title: "Savings goal", fields: ["initial", "target", "rate", "years"] },
  retirement: { title: "Retirement income capital", fields: ["income", "rate", "inflation", "years"] },
  loan: { title: "Loan repayment", fields: ["principal", "rate", "years"] },
  inflation: { title: "Future cost", fields: ["initial", "inflation", "years"] },
  estate: { title: "Estate duty estimate", fields: ["property", "deductions", "abatement"] },
  networth: { title: "Net worth", fields: ["assets", "debts"] },
  cashflow: { title: "Monthly cash flow", fields: ["netIncome", "expenses"] },
  protection: { title: "Life-cover shortfall", fields: ["immediateNeeds", "income", "rate", "inflation", "years", "resources", "existingCover"] },
} as const;
type Method = keyof typeof METHODS;
const LABELS = {
  initial: "Starting capital / current cost (R)", contribution: "Monthly contribution (R)", rate: "Annual effective return / loan rate (%)",
  years: "Term (years)", target: "Target future amount (R)", income: "Required monthly income in today's money (R)",
  inflation: "Annual inflation (%)", principal: "Loan principal (R)", property: "Estate property and deemed property (R)",
  deductions: "Allowable estate deductions (R)", abatement: "Applicable estate abatement (R)",
  assets: "Total assets at the valuation date (R)", debts: "Total liabilities at the valuation date (R)",
  netIncome: "Net monthly cash income (R)", expenses: "Monthly cash expenses (R)",
  immediateNeeds: "Immediate capital needs, debts and costs (R)", resources: "Resources available for these needs (R)",
  existingCover: "Existing eligible life cover (R)",
};
type Field = keyof typeof LABELS;

export function PlanningCalculators({ clientId }: { clientId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("savings");
  const [values, setValues] = useState<Partial<Record<Field, string>>>({ abatement: "3500000" });
  const [result, setResult] = useState<{ amount: number; detail: string; id: string; calculatedAt: string }>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (!result || !clientId || !user || saving || saved) return;
    setSaving(true);
    const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
    const recordedAt = result.calculatedAt;
    const convention = method === "estate" ? "Estate duty schedule checked on 18 November 2026."
      : method === "networth" || method === "cashflow" ? "Totals in one currency and reporting period."
      : "Annual effective rates, converted to monthly rates. Payments at month-end.";
    const inputs = METHODS[method].fields.map(field => "<tr><td>" + LABELS[field] + "</td><td>" + escape(values[field] ?? "") + "</td></tr>").join("");
    try {
      const { error: saveError } = await supabase.from("documents").insert({
        id: result.id, user_id: user.id, patient_id: clientId, name: METHODS[method].title + " · Planning scenario",
        document_kind: "planning_scenario", media_type: "text/html",
        content: "<h1>Elysian Financial Services</h1><h2>" + METHODS[method].title + "</h2><p>Planning estimate · adviser review required</p><table><tbody>" + inputs + "</tbody></table><p>Result " + MONEY.format(result.amount) + "</p><p>" + escape(result.detail) + "</p><p>" + convention + " Engine " + CALCULATION_VERSION + "</p><p>Recorded " + recordedAt + "</p>",
      });
      if (saveError) {
        if (saveError.code !== "23505") throw saveError;
        const { data: filed, error: readError } = await supabase.from("documents").select("id").eq("id", result.id).eq("user_id", user.id).eq("patient_id", clientId).maybeSingle();
        if (readError || !filed) throw saveError;
      }
      setSaved(true);
      await Promise.all(["wealth-doc-tray", "client-documents", "documents", "wealth-map-records"].map(key => qc.invalidateQueries({ queryKey: [key] })));
    } catch {
      setError("The scenario could not be filed. Your calculation is still available. Try saving again.");
    } finally { setSaving(false); }
  };
  const calculate = () => {
    try {
      const read = (field: Field) => {
        if (!values[field]?.trim() || !Number.isFinite(Number(values[field]))) throw new Error("Enter " + LABELS[field].toLowerCase() + ".");
        return Number(values[field]);
      };
      let amount: number;
      let detail: string;
      if (method === "networth" || method === "cashflow") {
        const first = read(method === "networth" ? "assets" : "netIncome");
        const second = read(method === "networth" ? "debts" : "expenses");
        if (first < 0 || second < 0) throw new Error("Enter non-negative amounts for these totals.");
        amount = first - second;
        detail = method === "networth" ? "Net assets at the chosen valuation date. Apply the client's ownership share to every input." : "Monthly surplus or deficit. Exclude transfers between the client's own accounts.";
      } else if (method === "estate") {
        const estate = estateDuty(read("property"), read("deductions"), read("abatement"));
        amount = estate.duty;
        detail = "Dutiable estate " + MONEY.format(estate.dutiable) + ". Confirm allowable deductions, spouse relief and the applicable tax rules.";
      } else {
        const years = read("years");
        const periods = Math.round(years * 12);
        if (Math.abs(periods - years * 12) > 0.000001 || periods < 1 || periods > 1200) throw new Error("Enter a term of 1 to 1,200 whole months, expressed in years.");
        if (method === "inflation") {
          const inflation = read("inflation") / 100;
          if (inflation <= -1 || read("initial") < 0) throw new Error("Use a non-negative cost and inflation above -100%.");
          amount = read("initial") * (1 + inflation) ** years;
          detail = "Future nominal cost at the entered inflation assumption.";
        } else {
          const annual = read("rate") / 100;
          if (annual <= -1) throw new Error("The annual rate must exceed -100%.");
          const monthly = Math.expm1(Math.log1p(annual) / 12);
          if (method === "loan") {
            amount = loanPayment(read("principal"), monthly, periods);
            detail = "Monthly repayment. Fees and insurance need separate allowances.";
          } else if (method === "retirement" || method === "protection") {
            const realAnnual = realReturn(annual, read("inflation") / 100);
            amount = presentValue(read("income"), Math.expm1(Math.log1p(realAnnual) / 12), periods);
            detail = "Required starting capital in today's money for " + periods + " monthly payments. Assumes capital is exhausted at the end of the term.";
            if (method === "protection") {
              const immediate = read("immediateNeeds"), resources = read("resources"), cover = read("existingCover");
              if ([immediate, resources, cover].some(value => value < 0)) throw new Error("Enter non-negative capital needs, resources and existing cover.");
              amount = Math.max(0, immediate + amount - resources - cover);
              detail = "Capital shortfall after future family support, immediate costs, eligible resources and existing cover. Count each resource once.";
            }
          } else if (method === "goal") {
            amount = savingsContribution(read("initial"), read("target"), monthly, periods);
            detail = "Required monthly contribution to the target future amount.";
          } else {
            amount = futureValue(read("initial"), read("contribution"), monthly, periods);
            detail = "Projected future nominal balance.";
          }
        }
      }
      if (!Number.isFinite(amount)) throw new Error("The result exceeds the supported calculation range. Review the inputs.");
      setResult({ amount, detail, id: crypto.randomUUID(), calculatedAt: new Date().toISOString() });
      setSaved(false);
      setError("");
    } catch (issue) {
      setResult(undefined);
      setError(issue instanceof Error ? issue.message : "Review the inputs.");
    }
  };

  return <section className="frame space-y-3 p-4 text-xs">
    <h3 className="text-sm font-semibold">Planning calculators</h3>
    <p className="text-muted-foreground">Enter agreed assumptions to compare a planning scenario.</p>
    <label className="block space-y-1 font-semibold">Calculator
      <select disabled={saving} value={method} onChange={event => { setMethod(event.target.value as Method); setResult(undefined); setError(""); }} className="block h-9 w-full rounded-md border border-input bg-background px-2 font-normal">
        {Object.entries(METHODS).map(([key, item]) => <option key={key} value={key}>{item.title}</option>)}
      </select>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      {METHODS[method].fields.map(field => <label key={field} className="space-y-1 font-semibold">{LABELS[field]}
        <Input disabled={saving} inputMode="decimal" value={values[field] ?? ""} onChange={event => {
          setValues(previous => ({ ...previous, [field]: event.target.value })); setResult(undefined); setError("");
        }} />
      </label>)}
    </div>
    <p className="text-muted-foreground">{method === "estate"
      ? "Tax basis checked against SARS estate duty rules on 18 November 2026."
      : method === "networth" || method === "cashflow" ? "Use the same currency and reporting date or period for each total."
      : "Annual rates are effective rates, converted to monthly rates. Payments occur at month-end. Returns must reflect the intended fee and tax basis."}</p>
    <Button size="sm" disabled={saving} onClick={calculate}>Calculate</Button>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {result && <div role="status" className="space-y-2 rounded-lg bg-muted/50 p-3">
      <p className="text-base font-semibold">{MONEY.format(result.amount)}</p><p>{result.detail}</p>
      {clientId && <Button size="sm" variant="outline" disabled={saving || saved} onClick={() => void save()}>{saved ? "Filed in Documents" : saving ? "Filing…" : "File scenario in Documents"}</Button>}
      <details><summary className="cursor-pointer font-medium">Calculation record</summary>
        <dl className="mt-2 space-y-1">{METHODS[method].fields.map(field => <div key={field} className="flex flex-wrap justify-between gap-2"><dt>{LABELS[field]}</dt><dd>{values[field]}</dd></div>)}</dl>
        <p className="mt-2 text-muted-foreground">Method version {CALCULATION_VERSION}</p>
      </details>
    </div>}
    <p className="text-muted-foreground">Planning estimates require adviser review before inclusion in a recommendation.</p>
  </section>;
}
