const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/background.js`, 'utf8');
const drive = source.slice(source.indexOf('function drive('), source.indexOf('function fillOtp('));

function run({ path = '/', title = 'Connect Portal | Login', passwordSubmitted = false, probe = false } = {}) {
  let clicks = 0;
  class Input {
    constructor(type, id) { this.type = type; this.id = id; this.current = ''; }
    get value() { return this.current; }
    set value(value) { this.current = value; }
    getClientRects() { return [1]; }
    getAttribute() { return null; }
    focus() {} blur() {} dispatchEvent() {}
  }
  const id = new Input('text', 'IdNumber');
  const username = new Input('text', 'Username');
  const password = new Input('password', 'Password');
  const document = { title, body: { innerText: 'Connect Log In' }, querySelectorAll: selector =>
    selector === 'input' ? [username, id, password] :
    selector.includes('#loginSubmit') ? [{ getClientRects: () => [1], click: () => clicks++ }] : [] };
  const origin = 'https://connect.masthead.co.za';
  const context = vm.createContext({ URL, location: { href: origin + path }, document, HTMLInputElement: Input, Event: class {}, origin, passwordSubmitted, probe });
  vm.runInContext(drive, context);
  const result = vm.runInContext("drive('DEMO-ID','demo-password',false,origin,false,passwordSubmitted,probe)", context);
  return { state: result.state, id: id.value, username: username.value, password: password.value, clicks };
}

test('Masthead writes the identifier only to IdNumber and submits the known login once', () => {
  assert.deepEqual(run(), { state: 'submitted', id: 'DEMO-ID', username: '', password: 'demo-password', clicks: 1 });
  for (const options of [{ path: '/other' }, { title: 'Other form' }, { passwordSubmitted: true }, { probe: true }]) {
    const result = run(options);
    assert.equal(result.state, options.probe ? 'login' : 'waiting');
    assert.deepEqual([result.id, result.username, result.password, result.clicks], ['', '', '', 0]);
  }
});
