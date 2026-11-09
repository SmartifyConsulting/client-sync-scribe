const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/background.js`, 'utf8');
const drive = source.slice(source.indexOf('function drive('), source.indexOf('function fillOtp('));

function attempt({ url, astute = false, pin = '', submitted = false, blocked = false, xplanCode = false }) {
  let clicks = 0;
  const action = { value: astute ? 'Login' : 'Log On', type: 'button', getClientRects: () => [1], click: () => clicks++, closest: () => form };
  const form = { querySelectorAll: s => s.includes('button') || s.includes('#btnLogin') ? [action] : [] };
  class Input {
    constructor(type, name) { this.type = type; this.name = name; this.current = ''; }
    get value() { return this.current; }
    set value(value) { this.current = value; }
    closest() { return form; }
    getClientRects() { return [1]; }
    getAttribute() { return null; }
    focus() {} blur() {} dispatchEvent() {}
  }
  const inputs = [new Input('text', 'Username'), new Input('password', 'password')];
  if (astute) inputs.push(new Input('password', 'pin'));
  if (xplanCode) inputs.push(Object.assign(new Input('text', 'tfa_token'), { id: 'tfa_token' }));
  const document = { body: { innerText: 'Sign in' }, querySelectorAll: s => s === 'input' ? inputs : blocked && s.includes('dialog') ? [action] : [] };
  const context = vm.createContext({ URL, location: { href: url }, document, HTMLInputElement: Input, Event: class {}, pin, submitted });
  vm.runInContext(drive, context);
  const result = vm.runInContext("drive('demo-user','demo-password',submitted,new URL(location.href).origin,false,submitted,false,pin)", context);
  return { state: result.state, clicks, values: inputs.map(i => i.value) };
}

test('Astute submits the observed three-field form once with a four-digit PIN', () => {
  const login = { url: 'https://aol.astutefse.com/online/account/login', astute: true, pin: '0123' };
  assert.deepEqual(attempt(login), { state: 'submitted', clicks: 1, values: ['demo-user', 'demo-password', '0123'] });
  for (const options of [{ pin: '' }, { pin: '123' }, { submitted: true }, { blocked: true }]) {
    const result = attempt({ ...login, ...options });
    assert.equal(result.clicks, 0);
    assert.deepEqual(result.values, ['', '', '']);
  }
});

test('Xplan recognises Log On only on the supported Masthead login route', () => {
  assert.equal(attempt({ url: 'https://mastheadfs.xplan.iress.co.za/login2' }).clicks, 1);
  assert.equal(attempt({ url: 'https://mastheadfs.xplan.iress.co.za/other' }).clicks, 0);
  assert.equal(attempt({ url: 'https://other.xplan.iress.co.za/login2' }).clicks, 0);
});

test('Xplan requests manual verification when the Security Code and password are both visible', () => {
  const result = attempt({ url: 'https://mastheadfs.xplan.iress.co.za/login2', xplanCode: true, submitted: true });
  assert.deepEqual(result, { state: 'xplan-verification', clicks: 0, values: ['', '', ''] });
});

test('Astute confirms only the observed signed-in CCP Home navigation', () => {
  const origin = 'https://aol.astutefse.com';
  const link = (textContent, path) => ({ textContent, href: origin + path, getClientRects: () => [1] });
  const nav = [
    link('My Clients', '/Online/Ccp/Client/ClientManager'),
    link('Create Request', '/Online/Ccp/Request/'),
    link('My Transactions', '/Online/Ccp/Response/'),
  ];
  function probe({ title = 'Astute Online CCP Home', path = '/Online/Ccp', links = nav, password = false } = {}) {
    const input = { type: 'password', getClientRects: () => [1], getAttribute: () => null };
    const document = { title, body: { innerText: 'CCP Quick Transact' },
      querySelectorAll: s => s === 'a' ? links : s === 'input' && password ? [input] : [] };
    const context = vm.createContext({ URL, location: { href: origin + path }, document });
    vm.runInContext(drive, context);
    return vm.runInContext("drive('', '', true, 'https://aol.astutefse.com', false, true, true)", context).state;
  }
  assert.equal(probe(), 'in');
  assert.equal(probe({ path: '/online/account/login' }), 'waiting');
  assert.equal(probe({ title: 'Astute Online Login' }), 'waiting');
  assert.equal(probe({ links: nav.slice(0, 2) }), 'waiting');
  assert.equal(probe({ links: [nav[0], nav[1], { ...nav[2], href: 'https://other.example/Online/Ccp/Response/' }] }), 'waiting');
  assert.equal(probe({ password: true }), 'waiting');
});
