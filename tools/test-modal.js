/* Behavioral modal test for GoFund Planner — runs the real app.js in a
   recording DOM stub and exercises the Buy modal end to end.
   Run from the app dir: node /tmp/test-modal.js */
'use strict';
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const appSrc = fs.readFileSync('app.js', 'utf8');

function makeEl(id) {
  const el = {
    id, value: '', textContent: '', innerHTML: '', hidden: false, style: {},
    className: '', files: [], checked: false,
    _listeners: {},
    addEventListener: function (t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
    appendChild: function () {},
    querySelectorAll: function () { return []; },
    getAttribute: function () { return null; },
    click: function () {},
    dispatch: function (t, ev) { (this._listeners[t] || []).forEach(fn => fn(ev || {})); },
  };
  return el;
}
const elements = {};
const docListeners = {};
const documentStub = {
  getElementById: function (id) { if (!elements[id]) elements[id] = makeEl(id); return elements[id]; },
  createElement: function () { return makeEl(''); },
  querySelector: function () { return makeEl(''); },
  title: '',
  addEventListener: function (t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
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
  alert: () => {},
  prompt: () => null,
  console,
  setTimeout: (fn) => 0,
  Blob: function () {},
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  FileReader: function () {},
};
sandbox.window = sandbox;

// Mirror the HTML: the modal starts with the hidden attribute.
documentStub.getElementById('modal').hidden = true;

vm.createContext(sandbox);
vm.runInContext(appSrc, sandbox);

const assert = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name);
  if (!cond) process.exitCode = 1;
};
const modal = () => sandbox.document.getElementById('modal');

assert('modal hidden after page load (never auto-opens)', modal().hidden === true);

vm.runInContext('buyFlow()', sandbox);
assert('buy click opens modal', modal().hidden === false);
const body = modal().innerHTML; // openModal writes title/body; body lives on #modalBody
const modalBody = sandbox.document.getElementById('modalBody').innerHTML;
assert('buy modal shows $19.99 price', modalBody.includes('$19.99'));
assert('buy modal says what license unlocks', modalBody.includes('Unlocks unlimited'));
assert('buy modal has license-code entry', modalBody.includes('id="licEmail"') && modalBody.includes('id="licCode"'));

// Escape dismisses
(docListeners.keydown || []).forEach(fn => fn({ key: 'Escape' }));
assert('Escape closes modal', modal().hidden === true);

// Close button dismisses
vm.runInContext('buyFlow()', sandbox);
sandbox.document.getElementById('modalClose').dispatch('click');
assert('Close button closes modal', modal().hidden === true);

// Backdrop click dismisses; click inside the box does not
vm.runInContext('buyFlow()', sandbox);
modal().dispatch('click', { target: makeEl('inner-box') });
assert('click inside modal box does not close', modal().hidden === false);
modal().dispatch('click', { target: modal() });
assert('backdrop click closes modal', modal().hidden === true);

// License unlock works from the buy modal form
vm.runInContext('buyFlow()', sandbox);
const code = vm.runInContext("licenseCodeFor('buyer@church.org')", sandbox);
sandbox.document.getElementById('licEmail').value = 'buyer@church.org';
sandbox.document.getElementById('licCode').value = code;
sandbox.document.getElementById('licCheck').dispatch('click');
assert('license unlocks from buy modal', sandbox.document.getElementById('licMsg').textContent.includes('Unlocked'));
assert('license modal closes state: app is licensed', vm.runInContext('isLicensed', sandbox) === true);

console.log('DONE — exit', process.exitCode || 0);
