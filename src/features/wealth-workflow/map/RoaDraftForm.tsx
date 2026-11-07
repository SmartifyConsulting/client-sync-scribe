import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fmtR } from "./money";

const fields = [
  ["needs", "Client needs and objectives", "Record the cover required, priorities and how the amounts were determined."],
  ["basis", "Information and material relied on", "Summarise circumstances, existing cover, risk profile, experience and evidence reviewed. Record missing information and any limits explained."],
  ["affordability", "Affordability and trade-offs", "Record the budget, premium commitment and any gaps the client would retain."],
  ["alternatives", "Why alternatives were considered or set aside", "Compare material differences, including price, benefits and limitations. Explain any limits on the products available."],
  ["motivation", "Why the recommendation suits this client", "Link each need to a specific product feature and explain why it is preferable."],
  ["terms", "Material terms and client obligations", "Record exclusions, waiting periods, loadings, excesses or restrictions where relevant, and the client’s obligations."],
  ["costs", "Fees, commission and disclosures", "Record costs and remuneration disclosed, the duty to disclose material facts and how understanding was checked."],
] as const;
const replacementHint = "Identify the existing policy and compare fees, commission, benefits or rights lost, exclusions, waiting periods, loadings, penalties, excesses and restrictions. Explain why replacing it is preferable to keeping or changing it.";
const escape = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const paragraph = (value: string) => `<p>${escape(value.trim()).replace(/\r?\n/g, "<br/>")}</p>`;
type Quote = { insurer: string; product: string; cover_amount?: number; monthly_premium?: number; selected: boolean; commentary?: string; quote_reference?: string };

function roaBody(quotes: Quote[], values: Record<string, string>, replacement: string, adviser: string) {
    const options = quotes.map(q => `<tr><td>${escape(q.insurer)} · ${escape(q.product)}${q.quote_reference ? `<br/>Quote ${escape(q.quote_reference)}` : ""}</td><td>${fmtR(q.cover_amount)}</td><td>${fmtR(q.monthly_premium)}</td><td>${q.selected ? "Recommended" : "Considered"}${q.commentary ? `<br/>${escape(q.commentary)}` : ""}</td></tr>`).join("");
    const section = (title: string, keys: string[]) => `<h3>${title}</h3>${keys.map(key => `<p><strong>${fields.find(field => field[0] === key)?.[1]}</strong></p>${paragraph(values[key])}`).join("")}`;
    return section("B · Needs and objectives", ["needs"]) +
      section("C · Basis of advice", ["basis", "affordability"]) +
      `<h3>D · Products considered and recommendation</h3><table><thead><tr><th>Insurer and product</th><th>Cover</th><th>Monthly premium</th><th>Outcome</th></tr></thead><tbody>${options}</tbody></table>` +
      section("Recommendation rationale", ["alternatives", "motivation"]) +
      section("E · Terms, costs and disclosures", ["terms", "costs"]) +
      `<h3>F · Replacement assessment</h3>${paragraph(replacement === "no" ? "The recommendation does not replace an existing policy." : values.replacement)}` +
      `<h3>G · Adviser declaration</h3>${paragraph(`${adviser.trim()} confirmed that this record reflects the basis on which the advice was given.`)}`;
}

export function defaultRoaBody() {
  return roaBody([], { ...Object.fromEntries(fields.map(([key, label]) => [key, `[${label}]`])), replacement: "[Replacement comparison, where applicable]" }, "yes", "[Adviser]");
}

export function RoaDraftForm({ quotes, busy, onFile }: { quotes: Quote[]; busy: boolean; onFile: (body: string, summary: string, date: string, adviser: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState("");
  const [adviser, setAdviser] = useState("");
  const [replacement, setReplacement] = useState("");
  const complete = date && adviser.trim() && fields.every(([key]) => values[key]?.trim()) &&
    replacement && (replacement === "no" || values.replacement?.trim());

  return <div className="space-y-3 rounded-lg border border-border p-3">
    <div className="space-y-1"><Label htmlFor="roa-advice-date">Date advice was given</Label><Input id="roa-advice-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
    {fields.map(([key, title, hint]) => <div className="space-y-1" key={key}>
      <Label htmlFor={`roa-${key}`}>{title}</Label>
      <Textarea id={`roa-${key}`} rows={2} placeholder={hint} value={values[key] ?? ""} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />
    </div>)}
    <div className="space-y-1">
      <Label htmlFor="roa-replaces">Does the recommendation replace an existing policy?</Label>
      <select id="roa-replaces" className="block h-9 w-full rounded-md border border-input bg-background px-2" value={replacement} onChange={e => setReplacement(e.target.value)}>
        <option value="">Select an answer</option><option value="no">No</option><option value="yes">Yes</option>
      </select>
      {replacement === "yes" && <Textarea aria-label="Replacement comparison" rows={4} placeholder={replacementHint} value={values.replacement ?? ""} onChange={e => setValues(v => ({ ...v, replacement: e.target.value }))} />}
    </div>
    <div className="space-y-1">
      <Label htmlFor="roa-adviser">Adviser declaration and typed signature</Label>
      <p className="text-muted-foreground">By typing your name and filing the draft, you confirm it records the basis of your advice.</p>
      <Input id="roa-adviser" value={adviser} onChange={e => setAdviser(e.target.value)} />
    </div>
    <Button disabled={!complete || busy} onClick={() => onFile(roaBody(quotes, values, replacement, adviser), values.motivation.trim(), date, adviser.trim())}>File ROA draft</Button>
  </div>;
}
