import { Input } from '@/components/ui/input';

export const BIDVEST_QUESTIONS: Record<string,string[]> = {
  'Bipolar Mood Disorder': ['No','Yes'],
  'Nicotine use in the last 6 months': ['No','Yes'],
  'Work driving hours per day (excluding commuting)': ['None','less than 1.5','1.5 to 3','3 to 4.5','4.5 to 6','6 or more'],
  'Employment type': ['Salaried','Self-employed','Commission earner','Independent contractor','Secondary occupation'],
  'Hours worked per week': ['35 Hours or more','21 to 34 hours','16 to 20 hours','15 hours or less'],
  'Weeks not worked in the past two years': ['13 weeks or less','14 weeks to 26 weeks','27 weeks to 52 weeks','53 weeks or more'],
  Qualification: ['No Matric','Matric','Diploma (3 years or less)','B-Tech/4yr diploma/Adv diploma','3yr degree','4yr + degree'],
};
export function bidvestQuestions(answers:Record<string,string>={}) {
  return Object.entries(BIDVEST_QUESTIONS).filter(([label])=>!['Hours worked per week','Weeks not worked in the past two years'].includes(label)||answers['Employment type']==='Self-employed');
}
export function bidvestIssues(answers:Record<string,string>={}) {
  const missing=bidvestQuestions(answers).filter(([label,choices])=>!choices.includes(answers[label])).map(([label])=>label);
  for(const label of ['Before-tax monthly income','After-tax monthly income']) if(!answers[label]?.trim()||!Number.isFinite(Number(answers[label]))||Number(answers[label])<=0) missing.push(label);
  return missing;
}
export function BidvestClientFields({answers,onChange}:{answers:Record<string,string>;onChange:(answers:Record<string,string>)=>void}) {
  const issues=bidvestIssues(answers);
  return <details className="rounded-lg border border-border p-3 text-xs"><summary className="cursor-pointer font-semibold">Bidvest client questions · {issues.length?`${issues.length} to complete`:'Complete'}</summary>
    <p className="my-2 text-muted-foreground">Record the client’s explicit answers. These details apply to all Bidvest options. Occupation-specific questions may also be required by the insurer.</p>
    <div className="grid gap-3 sm:grid-cols-2">{bidvestQuestions(answers).map(([label,choices])=><label className="font-semibold" key={label}>{label} *<select aria-label={`Bidvest ${label}`} className="mt-1 h-9 w-full rounded border border-input bg-background px-2 font-normal" value={answers[label]??''} onChange={e=>onChange({...answers,[label]:e.target.value})}><option value="" disabled>Select an answer</option>{choices.map(choice=><option key={choice}>{choice}</option>)}</select></label>)}
    {['Before-tax monthly income','After-tax monthly income'].map(label=><label className="font-semibold" key={label}>{label} (R) *<Input aria-label={`Bidvest ${label}`} className="mt-1 font-normal" inputMode="decimal" value={answers[label]??''} onChange={e=>onChange({...answers,[label]:e.target.value.replace(/[^\d.]/g,'')})}/></label>)}</div>
  </details>;
}
