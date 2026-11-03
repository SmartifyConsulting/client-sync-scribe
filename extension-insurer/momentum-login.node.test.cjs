const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/background.js`, 'utf8');
const drive = source.slice(source.indexOf('function drive('), source.indexOf('function fillOtp('));

function inspect({ title = 'Home | AdviserConnect', password = false, welcome = true } = {}) {
  let writes = 0;
  const search = { type: 'text', name: 'clientSearch', id: 'mat-input-0', placeholder: 'Search using name or ID',
    offsetParent: {}, disabled: false, labels: [{ textContent: 'Client search' }],
    getAttribute: () => null, focus: () => { writes++; } };
  const inputs = [search, ...(password ? [{ ...search, type: 'password', value: 'already-submitted' }] : [])];
  const context = vm.createContext({ URL, location: { href: 'https://adviserconnect.momentum.co.za/' },
    document: { title, body: { innerText: welcome ? 'Welcome to AdviserConnect\nQuotes & calculators' : '' }, querySelectorAll: (selector) => selector === "input" ? inputs : [] } });
  vm.runInContext(drive, context);
  const result = vm.runInContext('drive("unused", "unused", true, "https://adviserconnect.momentum.co.za", false, true)', context);
  return { state: result.state, writes };
}

test('recognises the observed Momentum dashboard without logout text or filling client search', () => {
  assert.deepEqual(inspect(), { state: 'in', writes: 0 });
});
test('does not confirm a password/login page as authenticated', () => {
  assert.notEqual(inspect({ password: true }).state, 'in');
});
test('requires the dashboard title and welcome/navigation signals', () => {
  assert.notEqual(inspect({ title: 'Log in' }).state, 'in');
  assert.notEqual(inspect({ welcome: false }).state, 'in');
});

test('submits the observed Momentum anchor control only on its exact trusted host', () => {
  for (const hostname of ['adviser-account.momentum.co.za', 'other.momentum.co.za']) {
    let clicks = 0;
    class Input {
      constructor(type) { this.type = type; this.name = type === 'password' ? 'password' : 'username'; this.value = ''; }
      getClientRects() { return [1]; } focus() {} blur() {} dispatchEvent() {}
      getAttribute() { return null; } closest() { return null; } getRootNode() { return {}; }
    }
    const values = new WeakMap();
    Object.defineProperty(Input.prototype, 'value', {get() {return values.get(this) || '';}, set(v) {values.set(this, v);}});
    const inputs = [new Input('text'), new Input('password')]; inputs[0].value='browser-autofill-different';
    const anchor = {textContent:'Log in', getClientRects:()=>[1], click:()=>clicks++};
    const document = {title:'Security | AdviserConnect', body:{innerText:'Log in Username Password'}, querySelectorAll:s=>s.includes('dialog')?[]:s==='input'?inputs:s==='*'?[]:s.includes('a#btn-login')?[anchor]:[]};
    const context = vm.createContext({URL, location:{href:`https://${hostname}/login`}, document, HTMLInputElement:Input, Event:class{}});
    vm.runInContext(drive, context);
    const result = vm.runInContext(`drive('synthetic-user','synthetic-password',false,'https://${hostname}',false)`,context);
    assert.equal(result.state, hostname.startsWith('adviser-account.')?'submitted':'waiting');
    assert.equal(clicks, hostname.startsWith('adviser-account.')?1:0); assert.equal(inputs[0].value,'synthetic-user');
  }
});

test('reports the supplied BrightRock rejection without writing credentials or claiming success', () => {
  const context = vm.createContext({URL, location:{href:'https://iris.brightrock.co.za/login'}, document:{body:{innerText:'Login failed! Please recheck the username and password and try again.'},querySelectorAll:()=>[]}});
  vm.runInContext(drive,context);
  assert.equal(vm.runInContext("drive('unused','unused',true,'https://iris.brightrock.co.za',false)",context).state,'failed');
});
test('a loading page is not reported as a rejected password', () => {
  const context = vm.createContext({URL, location:{href:'https://iris.brightrock.co.za/login'}, document:{body:{innerText:'Loading…'},querySelectorAll:()=>[]}});
  vm.runInContext(drive,context);
  assert.equal(vm.runInContext("drive('unused','unused',false,'https://iris.brightrock.co.za',false)",context).state,'waiting');
});

test('recognises the observed profile lock and does not mistake conditional help text for a lock', () => {
  for (const [text, expected] of [["Your profile has been locked as you've entered your password incorrectly 3 times.", 'failed'],["If you’ve forgotten your password or your account is locked, use the link below to access your profile.", 'waiting']]) {
    const context=vm.createContext({URL,location:{href:'https://adviser-account.momentum.co.za/login'},document:{body:{innerText:text},querySelectorAll:()=>[]}});
    vm.runInContext(drive,context);
    const result=vm.runInContext("drive('unused','unused',true,'https://adviser-account.momentum.co.za',false,true)",context);
    assert.equal(result.state,expected);
    if(expected==='failed')assert.equal(result.reason,'locked');
  }
});
test('does not refill or resubmit password after submission even if the portal clears all inputs', () => {
  let writes=0,clicks=0;
  class Input {constructor(type){this.type=type;this.name=type==='password'?'password':'username';}get value(){return '';}set value(v){writes++;}getClientRects(){return[1];}focus(){}blur(){}dispatchEvent(){}getAttribute(){return null;}closest(){return null;}getRootNode(){return{};}}
  const inputs=[new Input('text'),new Input('password')];
  const document={body:{innerText:'Log in Username Password'},querySelectorAll:s=>s.includes('dialog')?[]:s==='input'?inputs:s==='*'?[]:[{textContent:'Log in',click:()=>clicks++,getClientRects:()=>[1]}]};
  const context=vm.createContext({URL,location:{href:'https://adviser-account.momentum.co.za/login'},document,HTMLInputElement:Input,Event:class{}});vm.runInContext(drive,context);
  assert.equal(vm.runInContext("drive('synthetic-user','synthetic-password',true,'https://adviser-account.momentum.co.za',false,true)",context).state,'waiting');
  assert.equal(writes,0);assert.equal(clicks,0);
});
