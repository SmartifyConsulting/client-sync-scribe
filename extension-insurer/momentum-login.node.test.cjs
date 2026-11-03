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
  const inputs = [search, ...(password ? [{ ...search, type: 'password' }] : [])];
  const context = vm.createContext({ URL, location: { href: 'https://adviserconnect.momentum.co.za/' },
    document: { title, body: { innerText: welcome ? 'Welcome to AdviserConnect\nQuotes & calculators' : '' }, querySelectorAll: () => inputs } });
  vm.runInContext(drive, context);
  const result = vm.runInContext('drive("unused", "unused", true, "https://adviserconnect.momentum.co.za", false)', context);
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
