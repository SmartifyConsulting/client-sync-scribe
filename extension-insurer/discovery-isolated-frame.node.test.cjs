const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/background.js`,'utf8');
const injected = source.slice(source.indexOf('function drive('),source.indexOf('function fillOtp('));
const helpers = source.slice(source.indexOf('async function confirmDiscoveryFrame('),source.indexOf('async function inspectSession('));

function outer({confirmed=false,notice=false}={}) {
  const visible = {getClientRects:()=>[1]};
  const iframe = {...visible,getAttribute:()=>'/faz-dashboard-ui/#/dashboard-material',contentDocument:null};
  const modal = {...visible,id:'unDecoratedModal',innerText:'Accept new terms'};
  const document = {title:'Dashboard - Discovery',body:{innerText:''},querySelectorAll:s=>s==='iframe'?[iframe]:s.includes('dialog')&&notice?[modal]:[]};
  const context = vm.createContext({URL,location:{href:'https://www.discovery.co.za/portal/intermediary/dashboard'},document});
  vm.runInContext(injected,context);
  return vm.runInContext(`drive('','',true,'https://www.discovery.co.za','discovery.co.za',true,true,'',${confirmed})`,context).state;
}
test('opaque Discovery frame requests a direct probe rather than looping on the outer page',()=>{
  assert.equal(outer(),'discovery-frame');
  assert.equal(outer({confirmed:true}),'in');
  assert.equal(outer({confirmed:true,notice:true}),'blocked');
});
test('frame confirmation passes no credentials and requires exactly one non-top authenticated frame',async()=>{
  for(const frameResults of [[],[{frameId:0,result:{authenticated:true}}],[{frameId:4,result:{authenticated:true}}],[{frameId:4,result:{authenticated:true}},{frameId:5,result:{authenticated:true}}]]) {
    const calls=[];
    const chrome={scripting:{executeScript:async options=>{calls.push(options);return options.target.allFrames?frameResults:[{result:{state:'in'}}];}}};
    const context=vm.createContext({chrome,URL});
    vm.runInContext('function drive() {}\n'+helpers,context);
    const state=await vm.runInContext("confirmDiscoveryFrame(7,{state:'discovery-frame'},{origin:'https://www.discovery.co.za',discoveryRedirects:'discovery.co.za'},true)",context);
    const expected=frameResults.length===1&&frameResults[0].frameId!==0;
    assert.equal(state.state,expected?'in':'waiting');
    assert.equal(calls[0].args,undefined);
    if(expected) {assert.equal(calls[1].args[0],'');assert.equal(calls[1].args[1],'');assert.equal(calls[1].args[6],true);}
  }
});
test('direct frame probe requires real authenticated landmarks and rejects login/other origins',()=>{
  for(const fail of ['', 'password','origin','title']) {
    const visible={getClientRects:()=>[1]};
    const document={title:fail==='title'?'Login':'FazDashboardUi',body:{innerText:'Search for a client Client summary'},querySelectorAll:s=>s==='button'?[{...visible,textContent:'VIEW ALL PROSPECTS & CLIENTS'}]:s==='a'?[{...visible,textContent:'HOME',getAttribute:()=>'/portal/intermediary/home'}]:s==='input'&&fail==='password'?[{...visible,type:'password'}]:[]};
    const context=vm.createContext({URL,document,location:{href:`https://${fail==='origin'?'other.example':'www.discovery.co.za'}/faz-dashboard-ui/#/dashboard-material`}});
    vm.runInContext(helpers,context);
    assert.equal(vm.runInContext('discoveryDashboardProbe().authenticated',context),fail==='');
  }
});
