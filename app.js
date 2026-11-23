/* GoFund Planner — missions-trip fundraising & budget planner for small churches.
   Vanilla JS, no dependencies, no backend. All data lives in this browser's
   localStorage; nothing is uploaded anywhere.
   Price: $39 one-time. Free version: 1 trip, up to 3 students. */
'use strict';

var PRICE = 39;
/* Set this to your Stripe Payment Link URL after creating it in the Stripe
   Dashboard (see docs/CONNECT-CHECKLIST.md step 1). While empty, the Buy
   button explains the checkout is not connected yet. */
var STRIPE_PAYMENT_LINK = '';
var FREE_STUDENT_LIMIT = 3;
var STORE_KEY = 'gofund-planner-v1';

/* ---------- small helpers ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function money(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function uid() { return 'id-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

/* License codes: GFP-XXXX-XXXX, derived from the buyer's email with a plain
   hash. The seller mints codes with tools/make-license.js (same function).
   This is an honor-system check for the MVP — see README Limitations. */
function licenseCodeFor(email) {
  var s = String(email || '').trim().toLowerCase() + '|gofund-planner-v1';
  var h1 = 5381, h2 = 52711;
  for (var i = 0; i < s.length; i++) {
    h1 = ((h1 * 33) ^ s.charCodeAt(i)) >>> 0;
    h2 = ((h2 * 33) + s.charCodeAt(i)) >>> 0;
  }
  var hex = ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
  return ('GFP-' + hex.slice(0, 4) + '-' + hex.slice(4, 8)).toUpperCase();
}
function verifyLicense(email, code) {
  return String(code || '').trim().toUpperCase() === licenseCodeFor(email);
}

/* ---------- state ---------- */
function blankState() {
  return {
    trip: { name: '', destination: '', start: '', end: '', defaultGoal: 1850, contingencyPct: 10 },
    students: [],
    budget: [],
    license: null, /* { email, code } */
    seededDemo: false
  };
}
function load() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blankState();
    var s = JSON.parse(raw);
    if (!s.trip || !Array.isArray(s.students) || !Array.isArray(s.budget)) return blankState();
    return s;
  } catch (e) { return blankState(); }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

var state = load();
var isLicensed = !!(state.license && verifyLicense(state.license.email, state.license.code));
var headcount = function () { return state.students.length; };

/* ---------- demo data (clearly labeled, one click to clear) ---------- */
function demoState() {
  var s = blankState();
  s.trip = { name: 'NextGen Missions — Guatemala 2027', destination: 'Guatemala City, Guatemala',
    start: '2027-06-19', end: '2027-06-26', defaultGoal: 1850, contingencyPct: 10 };
  s.students = [
    { id: uid(), name: 'Maya R.', goal: 1850, donations: [
      { id: uid(), donor: 'The Alvarez family', amount: 250, date: '2026-11-10', note: '' },
      { id: uid(), donor: 'Grandma June', amount: 100, date: '2026-11-14', note: 'Birthday gift' },
      { id: uid(), donor: 'Youth group bake sale', amount: 180, date: '2026-11-18', note: '' } ] },
    { id: uid(), name: 'Jordan T.', goal: 1850, donations: [
      { id: uid(), donor: 'Mr. & Mrs. Patel', amount: 500, date: '2026-11-08', note: '' },
      { id: uid(), donor: 'Church missions fund', amount: 300, date: '2026-11-15', note: '' } ] },
    { id: uid(), name: 'Sofia L.', goal: 1850, donations: [
      { id: uid(), donor: 'Aunt Rosa', amount: 150, date: '2026-11-12', note: '' } ] },
    { id: uid(), name: 'Caleb M.', goal: 1850, donations: [] }
  ];
  s.budget = [
    { id: uid(), category: 'Flights', item: 'Round-trip airfare (RDU–GUA)', amount: 650, perPerson: true },
    { id: uid(), category: 'Lodging', item: 'Mission house, 7 nights', amount: 180, perPerson: true },
    { id: uid(), category: 'Food', item: 'Meals + clean water, 7 days', amount: 140, perPerson: true },
    { id: uid(), category: 'Ground transport', item: 'Vans + driver, 7 days', amount: 900, perPerson: false },
    { id: uid(), category: 'Insurance', item: 'Travel + medical insurance', amount: 65, perPerson: true },
    { id: uid(), category: 'Supplies', item: 'Ministry project materials', amount: 1200, perPerson: false },
    { id: uid(), category: 'Ministry / project', item: 'VBS supplies for partner church', amount: 400, perPerson: false }
  ];
  s.seededDemo = true;
  return s;
}

/* ---------- computed totals ---------- */
function studentRaised(st) {
  return st.donations.reduce(function (a, d) { return a + Number(d.amount || 0); }, 0);
}
function fundTotals() {
  var goal = state.students.reduce(function (a, s) { return a + Number(s.goal || 0); }, 0);
  var raised = state.students.reduce(function (a, s) { return a + studentRaised(s); }, 0);
  return { goal: goal, raised: raised, pct: goal > 0 ? Math.round(raised / goal * 100) : 0 };
}
function budgetTotals() {
  var n = Math.max(headcount(), 1);
  var sub = state.budget.reduce(function (a, b) {
    return a + Number(b.amount || 0) * (b.perPerson ? n : 1);
  }, 0);
  var cont = Math.round(sub * (Number(state.trip.contingencyPct || 0) / 100));
  return { subtotal: sub, contingency: cont, total: sub + cont, perPerson: n > 0 ? Math.round((sub + cont) / n) : 0 };
}

/* ---------- rendering ---------- */
function render() {
  renderTrip(); renderStudents(); renderBudget(); renderShare(); renderBanners();
}
function renderBanners() {
  $('demoBanner').hidden = !state.seededDemo;
  $('freeBanner').hidden = isLicensed || state.students.length === 0;
}
function renderTrip() {
  $('tripName').value = state.trip.name;
  $('tripDestination').value = state.trip.destination;
  $('tripStart').value = state.trip.start;
  $('tripEnd').value = state.trip.end;
  $('defaultGoal').value = state.trip.defaultGoal;
  $('contingencyPct').value = state.trip.contingencyPct;
}
function renderStudents() {
  var t = fundTotals();
  $('fundTotals').textContent = state.students.length === 0
    ? 'No students yet — add your first below.'
    : money(t.raised) + ' raised of ' + money(t.goal) + ' (' + t.pct + '%) · ' +
      state.students.length + ' student' + (state.students.length === 1 ? '' : 's');
  var wrap = $('studentList');
  wrap.innerHTML = '';
  state.students.forEach(function (st) {
    var raised = studentRaised(st);
    var pct = st.goal > 0 ? Math.min(100, Math.round(raised / st.goal * 100)) : 0;
    var div = document.createElement('div');
    div.className = 'student';
    div.innerHTML =
      '<div class="student-head"><span class="student-name">' + esc(st.name) + '</span>' +
      '<span class="student-amounts">' + money(raised) + ' / ' + money(st.goal) + ' (' + pct + '%)</span></div>' +
      '<div class="progress"><div class="progress-fill' + (raised >= st.goal ? ' over' : '') +
      '" style="width:' + pct + '%"></div></div>' +
      '<ul class="donor-list">' + st.donations.map(function (d) {
        return '<li><span>' + esc(d.donor) + (d.note ? ' — ' + esc(d.note) : '') +
          ' <span class="hint">(' + esc(d.date || '') + ')</span></span>' +
          '<span>' + money(d.amount) +
          ' <button class="link-btn" data-del-donation="' + d.id + '" data-student="' + st.id + '">remove</button></span></li>';
      }).join('') + '</ul>' +
      '<form class="donor-form" data-student="' + st.id + '">' +
      '<input type="text" name="donor" placeholder="Donor name" required maxlength="80">' +
      '<input type="number" name="amount" min="1" step="1" placeholder="Amount $" required>' +
      '<input type="date" name="date" value="' + todayISO() + '">' +
      '<button class="btn btn-small" type="submit">Log donation</button>' +
      '<button class="link-btn" type="button" data-del-student="' + st.id + '">remove student</button>' +
      '</form>';
    wrap.appendChild(div);
  });
  $('studentLimitHint').hidden = isLicensed || state.students.length < FREE_STUDENT_LIMIT;
  wrap.querySelectorAll('[data-del-donation]').forEach(function (b) {
    b.addEventListener('click', function () {
      var st = state.students.find(function (x) { return x.id === b.getAttribute('data-student'); });
      if (!st) return;
      st.donations = st.donations.filter(function (d) { return d.id !== b.getAttribute('data-del-donation'); });
      save(); render();
    });
  });
  wrap.querySelectorAll('[data-del-student]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!confirm('Remove this student and all their donations?')) return;
      state.students = state.students.filter(function (x) { return x.id !== b.getAttribute('data-del-student'); });
      save(); render();
    });
  });
  wrap.querySelectorAll('.donor-form').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var st = state.students.find(function (x) { return x.id === f.getAttribute('data-student'); });
      if (!st) return;
      st.donations.push({ id: uid(), donor: f.donor.value.trim(),
        amount: Number(f.amount.value), date: f.date.value || todayISO(), note: '' });
      save(); render();
    });
  });
}
function renderBudget() {
  var t = budgetTotals();
  $('budgetTotals').textContent = state.budget.length === 0
    ? 'No budget lines yet.'
    : 'Subtotal ' + money(t.subtotal) + ' · contingency ' + money(t.contingency) +
      ' · total ' + money(t.total) + ' · ' + money(t.perPerson) + ' per person (' + headcount() + ' travelers)';
  var body = $('budgetBody');
  body.innerHTML = '';
  state.budget.forEach(function (b) {
    var n = Math.max(headcount(), 1);
    var line = Number(b.amount || 0) * (b.perPerson ? n : 1);
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + esc(b.category) + '</td><td>' + esc(b.item) + '</td>' +
      '<td class="num">' + money(b.amount) + (b.perPerson ? ' × ' + n : '') + ' = ' + money(line) + '</td>' +
      '<td>' + (b.perPerson ? 'Yes' : 'No') + '</td>' +
      '<td><button class="link-btn" data-del-budget="' + b.id + '">remove</button></td>';
    body.appendChild(tr);
  });
  body.querySelectorAll('[data-del-budget]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.budget = state.budget.filter(function (x) { return x.id !== btn.getAttribute('data-del-budget'); });
      save(); render();
    });
  });
  var ft = fundTotals();
  var rec = $('reconcile');
  if (state.students.length === 0 || state.budget.length === 0) {
    rec.textContent = 'Add students and budget lines to see whether fundraising covers the trip.';
    rec.className = 'reconcile';
  } else if (ft.goal >= t.total) {
    rec.textContent = 'Covered: fundraising goals (' + money(ft.goal) + ') cover the trip budget (' +
      money(t.total) + ') with ' + money(ft.goal - t.total) + ' to spare.';
    rec.className = 'reconcile';
  } else {
    rec.textContent = 'Shortfall: the trip budget (' + money(t.total) + ') is ' + money(t.total - ft.goal) +
      ' above fundraising goals (' + money(ft.goal) + '). Raise goals, trim the budget, or add donors.';
    rec.className = 'reconcile short';
  }
}
function sharePayload(st) {
  return { t: state.trip.name, d: state.trip.destination, n: st.name,
    g: Number(st.goal || 0), r: studentRaised(st), c: st.donations.length, e: state.trip.end };
}
function shareUrl(st) {
  var json = JSON.stringify(sharePayload(st));
  var b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return location.origin + location.pathname + '#s=' + b64;
}
function renderShare() {
  var wrap = $('shareList');
  wrap.innerHTML = '';
  if (state.students.length === 0) {
    wrap.innerHTML = '<p class="hint">Add a student above and their share link will appear here.</p>';
    return;
  }
  state.students.forEach(function (st) {
    var url = shareUrl(st);
    var row = document.createElement('div');
    row.className = 'share-row';
    row.innerHTML = '<div><strong>' + esc(st.name) + '</strong><br><span class="share-link">' + esc(url) + '</span></div>';
    var btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = 'Copy link';
    btn.addEventListener('click', function () {
      var done = function () { btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = 'Copy link'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
      } else { prompt('Copy this link:', url); }
    });
    row.appendChild(btn);
    wrap.appendChild(row);
  });
}

/* ---------- share view (read-only page from the link itself) ---------- */
function renderShareView() {
  var m = location.hash.match(/^#s=([A-Za-z0-9\-_]+)$/);
  if (!m) return false;
  try {
    var json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))));
    var p = JSON.parse(json);
    if (!p.n || typeof p.g !== 'number') return false;
    $('appView').hidden = true;
    $('shareView').hidden = false;
    document.querySelector('.topbar').style.display = 'none';
    $('demoBanner').hidden = true; $('freeBanner').hidden = true;
    $('shareTripName').textContent = (p.t || 'Missions trip') + (p.d ? ' — ' + p.d : '');
    $('shareStudentName').textContent = p.n + ' is raising support for a missions trip';
    $('shareBlurb').textContent = 'Every dollar goes to the trip: travel, lodging, food, and ministry supplies.';
    var pct = p.g > 0 ? Math.min(100, Math.round(p.r / p.g * 100)) : 0;
    $('shareFill').style.width = pct + '%';
    $('shareAmounts').textContent = money(p.r) + ' raised of ' + money(p.g) + ' (' + pct + '%)';
    $('shareDonors').textContent = (p.c || 0) + ' supporter' + (p.c === 1 ? '' : 's') + ' so far' +
      (p.e ? ' · trip ends ' + p.e : '') + '.';
    document.title = p.n + ' — Missions Trip Fundraising | GoFund Planner';
    return true;
  } catch (e) { return false; }
}

/* ---------- print report ---------- */
function buildPrintReport() {
  var ft = fundTotals(), bt = budgetTotals();
  var rows = state.students.map(function (st) {
    var r = studentRaised(st);
    return '<tr><td>' + esc(st.name) + '</td><td>' + money(st.goal) + '</td><td>' + money(r) +
      '</td><td>' + money(Math.max(0, st.goal - r)) + '</td><td>' +
      (st.goal > 0 ? Math.round(r / st.goal * 100) : 0) + '%</td></tr>';
  }).join('');
  var brows = state.budget.map(function (b) {
    var n = Math.max(headcount(), 1);
    return '<tr><td>' + esc(b.category) + '</td><td>' + esc(b.item) + '</td><td>' + money(b.amount) +
      (b.perPerson ? ' × ' + n : '') + '</td></tr>';
  }).join('');
  $('printReport').innerHTML =
    '<h1>Board report — ' + esc(state.trip.name || 'Missions trip') + '</h1>' +
    '<p>' + esc(state.trip.destination || '') + ' · ' + esc(state.trip.start || '') + ' to ' + esc(state.trip.end || '') +
    ' · printed ' + todayISO() + '</p>' +
    '<h2>Fundraising — ' + money(ft.raised) + ' of ' + money(ft.goal) + ' (' + ft.pct + '%)</h2>' +
    '<table class="budget-table"><thead><tr><th>Student</th><th>Goal</th><th>Raised</th><th>Remaining</th><th>%</th></tr></thead><tbody>' +
    rows + '</tbody></table>' +
    '<h2>Budget — total ' + money(bt.total) + ' (' + money(bt.perPerson) + ' per person)</h2>' +
    '<table class="budget-table"><thead><tr><th>Category</th><th>Item</th><th>Cost</th></tr></thead><tbody>' +
    brows + '<tr><td>Contingency</td><td>' + (state.trip.contingencyPct || 0) + '%</td><td>' + money(bt.contingency) +
    '</td></tr></tbody></table>' +
    '<p><strong>' + (ft.goal >= bt.total ? 'Fundraising goals cover the budget with ' + money(ft.goal - bt.total) + ' to spare.'
      : 'Shortfall of ' + money(bt.total - ft.goal) + ' against fundraising goals.') + '</strong></p>' +
    '<p class="hint">GoFund Planner — $39 one-time. gofund-planner (GitHub: dcain2336/gofund-planner).</p>';
}

/* ---------- buy / license modal ---------- */
function openModal(title, bodyHtml) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHtml;
  $('modal').hidden = false;
}
function closeModal() { $('modal').hidden = true; }
function buyFlow() {
  if (STRIPE_PAYMENT_LINK) {
    window.open(STRIPE_PAYMENT_LINK, '_blank', 'noopener');
    openModal('Complete your purchase',
      '<p>Checkout opened in a new tab. After paying, you will get a license code by email — ' +
      'paste it with “Enter license code” to unlock unlimited students and trips.</p>' +
      '<p class="hint">Price: $' + PRICE + ' one-time. No subscription, no renewal.</p>');
  } else {
    openModal('Checkout is being connected',
      '<p>The $' + PRICE + ' one-time checkout is not wired up yet — the maker is connecting Stripe ' +
      'today. Check back soon, or email <a href="mailto:arc.agent.ops@gmail.com">arc.agent.ops@gmail.com</a>.</p>' +
      '<p class="hint">Meanwhile the free version works fully: 1 trip, up to 3 students, budget builder, share links, PDF export.</p>');
  }
}
function licenseFlow() {
  openModal('Enter license code',
    '<p>Bought GoFund Planner? Paste the license code from your purchase email.</p>' +
    '<label>Email used at checkout <input id="licEmail" type="text" placeholder="you@church.org"></label>' +
    '<label>License code <input id="licCode" type="text" placeholder="GFP-XXXX-XXXX"></label>' +
    '<button class="btn btn-primary" id="licCheck">Unlock</button> <span id="licMsg" class="hint"></span>' +
    '<p class="hint">Codes look like GFP-XXXX-XXXX. Lost yours? Email the maker.</p>');
  $('licCheck').addEventListener('click', function () {
    var email = $('licEmail').value, code = $('licCode').value;
    if (verifyLicense(email, code)) {
      state.license = { email: email.trim(), code: code.trim().toUpperCase() };
      isLicensed = true; save(); render();
      $('licMsg').textContent = ' Unlocked — thank you! Unlimited students and trips.';
    } else {
      $('licMsg').textContent = ' That code does not match that email. Check both and try again.';
    }
  });
}

/* ---------- events ---------- */
function bindEvents() {
  ['tripName', 'tripDestination', 'tripStart', 'tripEnd'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      var key = id.replace('trip', '').toLowerCase();
      state.trip[key] = $(id).value;
      save();
    });
  });
  $('defaultGoal').addEventListener('input', function () {
    state.trip.defaultGoal = Number($('defaultGoal').value) || 0; save();
  });
  $('contingencyPct').addEventListener('input', function () {
    state.trip.contingencyPct = Number($('contingencyPct').value) || 0; save(); renderBudget();
  });
  $('addStudentForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!isLicensed && state.students.length >= FREE_STUDENT_LIMIT) {
      $('studentLimitHint').hidden = false; buyFlow(); return;
    }
    var name = $('newStudentName').value.trim();
    if (!name) return;
    var goal = Number($('newStudentGoal').value) || Number(state.trip.defaultGoal) || 0;
    state.students.push({ id: uid(), name: name, goal: goal, donations: [] });
    $('newStudentName').value = ''; $('newStudentGoal').value = '';
    save(); render();
  });
  $('addBudgetForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    state.budget.push({ id: uid(), category: $('newBudgetCategory').value,
      item: $('newBudgetItem').value.trim(), amount: Number($('newBudgetAmount').value) || 0,
      perPerson: $('newBudgetPerPerson').checked });
    $('newBudgetItem').value = ''; $('newBudgetAmount').value = '';
    save(); render();
  });
  $('buyBtn').addEventListener('click', buyFlow);
  $('freeBuyBtn').addEventListener('click', buyFlow);
  $('licenseBtn').addEventListener('click', licenseFlow);
  $('modalClose').addEventListener('click', closeModal);
  $('modal').addEventListener('click', function (ev) { if (ev.target === $('modal')) closeModal(); });
  $('printBtn').addEventListener('click', function () { buildPrintReport(); window.print(); });
  $('exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gofund-planner-data.json';
    a.click(); URL.revokeObjectURL(a.href);
  });
  $('importFile').addEventListener('change', function (ev) {
    var f = ev.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var s = JSON.parse(r.result);
        if (!s.trip || !Array.isArray(s.students) || !Array.isArray(s.budget)) throw new Error('bad file');
        state = s; isLicensed = !!(state.license && verifyLicense(state.license.email, state.license.code));
        save(); render();
      } catch (e) { alert('That file is not GoFund Planner data.'); }
    };
    r.readAsText(f);
    ev.target.value = '';
  });
  $('seedBtn').addEventListener('click', function () {
    if (state.students.length > 0 && !confirm('Replace your current trip with the demo trip?')) return;
    state = demoState(); isLicensed = false; save(); render();
  });
  $('clearDemoBtn').addEventListener('click', function () {
    state = blankState(); isLicensed = false; save(); render();
  });
  $('resetBtn').addEventListener('click', function () {
    if (!confirm('Delete ALL GoFund Planner data in this browser? This cannot be undone. Export first if you need it.')) return;
    state = blankState(); isLicensed = false; save(); render();
  });
}

/* ---------- boot ---------- */
if (!renderShareView()) { bindEvents(); render(); }
