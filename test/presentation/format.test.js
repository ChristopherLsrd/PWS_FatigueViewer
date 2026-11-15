'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, formatPercent, formatDate } = require('../../src/presentation/format');

test('escapeHtml échappe les caractères HTML et accepte null', () => {
  assert.equal(escapeHtml('<b>"A" & \'B\'</b>'), '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(12), '12');
});

test('formatPercent : une décimale, séparateur selon la langue', () => {
  assert.equal(formatPercent(0.015, 'en'), '1.5%');
  assert.match(formatPercent(0.015, 'fr'), /^1,5\s%$/u);
  assert.equal(formatPercent(0.001, 'ja'), '0.1%');
});

test('formatDate : date longue selon la langue, en UTC', () => {
  assert.equal(formatDate('2026-08-26', 'en'), 'August 26, 2026');
  assert.equal(formatDate('2026-08-26', 'fr'), '26 août 2026');
  assert.equal(formatDate('2026-01-01', 'fr'), '1 janvier 2026');
});

test('formatDate renvoie null pour une date invalide', () => {
  assert.equal(formatDate('', 'fr'), null);
  assert.equal(formatDate(null, 'fr'), null);
  assert.equal(formatDate('26/08/2026', 'fr'), null);
});
