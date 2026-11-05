import { expect, test } from 'bun:test';
import { ompRatingIssues } from '../src/features/wealth-workflow/map/providerRatingFields';

const rating = {'Date of birth':'1976-03-08','Gender':'Female','Marital status':'Married','Smoking status':'Non-Smoker','Education':'NQF 9 (Masters Degree)','Professional membership':'None','Occupation':'Programmer and Analyst','Industry':'General','Employment type':'Self-employed','Admin (%)':'20','Physical (%)':'80','Travelling (%)':'0','Gross taxable monthly income':'30000','Passive taxable monthly income':'0','Salary Payment Day':'28'};
test('required rating answers reject blanks while allowing explicit zero values',()=>{
  expect(ompRatingIssues(rating)).toEqual([]);
  expect(ompRatingIssues({...rating,'Smoking status':''})).toContain('Smoking status');
  expect(ompRatingIssues({...rating,'Passive taxable monthly income':''})).toContain('Passive taxable monthly income');
});
test('rating validation rejects impossible dates, unknown choices and invalid work splits',()=>{
  expect(ompRatingIssues({...rating,'Date of birth':'2026-02-30'})).toContain('Date of birth');
  expect(ompRatingIssues({...rating,'Smoking status':'unknown'})).toContain('Smoking status');
  expect(ompRatingIssues({...rating,'Physical (%)':'81'})).toContain('Work split must total 100%');
  expect(ompRatingIssues({...rating,'Salary Payment Day':'32'})).toContain('Salary Payment Day');
  expect(ompRatingIssues({...rating,'Gross taxable monthly income':'not known'})).toContain('Gross taxable monthly income');
});
