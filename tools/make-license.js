#!/usr/bin/env node
/* Mint a GoFund Planner license code for a buyer.
   Usage: node tools/make-license.js buyer@email.com
   The buyer enters the email + code in the app; the app verifies with the
   same hash. This is an honor-system check for the MVP (see README). */
'use strict';

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

var email = process.argv[2];
if (!email || !email.includes('@')) {
  console.error('Usage: node tools/make-license.js buyer@email.com');
  process.exit(1);
}
console.log('Email: ' + email.trim().toLowerCase());
console.log('Code:  ' + licenseCodeFor(email));
