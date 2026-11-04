const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/background.js`,'utf8');const driver=source.slice(source.indexOf('function drive('),source.indexOf('function fillOtp('));
function inspect({url='https://my.oldmutual.co.za/app/secure',title='MyOldMutual',password=false,otp=false,nav=true,hiddenNav=false,link=true,dialog=false,failedData=true}={}){
 let writes=0;
 const el=(text,extra={})=>({textContent:text,getClientRects:()=>[1],getAttribute:()=>null,...extra});
 const controls=[...(password?[el('',{type:'password',name:'password'})]:[]),...(otp?[el('',{type:'text',autocomplete:'one-time-code',name:'otp'})]:[])];
 const menu=el('',{getClientRects:()=>hiddenNav?[]:[1],querySelectorAll:s=>s==='p, a, button'?[el('Home'),el('Manage')]:[]});
 const secure=el('Secure Servicesopen_in_new',{getAttribute:k=>k==='href'?'https://secure.oldmutual.co.za':null});
 const root={querySelectorAll:s=>s==='input'?controls:s==='a'?(link?[secure]:[]):s==='nav'?(nav?[menu]:[]):s.includes('dialog')?(dialog?[el('Important message')]:[]):[]};
 const doc={title,body:{innerText:failedData?'Failed to load some of your data. We are unable to load your information.':''},querySelectorAll:s=>s==='*'?[{shadowRoot:{querySelectorAll:t=>t==='*'?[{shadowRoot:root}]:[]}}]:[]};
 const ctx=vm.createContext({URL,location:{href:url},document:doc,HTMLInputElement:class{},Event:class{}});vm.runInContext(driver,ctx);
 const result=vm.runInContext("drive('', '', true, 'https://my.oldmutual.co.za', 'oldmutual.co.za', true)",ctx);return{state:result.state,writes};
}
test('recognises observed signed-in MyOldMutual through nested shadow roots without Logout or any click',()=>assert.deepEqual(inspect(),{state:'in',writes:0}));
test('portfolio data-loading errors do not contradict authenticated navigation',()=>{assert.equal(inspect({failedData:true}).state,'in');assert.equal(inspect({failedData:false}).state,'in')});
test('requires the exact host, secure route, title and both visible navigation landmarks',()=>{for(const options of[{url:'https://my.oldmutual.co.za.evil.example/app/secure'},{url:'https://my.oldmutual.co.za/login'},{url:'http://my.oldmutual.co.za/app/secure'},{title:'Login'},{nav:false},{hiddenNav:true},{link:false}])assert.notEqual(inspect(options).state,'in')});
test('password, OTP and blocking dialogs never become a successful connection',()=>{assert.notEqual(inspect({password:true}).state,'in');assert.equal(inspect({otp:true}).state,'otp');assert.equal(inspect({dialog:true}).state,'blocked')});
