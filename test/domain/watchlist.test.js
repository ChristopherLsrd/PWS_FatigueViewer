'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWatchlist } = require('../../src/domain/watchlist');

function w(name, fatigue, level, risk) {
  return { contractId: name.length, workerId: 1, name, fatigue, level, risk, daysToRecover: 0, traits: {} };
}

const AVAILABLE = [
  w('Rested', 5, 'low', 0.0035),
  w('Tired', 60, 'high', 0.016),
  w('Fragile', 30, 'high', 0.017),
  w('Medium', 50, 'medium', 0.0135),
];

test('garde les catcheurs au-dessus du seuil ou à risque élevé, triés par risque', () => {
  const result = buildWatchlist(AVAILABLE, { fatigueThreshold: 50, includeHighRisk: true, maxItems: 8 });
  assert.deepEqual(result.items.map((x) => x.name), ['Fragile', 'Tired', 'Medium']);
  assert.equal(result.total, 3);
});

test('sans le risque élevé, seul le seuil de fatigue compte', () => {
  const result = buildWatchlist(AVAILABLE, { fatigueThreshold: 50, includeHighRisk: false, maxItems: 8 });
  assert.deepEqual(result.items.map((x) => x.name), ['Tired', 'Medium']);
});

test('tronque à maxItems mais garde le total', () => {
  const result = buildWatchlist(AVAILABLE, { fatigueThreshold: 0, includeHighRisk: true, maxItems: 2 });
  assert.deepEqual(result.items.map((x) => x.name), ['Fragile', 'Tired']);
  assert.equal(result.total, 4);
});

test('liste vide', () => {
  assert.deepEqual(buildWatchlist([], { fatigueThreshold: 50, includeHighRisk: true, maxItems: 8 }), { items: [], total: 0 });
});

test('ne modifie pas le tableau reçu', () => {
  const input = AVAILABLE.slice();
  buildWatchlist(input, { fatigueThreshold: 0, includeHighRisk: true, maxItems: 8 });
  assert.deepEqual(input, AVAILABLE);
});
