const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/background.js`,'utf8');
const probe=source.slice(source.indexOf('function discoveryDashboardProbe('),source.indexOf('async function inspectSession('));
test('Discovery rendered HOME has underlying Home text; both identify the same verified route',()=>{
  for(const label of ['Home','HOME',' home ']) {
    const visible={getClientRects:()=>[1]};
    const document={title:'FazDashboardUi',body:{innerText:'Search for a client Client summary'},querySelectorAll:s=>s==='button'?[{...visible,textContent:'VIEW ALL PROSPECTS & CLIENTS'}]:s==='a'?[{...visible,textContent:label,getAttribute:()=>'/portal/intermediary/home'}]:[]};
    const context=vm.createContext({URL,document,location:{href:'https://www.discovery.co.za/faz-dashboard-ui/#/dashboard-material'}});
    vm.runInContext(probe,context);
    assert.equal(vm.runInContext('discoveryDashboardProbe().authenticated',context),true,label);
  }
});
