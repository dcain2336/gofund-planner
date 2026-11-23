/* One-off DOM-stub harness for GoFund Planner app.js.
   Loads the real app.js in a stubbed DOM, exercises state logic, share
   round-trip, license verify, and checks every getElementById target exists
   in index.html. Run: node /tmp/test-gofund.js */
'use strict';
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const appSrc = fs.readFileSync(process.argv[3] || 'app.js', 'utf8');

// 1. Every id referenced in app.js must exist in index.html — except the four
// the license modal injects dynamically into #modalBody via innerHTML.
const DYNAMIC_IDS = new Set(['licCheck', 'licEmail', 'licCode', 'licMsg']);
const idsInJs = [...new Set([...appSrc.matchAll(/\$\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]))];
const idsInHtml = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const missing = idsInJs.filter(id => !idsInHtml.has(id) && !DYNAMIC_IDS.has(id));
console.log('IDs referenced in app.js:', idsInJs.length, '| missing from index.html:', missing.length ? missing : 'none');
if (missing.length) process.exitCode = 1;

// 2. Stub DOM
function makeEl() {
  const el = {
    value: '', textContent: '', innerHTML: '', hidden: false, style: {},
    className: '', files: [], checked: false,
    addEventListener: function () {}, appendChild: function () {},
    querySelectorAll: function () { return []; },
    getAttribute: function () { return null; },
    click: function () {},
  };
  return el;
}
const elements = {};
const documentStub = {
  getElementById: function (id) {
    if (!elements[id]) elements[id] = makeEl();
    return elements[id];
  },
  createElement: function () { return makeEl(); },
  querySelector: function () { return makeEl(); },
  title: '',
};
const store = {};
const sandbox = {
  document: documentStub,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  location: { hash: '', origin: 'http://localhost:8000', pathname: '/index.html' },
  window: { print: function () {}, open: function () {} },
  navigator: {},
  confirm: () => true,
  alert: (m) => { console.log('ALERT:', m); },
  prompt: () => null,
  console,
  setTimeout: (fn) => 0,
  Blob: function () {},
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  FileReader: function () {},
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(appSrc, sandbox);

// 3. Exercise state logic through the app's own functions
const ctx = sandbox;
const assert = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name);
  if (!cond) process.exitCode = 1;
};

// seed demo, check totals
vm.runInContext('state = demoState(); save(); render();', sandbox);
const ft = vm.runInContext('fundTotals()', sandbox);
assert('demo raised $1480', ft.raised === 1480);
assert('demo goal $7400', ft.goal === 7400);
assert('demo pct 20', ft.pct === 20);
const bt = vm.runInContext('budgetTotals()', sandbox);
assert('demo budget total $7304', bt.total === 7304);
assert('demo per-person $1826', bt.perPerson === 1826);
assert('demo contingency $664', bt.contingency === 664);

// add a student + donation via the app's own state fns
vm.runInContext(`state.students.push({id: uid(), name: 'Test Kid', goal: 100, donations: [{id: uid(), donor: 'A', amount: 40, date: '2026-11-23', note: ''}]}); save(); render();`, sandbox);
const ft2 = vm.runInContext('fundTotals()', sandbox);
assert('after add: raised $1520', ft2.raised === 1520);

// license verify round-trip
const code = vm.runInContext(`licenseCodeFor('buyer@church.org')`, sandbox);
const ok = vm.runInContext(`verifyLicense('buyer@church.org', '${code}')`, sandbox);
const bad = vm.runInContext(`verifyLicense('buyer@church.org', 'GFP-0000-0000')`, sandbox);
assert('license verifies for matching email+code', ok === true);
assert('license rejects wrong code', bad === false);
assert('license rejects wrong email', vm.runInContext(`verifyLicense('other@church.org', '${code}')`, sandbox) === false);

// share link round-trip: build URL, decode payload, check fields
const url = vm.runInContext('shareUrl(state.students[0])', sandbox);
console.log('share URL:', url);
const hash = url.split('#s=')[1];
const payload = JSON.parse(Buffer.from(hash.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
assert('share payload has student name', payload.n === 'Maya R.');
assert('share payload raised matches', payload.r === 530);
assert('share payload goal matches', payload.g === 1850);
assert('share payload has no donor names', !JSON.stringify(payload).includes('Alvarez'));

// share view renders from the hash
sandbox.location.hash = '#s=' + hash;
const rendered = vm.runInContext('renderShareView()', sandbox);
assert('share view renders from link', rendered === true);
assert('share view sets title', sandbox.document.title.includes('Maya R.'));

// print report builds without error
vm.runInContext('buildPrintReport()', sandbox);
const pr = sandbox.document.getElementById('printReport').innerHTML;
assert('print report mentions trip', pr.includes('Guatemala'));
assert('print report has fundraising total', pr.includes('1,520'));
console.log('print report bytes:', pr.length);

// 4. Price $19.99, tracker installed, modal can actually close
const css = fs.readFileSync('styles.css', 'utf8');
assert('modal starts hidden in HTML', html.includes('id="modal" class="modal" hidden'));
assert('modal hidden rule present in CSS', /\.modal\[hidden\]\s*\{\s*display:\s*none/.test(css));
assert('Escape key closes modal', appSrc.includes('keydown') && appSrc.includes("'Escape'"));
assert('modal opens only via buy/license flow', (appSrc.match(/openModal\(/g) || []).length === 2);
assert('buy modal shows price + unlocks + license form', appSrc.includes('one-time.') && appSrc.includes('Unlocks unlimited') && appSrc.includes('licenseFormHtml'));
assert('traveler singular handled', appSrc.includes("traveler' + (headcount() === 1"));
assert('no $39 price left in app copy', !html.includes('$39') && !appSrc.includes('$39'));
assert('$19.99 price present in UI + code', html.includes('$19.99') && appSrc.includes('19.99'));
assert('tracker snippet installed in head', html.includes('ship-or-die.com/hackathon/verify.js') && html.includes('data-site="9c606ff57d3c78631ad73d4062c299409f16206b"'));

console.log('DONE — exit', process.exitCode || 0);
