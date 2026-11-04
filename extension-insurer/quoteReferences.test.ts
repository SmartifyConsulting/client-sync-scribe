import { describe, it, expect } from 'bun:test';
import { quoteReference, withQuoteReference } from '../src/features/wealth-workflow/map/quoteReferences';
describe('quote reference ownership',()=>{
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
