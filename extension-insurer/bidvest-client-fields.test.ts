import {test,expect} from 'bun:test';
import {bidvestIssues,bidvestQuestions,BIDVEST_QUESTIONS} from '../src/features/wealth-workflow/map/BidvestClientFields';
import {buildPortalScenarios} from '../src/features/wealth-workflow/map/portalPayload';
test('Bidvest requires explicit health answers and conditionally requires self-employed work history',()=>{
 const a:Record<string,string>={};
 expect(bidvestIssues(a)).toContain('Bipolar Mood Disorder');
 for(const [label,choices] of Object.entries(BIDVEST_QUESTIONS)) a[label]=choices[0];
 a['Before-tax monthly income']='30000';a['After-tax monthly income']='25000';
 delete a['Hours worked per week'];delete a['Weeks not worked in the past two years'];
 expect(bidvestIssues(a)).toEqual([]);
 a['Employment type']='Self-employed';expect(bidvestIssues(a)).toContain('Hours worked per week');
 a['Employment type']='Salaried';a['Hours worked per week']='35 Hours or more';
 expect(bidvestQuestions(a).map(([label])=>label)).not.toContain('Hours worked per week');
 expect(buildPortalScenarios({'Life cover':[{_bidvestInputs:a}]},'Bidvest Life / FMI')[0].fields.some(f=>f.label==='Hours worked per week')).toBe(false);
 a['After-tax monthly income']='0';expect(bidvestIssues(a)).toContain('After-tax monthly income');
});
