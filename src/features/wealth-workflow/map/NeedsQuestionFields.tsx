import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BIDVEST_QUESTIONS } from "./BidvestClientFields";
import { OMP_RATING_LABELS, OMP_RATING_OPTIONS } from "./providerRatingFields";

type Status = "unanswered" | "discussed" | "answered" | "skipped";
type Answer = { question: string; status: Status; answer: string | null };
type Question = { label: string; options?: string[]; source?: string };
const yesNo = ["Yes", "No"];
const prompts = (...labels: string[]): Question[] => labels.map(label => ({ label }));
const personalSources: Record<string, string> = {
  "Date of birth": "dob", Gender: "gender", "Marital status": "marital_status",
  "Smoking status": "smoker", Education: "highest_education", Occupation: "occupation",
};
const groups: { title: string; questions: Question[] }[] = [
  { title: "Client, household and employment", questions: [
    ...OMP_RATING_LABELS.slice(0, 12).map(label => ({
      label, options: OMP_RATING_OPTIONS[label], source: personalSources[label] && `client.${personalSources[label]}`,
    })),
    ...prompts("Main duties and supervision", "Sport or hobbies", "Wedding date", "Preferred contact method and work number",
      "Spouse or partner details", "Spouse education", "Spouse gross and net monthly income",
      "Dependants and relationships", "Dependants’ education and maintenance costs"),
  ] },
  { title: "Income, expenses and employer benefits", questions: [
    { label: "Gross monthly income", source: "cash_flow.gross_income" },
    { label: "Net monthly income", source: "cash_flow.net_salary" },
    { label: "Fixed monthly expenses", source: "cash_flow.fixed_expenses" },
    { label: "Discretionary monthly expenses", source: "cash_flow.discretionary_expenses" },
    ...prompts("Gross taxable monthly income", "Passive taxable monthly income", "Salary Payment Day",
      "Itemised expenses and upcoming changes", "Employer pension or provident fund, joining date and retirement age",
      "Employer group life cover", "Employer lump-sum disability", "Employer monthly disability income",
      "Employer severe illness cover", "Employer benefit beneficiaries and HR contact"),
  ] },
  { title: "Underwriting and insurer questions", questions: [
    ...Object.entries(BIDVEST_QUESTIONS).map(([label, options]) => ({
      label: label === "Employment type" ? "Bidvest employment type" : label, options,
    })),
    ...prompts("Bidvest before-tax monthly income", "Bidvest after-tax monthly income",
      "Medical aid, membership and dependants on scheme", "Medical aid required by employer",
      "Multiply or Vitality membership", "Satisfaction with medical cover",
      "Current or past medical conditions", "Current or most recent doctor", "Dependant medical history"),
  ] },
  { title: "Insurer rating profile", questions: [
    { label: "Title", options: ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Adv", "Rev"] },
    { label: "Old Mutual underwriting method", options: ["Medical tests, questions or both", "No medical tests - only questions"] },
    { label: "Momentum disability definition", options: ["Own occupation", "Any occupation"] },
    { label: "BrightRock needs category", options: ["Personal Needs", "Business Needs"] },
    { label: "BrightRock life cover need", options: ["Cover to retirement", "Whole of life", "Debt cover"] },
    { label: "BrightRock income need", options: ["Temporary expense", "Permanent income"] },
    { label: "Discovery plan option", options: ["Classic", "Essential"] },
    { label: "Discovery Vitality integration", options: ["Vitality Life Plan", "No Vitality"] },
    { label: "Discovery severe illness option", options: ["Comprehensive", "Core"] },
  ] },
  { title: "Existing cover, assets and debts", questions: prompts(
    "Existing policy insurer, cover, premium and fund value", "Property value, purchase details and bond",
    "Property rental income, levies, rates and taxes", "Timeshares and personal possessions",
    "Business interests, valuation, loan accounts and turnover", "Cash, savings, investments and provider",
    "Vehicle details, valuation and finance terms", "Short-term cover, claims history and quote interest",
    "Debt balances, limits, monthly repayments and lender", "Inheritance instructions by asset",
  ) },
  { title: "Protection, retirement and other goals", questions: [
    ...prompts("Family’s minimum monthly income on death", "Required monthly income if unable to work",
      "Disability home adaptations, equipment and vehicle costs", "Income for dependants while the estate is settled",
      "Goal description, amount and target date", "Tertiary education cost per year and course duration",
      "Will custodian and latest update", "Services requested and expected turnaround"),
    { label: "Target retirement age", source: "goals_risk.retirement_age" },
    { label: "Desired monthly retirement income", source: "goals_risk.retirement_income" },
  ] },
];

const labels: Record<Status, string> = {
  unanswered: "Unanswered", discussed: "Discussed · answer needed", answered: "Answered", skipped: "Skipped",
};

function QuestionRow({ question, saved, existing, onSave }: {
  question: Question; saved?: Answer; existing?: string; onSave: (status: Status, answer: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string>();
  const [busy, setBusy] = useState(false);
  const answer = draft ?? saved?.answer ?? "";
  const status = saved?.status ?? (existing ? "answered" : "unanswered");

  async function save(status: Status) {
    setBusy(true);
    try {
      await onSave(status, status === "answered" ? answer.trim() : null);
      setDraft(undefined);
    } catch {
      // Leave the draft available to retry.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5 border-t border-border/70 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-semibold">{status === "answered" ? "✓ " : ""}{question.label}</span>
        <span className={status === "answered" ? "text-primary" : "text-muted-foreground"}>{labels[status]}</span>
      </div>
      {existing && !saved?.answer && <p className="text-muted-foreground">On file · {existing}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {question.options ? (
          <select aria-label={question.label} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2"
            value={answer} disabled={busy} onChange={e => setDraft(e.target.value)}>
            <option value="">Select an answer</option>
            {question.options.map(option => <option key={option}>{option}</option>)}
          </select>
        ) : (
          <Input aria-label={question.label} placeholder="Enter an answer" className="h-8 min-w-0 flex-1 text-xs"
            value={answer} disabled={busy} onChange={e => setDraft(e.target.value)} />
        )}
        <Button size="sm" variant="outline" disabled={busy || !answer.trim() || draft === undefined} onClick={() => void save("answered")}>Save</Button>
        {status === "unanswered" && <Button size="sm" variant="ghost" disabled={busy || !!draft} onClick={() => void save("discussed")}>Mark discussed</Button>}
        {status !== "answered" && status !== "skipped" && <Button size="sm" variant="ghost" disabled={busy || !!draft} onClick={() => void save("skipped")}>Skip</Button>}
        {(status === "skipped" || status === "discussed") && <Button size="sm" variant="ghost" disabled={busy || !!draft} onClick={() => void save("unanswered")}>Reopen</Button>}
      </div>
    </div>
  );
}

export function NeedsQuestionFields({ clientId, profile }: { clientId: string; profile: Record<string, unknown> | null | undefined }) {
  const qc = useQueryClient();
  const key = ["wealth-needs-answers", clientId];
  const db = supabase as any;
  const answers = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await db.from("wealth_needs_answers").select("question,status,answer").eq("client_id", clientId);
      if (error) throw error;
      return Object.fromEntries((data as Answer[]).map(row => [row.question, row]));
    },
  });
  const { data: client } = useQuery({
    queryKey: ["needs-personal-fields", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients")
        .select("dob,gender,marital_status,smoker,highest_education,occupation").eq("id", clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const values = { ...profile, client } as Record<string, Record<string, unknown> | null>;
  function existing(question: Question) {
    if (!question.source) return undefined;
    const [section, field] = question.source.split(".");
    const value = values[section]?.[field];
    return typeof value === "number" || typeof value === "string" ? String(value).trim() || undefined : undefined;
  }
  async function save(question: string, status: Status, answer: string | null) {
    const row = { question, status, answer };
    await qc.cancelQueries({ queryKey: key });
    const { error } = await db.from("wealth_needs_answers").upsert({ client_id: clientId, ...row }, { onConflict: "client_id,question" });
    if (error) {
      toast({ title: "Checklist answer not saved", description: "Try saving this answer again.", variant: "destructive" });
      throw error;
    }
    qc.setQueryData<Record<string, Answer>>(key, previous => ({ ...previous, [question]: row }));
  }

  if (answers.isPending) return <p className="text-xs text-muted-foreground">Loading meeting questions…</p>;
  if (answers.isError) return <Button size="sm" variant="outline" onClick={() => void answers.refetch()}>Checklist could not load · Retry</Button>;

  return (
    <div className="mt-3 space-y-2 text-xs">
      <p className="text-muted-foreground">Open a group to see each question. Mark it discussed, save the answer, or skip it if it does not apply. A skipped question may still be needed for an insurer quote.</p>
      {groups.map(group => {
        const openCount = group.questions.filter(question => {
          const status = answers.data[question.label]?.status;
          return status ? status === "unanswered" || status === "discussed" : !existing(question);
        }).length;
        return (
          <details key={group.title} className="rounded-md border border-border px-2.5 py-2">
            <summary className="cursor-pointer font-semibold">{group.title} · {openCount} to answer</summary>
            <div className="mt-2">
              {group.questions.map(question => (
                <QuestionRow key={question.label} question={question} saved={answers.data[question.label]}
                  existing={existing(question)} onSave={(status, answer) => save(question.label, status, answer)} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
