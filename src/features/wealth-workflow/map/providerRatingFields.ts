/** Rating controls observed in the Old Mutual individual protection journey.
 * Occupation and membership are insurer searches, not guessed static lists. */
export const OMP_RATING_LABELS = ['Date of birth','Gender','Marital status','Smoking status','Education','Professional membership','Occupation','Industry','Employment type','Admin (%)','Physical (%)','Travelling (%)','Gross taxable monthly income','Passive taxable monthly income','Salary Payment Day'];

export const OMP_RATING_OPTIONS: Record<string, string[]> = {
  Gender: ['Male', 'Female'],
  'Marital status': ['Co-Habitating/Common Law', 'Divorced', 'Married', 'Single', 'Widowed'],
  'Smoking status': ['Non-Smoker', 'Smoker'],
  Education: ['NQF <4 (No matric, Grade lower than 12, Standard lower than 10, National Certificate (Vocational) Level 2/3)', 'NQF 4 (Matric, Grade 12, Standard 10, National Certificate (Vocational) Level 4)', 'NQF 5 (Higher Certificate)', 'NQF 6 (Diploma, Advanced Certificate)', 'NQF 7 (Bachelors Degree, Advanced Diploma)', 'NQF 8 (Honours Degree, Post Graduate Diploma)', 'NQF 9 (Masters Degree)', 'NQF 10 (Doctorate)'],
  'Employment type': ['Business Partner', 'Casual Worker', 'Contract Worker', 'Full Time Employee (Commission Earner)', 'Full Time Employee (Salaried)', 'Part Time Worker', 'Seasonal Worker', 'Self-employed', 'Sole Proprietor', 'Temporary Worker', 'Unemployed'],
};

export function ompRatingIssues(inputs: Record<string, unknown> = {}) {
  const issues = OMP_RATING_LABELS.filter(label => typeof inputs[label] !== 'string' || !(inputs[label] as string).trim());
  for (const [label, options] of Object.entries(OMP_RATING_OPTIONS)) {
    if (inputs[label] && !options.includes(String(inputs[label])) && !issues.includes(label)) issues.push(label);
  }
  const check = (label: string, valid: (n: number) => boolean) => {
    if (!issues.includes(label) && (!Number.isFinite(Number(inputs[label])) || !valid(Number(inputs[label])))) issues.push(label);
  };
  ['Admin (%)','Physical (%)','Travelling (%)'].forEach(label=>check(label,n=>n>=0&&n<=100));
  if (['Admin (%)','Physical (%)','Travelling (%)'].every(label=>!issues.includes(label)) &&
      ['Admin (%)','Physical (%)','Travelling (%)'].reduce((sum,label)=>sum+Number(inputs[label]),0)!==100) issues.push('Work split must total 100%');
  check('Gross taxable monthly income',n=>n>0);
  check('Passive taxable monthly income',n=>n>=0);
  check('Salary Payment Day',n=>Number.isInteger(n)&&n>=1&&n<=31);
  const dob=String(inputs['Date of birth']??'');
  const date=new Date(`${dob}T00:00:00Z`);
  if (!issues.includes('Date of birth') && (!/^\d{4}-\d{2}-\d{2}$/.test(dob)||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==dob)) issues.push('Date of birth');
  return issues;
}
