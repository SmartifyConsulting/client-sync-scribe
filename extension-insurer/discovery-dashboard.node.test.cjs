const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/background.js`,'utf8');
const drive = source.slice(source.indexOf('function drive('),source.indexOf('function fillOtp('));
const message = 'Notice From 1 January 2027, our gap cover products will have new names. Discovery Gap Comprehensive will be Discovery Gap 500, Discovery Gap Core will be Discovery Gap 250, Discovery Gap Active will be Discovery Gap 100. close';
function probe({notice=message, modal=true, frame=true, frameHost='', probeOnly=false, password=false, captcha=false, url='https://www.discovery.co.za/portal/intermediary/dashboard'}={}) {
  let clicks=0;
  const visible = {getClientRects:()=>[1]};
  const close = {...visible,textContent:'close',click:()=>clicks++};
  const modalEl = {...visible,id:'unDecoratedModal',innerText:notice,querySelectorAll:s=>s==='a[data-dismiss="modal"]'?[close]:[]};
  const dashboard = {title:'FazDashboardUi',body:{innerText:'Search for a client Client summary'},querySelectorAll:s=>s==='button'?[{...visible,textContent:'VIEW ALL PROSPECTS & CLIENTS'}]:s==='a'?[{...visible,textContent:'HOME',getAttribute:()=>'/portal/intermediary/home'}]:s==='input'&&password?[{...visible,type:'password'}]:[]};
  const iframe = {...visible,getAttribute:()=>`${frameHost}/faz-dashboard-ui/#/dashboard-material`,contentDocument:dashboard};
  const document = {title:'Dashboard - Discovery',body:{innerText:notice},querySelectorAll:s=>s==='iframe'&&frame?[iframe]:s.includes('recaptcha')&&captcha?[visible]:s.includes('dialog')&&modal?[modalEl]:[]};
  const context = vm.createContext({URL,location:{href:url},document});
  vm.runInContext(drive,context);
  const result=vm.runInContext(`drive('','',true,'https://www.discovery.co.za','discovery.co.za',true,${probeOnly})`,context);
  return {state:result.state,clicks};
}
test('Discovery reports authenticated iframe dashboard and closes only the observed notice',()=>{
  assert.deepEqual(probe(),{state:'in',clicks:1});
  assert.deepEqual(probe({modal:false}),{state:'in',clicks:0});
});
test('Discovery session probes confirm login without dismissing notices',()=>{
  assert.deepEqual(probe({probeOnly:true}),{state:'in',clicks:0});
});
test('Unfamiliar notices and consent stop rather than being blindly accepted',()=>{
  assert.deepEqual(probe({notice:'Accept new terms and conditions'}),{state:'blocked',clicks:0});
});
test('The URL alone, a password field or an untrusted iframe never proves authentication',()=>{
  for(const options of [{frame:false},{password:true},{frameHost:'https://other.example'},{url:'https://other.example/portal/intermediary/dashboard'}]) {
    const result=probe(options); assert.notEqual(result.state,'in'); assert.equal(result.clicks,0);
  }
});
test('CAPTCHA remains a manual stop even on a recognised dashboard',()=>{
  assert.deepEqual(probe({captcha:true}),{state:'captcha',clicks:0});
});
