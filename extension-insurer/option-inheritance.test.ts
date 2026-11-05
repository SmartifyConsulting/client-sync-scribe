import {test,expect} from 'bun:test';
import {editQuoteOption} from '../src/features/wealth-workflow/map/optionInheritance';
import {defaultVariations} from '../src/features/wealth-workflow/map/needsProducts';
test('new options start identical, follow A and preserve explicit B/C edits and evidence',()=>{
 let options=defaultVariations('Life cover',1700000);
 expect(options[1]).toEqual(options[0]);expect(options[2]).toEqual(options[0]);
 options=editQuoteOption(options,0,'premium_pattern','Compulsory');
 expect(options.map(o=>o.premium_pattern)).toEqual(['Compulsory','Compulsory','Compulsory']);
 options=editQuoteOption(options,1,'premium_pattern','Compulsory');
 options[2]._quoteReferences={Momentum:{number:'old'}};
 options=editQuoteOption(options,0,'premium_pattern','Level');
 expect(options.map(o=>o.premium_pattern)).toEqual(['Level','Compulsory','Level']);
 expect(options[2]._quoteReferences.Momentum.number).toBe('old');
});
test('legacy distinct values are preserved while blank insurer settings inherit',()=>{
 const result=editQuoteOption([{x:'A'},{x:'B'},{}],0,'x','new');
 expect(result.map(o=>o.x)).toEqual(['new','B','new']);
});
