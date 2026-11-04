import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./oldMutualJourney.js',import.meta.url),'utf8');
const approved={
 'Date of birth':'1976-03-08','Gender':'Female','Marital status':'Married','Smoking status':'Non-Smoker',
 'Education':'NQF 9 (Masters Degree)','Professional membership':'None','Occupation':'Programmer and Analyst','Industry':'General','Employment type':'Self-employed',
 'Admin (%)':'20','Physical (%)':'80','Travelling (%)':'0','Gross taxable monthly income':'30000','Passive taxable monthly income':'0','Salary Payment Day':'28',
 'Benefit amount':'1700000','Old Mutual product':'OMP Life','Compulsory yearly premium increase':'0% Annual Increase','Scheduled yearly cover increase':'5% fixed rate',
 'Underwriting method':'Medical tests, questions or both','Guarantee term':'5 years','Premium term':'Benefit term','Cashback':'Included'
};
function run({values=approved,path='/dashboard/sales-dashboard',step='start',context={},selectors={},host='secure.adviserweb.oldmutual.co.za',extra=[],body=''}={}){
 const c=vm.createContext({URL,location:{href:`https://${host}${path}`},getComputedStyle:()=>({visibility:'visible'}),document:{querySelectorAll:s=>selectors[s]||[],body:{innerText:body}}});
 vm.runInContext(source,c);
 c.request={step,context,fields:[...Object.entries(values).map(([label,value])=>({label,value})),...extra]};
 return vm.runInContext('driveOldMutualQuote(request,"https://secure.adviserweb.oldmutual.co.za")',c);
}
const el=(textContent,click=()=>{})=>({textContent,click,getClientRects:()=>[1],getAttribute:()=>null});
test('refuses unrelated origins before any portal interaction',()=>expect(run({host:'evil.example'}).state).toBe('blocked'));
test('lists missing inputs before creating any draft',()=>{const values={...approved};delete values['Salary Payment Day'];expect(run({values}).detail).toContain('day');});
test('never substitutes unsupported six percent growth',()=>expect(run({values:{...approved,'Scheduled yearly cover increase':'6% fixed rate'}}).state).toBe('blocked'));
test('requires a 100 percent work split and nonblank explicit values',()=>expect(run({values:{...approved,'Physical (%)':'60'}}).detail).toContain('work split'));
test('does not overwrite an existing draft at start',()=>expect(run({path:'/protection/quote/123/your-quote-tableview'}).detail).toContain('will not be overwritten'));
test('rejects a portal quote identity change mid-run',()=>expect(run({step:'verify',path:'/protection/quote/456/your-quote-tableview',context:{reference:'123'}}).detail).toContain('another quote'));
test('blocks mixed products before starting the supported life route',()=>expect(run({extra:[{label:'Benefit amount',value:'2000',product:'Severe illness'}]}).state).toBe('blocked'));
test('clicks only the unique demonstrated fresh-quote control',()=>{let clicks=0; const button=el('Create new quote',()=>clicks++);expect(run({selectors:{'#CreateNewQuote':[button]}}).next).toBe('type');expect(clicks).toBe(1);expect(run({selectors:{'#CreateNewQuote':[button,button]}}).state).toBe('blocked');expect(clicks).toBe(1);});
test('does not permit an unrelated dialog during the growth step',()=>{const dialog={...el('Consent'),querySelector:()=>null};expect(run({step:'growth-save',selectors:{'dialog[open],[role="dialog"],[role="alertdialog"]':[dialog]}}).detail).toContain('unexpected');});
test('quote-stage Next is never used for application progression',()=>{let clicks=0;expect(run({step:'verify',path:'/protection/quote/123/your-quote-tableview',context:{reference:'123'},selectors:{'button,a':[el('NEXT',()=>clicks++)]}}).state).toBe('blocked');expect(clicks).toBe(0);});
test('returns the insurer result only when every selected term and the premium sum match',()=>{
 const input=(value,extra={})=>({...el(''),value,...extra});
 const select=value=>({...el(''),tagName:'SELECT',options:[{text:value}],selectedOptions:[{text:value}]});
 const selectors={
  'select':[approved['Compulsory yearly premium increase'],approved['Underwriting method'],approved['Guarantee term'],approved['Premium term']].map(select),
  'input[title]':[input('5% fixed rate',{title:'5% fixed rate'})],
  '#deathcoveramount_0_0_0':[input('1 700 000')], '#premium-input':[input('683')],
  '#your-cart-table-payment-frequency':[select('Monthly')], 'input[placeholder="Type number"]':[input('85')], 'h2':[el('R 768')]
 };
 const args={step:'verify',path:'/protection/quote/123/your-quote-tableview',context:{reference:'123'},selectors,body:'CASHBACK'};
 expect(run(args).result).toEqual({number:'123',monthlyPremium:768,cashbackPremium:85,product:'Life cover'});
 selectors['h2']=[el('R 999')];expect(run(args).state).toBe('blocked');
 selectors['h2']=[el('R 768')];selectors['input[title]'][0].value='Inflation-linked Inflation +0%';expect(run(args).state).toBe('blocked');
});
