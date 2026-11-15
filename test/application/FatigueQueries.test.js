'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFatigueQueries } = require('../../src/application/FatigueQueries');
const {
  rosterRow, createFakeRoster, createFakeSettings, createFakeGameState, createFakeLogger,
} = require('../fakes');

function setup({ rows = [], settings = {}, gameState = {}, throws = null } = {}) {
  const roster = createFakeRoster({ rows, throws });
  const logger = createFakeLogger();
  const queries = createFatigueQueries({
    roster, gameState: createFakeGameState(gameState), settings: createFakeSettings(settings), logger,
  });
  return { queries, roster, logger };
}

const ROWS = [
  rosterRow({ contractId: 1, name: 'Tired', fatigue: 70 }),
  rosterRow({ contractId: 2, name: 'Fresh', fatigue: 10 }),
  rosterRow({ contractId: 3, name: 'Fragile', fatigue: 30, injuryProne: true }),
  rosterRow({ contractId: 4, name: 'Hurt', fatigue: 90, injuryType: 'Neck Injury', injuryHealDate: '2027-01-01' }),
];

test('refuse des ports incomplets', () => {
  assert.throws(() => createFatigueQueries({}), TypeError);
});

test('getReport lit le roster de la promotion du joueur à la date du jeu', () => {
  const { queries, roster } = setup({ rows: ROWS, gameState: { promotionId: 239, today: '2026-08-20' } });
  const result = queries.getReport();
  assert.equal(result.ok, true);
  assert.equal(result.today, '2026-08-20');
  assert.deepEqual(roster.calls, [['readRoster', 239, '2026-08-20']]);
  assert.deepEqual(result.report.available.map((w) => w.name), ['Tired', 'Fragile', 'Fresh']);
  assert.deepEqual(result.report.injured.map((w) => w.name), ['Hurt']);
});

test('getReport sans sauvegarde chargée', () => {
  assert.deepEqual(setup({ gameState: { promotionId: null } }).queries.getReport(), { ok: false, reason: 'noSave' });
  assert.deepEqual(setup({ gameState: { today: null } }).queries.getReport(), { ok: false, reason: 'noSave' });
});

test('getReport attrape une erreur de lecture', () => {
  const { queries, logger } = setup({ throws: new Error('SQL') });
  assert.deepEqual(queries.getReport(), { ok: false, reason: 'readFailed' });
  assert.equal(logger.errors.length, 1);
});

test('getWatchlist applique les réglages', () => {
  const { queries } = setup({ rows: ROWS });
  const result = queries.getWatchlist();
  assert.equal(result.ok, true);
  assert.equal(result.enabled, true);
  assert.deepEqual(result.items.map((w) => w.name), ['Tired', 'Fragile']);
  assert.equal(result.total, 2);
});

test('getWatchlist : seuil, risque élevé et nombre max réglables', () => {
  const noRisk = setup({ rows: ROWS, settings: { includeHighRisk: false } }).queries.getWatchlist();
  assert.deepEqual(noRisk.items.map((w) => w.name), ['Tired']);
  const limited = setup({ rows: ROWS, settings: { fatigueThreshold: 0, widgetMaxItems: 1 } }).queries.getWatchlist();
  assert.deepEqual(limited.items.map((w) => w.name), ['Tired']);
  assert.equal(limited.total, 3);
});

test('getWatchlist désactivé ne lit pas le roster', () => {
  const { queries, roster } = setup({ rows: ROWS, settings: { showOfficeWidget: false } });
  assert.deepEqual(queries.getWatchlist(), { ok: true, enabled: false, items: [], total: 0 });
  assert.equal(roster.calls.length, 0);
});

test('getWatchlist propage noSave et attrape les erreurs', () => {
  assert.deepEqual(setup({ gameState: { promotionId: null } }).queries.getWatchlist(), { ok: false, reason: 'noSave' });
  assert.deepEqual(setup({ throws: new Error('SQL') }).queries.getWatchlist(), { ok: false, reason: 'readFailed' });
});
