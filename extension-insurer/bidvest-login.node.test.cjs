const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/background.js`,'utf8');const drive=source.slice(source.indexOf('function drive('),source.indexOf('function fillOtp('));
function run({prefilled='',submitted=false,host='login.fmi.co.za',password=false}={}) {
  let clicks=0;const values=new WeakMap();
  class Input {constructor(type,name){this.type=type;this.name=name;this.value='';}get value(){return values.get(this)||'';}set value(v){values.set(this,v);}getClientRects(){return[1];}focus(){}blur(){}dispatchEvent(){}getAttribute(){return null;}closest(){return form;}getRootNode(){return{};}}
  const email=new Input('email','email');email.value=prefilled;const pw=new Input('password','password');
  const button={type:'button',textContent:password?'Login':'Continue',getClientRects:()=>[1],click:()=>clicks++};
  const form={querySelectorAll:s=>s==='*'?[]:[button]};
  const document={body:{innerText:'Adviser Portal'},querySelectorAll:s=>s==='input'?[email,...(password?[pw]:[])]:s==='*'?[]:[button]};
  const context=vm.createContext({URL,location:{href:`https://${host}/`},document,HTMLInputElement:Input,Event:class{}});vm.runInContext(drive,context);
  const result=vm.runInContext(`drive('synthetic@example.invalid','synthetic-password',${submitted},'https://${host}',false)`,context);
  return {state:result.state,clicks,email:email.value,password:pw.value};
}
test('Bidvest email-first screen advances once, including when browser autofill already populated it',()=>{for(const prefilled of['','autofill@example.invalid'])assert.deepEqual(run({prefilled}),{state:'submitted',clicks:1,email:'synthetic@example.invalid',password:''});});
test('does not repeatedly submit Continue while waiting for the password screen',()=>{assert.equal(run({prefilled:'synthetic@example.invalid',submitted:true}).clicks,0);});
test('does not apply Bidvest first-screen recognition on another host',()=>{assert.equal(run({host:'other.example'}).clicks,0);});
test('fills and submits the subsequent password screen after the email step',()=>{const result=run({submitted:true,password:true,prefilled:'synthetic@example.invalid'});assert.equal(result.state,'submitted');assert.equal(result.password,'synthetic-password');assert.equal(result.clicks,1);});
