import { describe, it, expect } from 'bun:test';
import { quoteReference, quoteResult, quoteSettingsKey, withQuoteReference } from '../src/features/wealth-workflow/map/quoteReferences';
describe('quote reference ownership',()=>{
 it('shows only a finite insurer result for the exact current option settings',()=>{
  const base={benefit_amount:'1700000','Old Mutual:omp_cashback':'Included'};
  const result={number:'provider-ref',monthlyPremium:768,source:'portal-verified',settings:quoteSettingsKey('Life cover',base,'Old Mutual')};
  const saved={...base,_quoteResults:{'Old Mutual':result}};
  expect(quoteResult('Life cover',saved,'Old Mutual')?.monthlyPremium).toBe(768);
  expect(quoteResult('Life cover',{...saved,benefit_amount:'1800000'},'Old Mutual')).toBeNull();
  expect(quoteResult('Life cover',saved,'Momentum')).toBeNull();
  expect(quoteResult('Life cover',{...base,_quoteResults:{'Old Mutual':{...result,monthlyPremium:Infinity}}},'Old Mutual')).toBeNull();
  expect(quoteResult('Life cover',{...base,_quoteResults:{'Old Mutual':{...result,source:'planning'}}},'Old Mutual')).toBeNull();
 });
 it('invalidates an OMP reference when actual insurer terms change',()=>{
  const option={benefit_amount:'1700000','Old Mutual:omp_premium':'0% Annual Increase','Old Mutual:omp_cover':'5% fixed rate'};
  const saved=withQuoteReference('Life cover',option,'Old Mutual','verified-reference');
  expect(quoteReference('Life cover',{...saved,'Old Mutual:omp_premium':'5% Annual Increase'},'Old Mutual')).toBe('');
  expect(quoteReference('Life cover',{...saved,'Old Mutual:omp_cover':'10% fixed rate'},'Old Mutual')).toBe('');
  expect(quoteReference('Life cover',{...saved,'Old Mutual:omp_inflation':'Inflation +3%',growth:'6'},'Old Mutual')).toBe('verified-reference');
 });
 it('keeps real references separate by insurer, product and option',()=>{
  const base={benefit_amount:'1700000',premium_pattern:'Level'};
  const a=withQuoteReference('Life cover',base,'Old Mutual','117387802');
  expect(quoteReference('Life cover',a,'Old Mutual')).toBe('117387802');
  expect(quoteReference('Life cover',a,'Momentum')).toBe('');
  expect(quoteReference('Life cover',base,'Old Mutual')).toBe('');
  expect(quoteReference('Severe illness',a,'Old Mutual')).toBe('');
 });
 it('hides stale references when pricing changes but not another insurers settings',()=>{
  const a=withQuoteReference('Life cover',{benefit_amount:'1700000'},'Old Mutual','actual-provider-ref');
  expect(quoteReference('Life cover',{...a,benefit_amount:'1800000'},'Old Mutual')).toBe('');
  expect(quoteReference('Life cover',{...a,'Momentum:plan':'other'},'Old Mutual')).toBe('actual-provider-ref');
 });
 it('survives saved-plan round trips and supports clearing the reference',()=>{
  const a=JSON.parse(JSON.stringify(withQuoteReference('Life cover',{},'Old Mutual','  ref-123  ')));
  expect(quoteReference('Life cover',a,'Old Mutual')).toBe('ref-123');
  expect(quoteReference('Life cover',withQuoteReference('Life cover',a,'Old Mutual',''),'Old Mutual')).toBe('');
 });
});
