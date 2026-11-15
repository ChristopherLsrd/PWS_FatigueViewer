'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SETTINGS_SCHEMA, PORTS, assertPort } = require('../../src/application/ports');

test('schéma des réglages', () => {
  const byKey = Object.fromEntries(SETTINGS_SCHEMA.map((s) => [s.key, s]));
  assert.deepEqual(Object.keys(byKey), ['showOfficeWidget', 'fatigueThreshold', 'includeHighRisk', 'widgetMaxItems']);
  assert.equal(byKey.showOfficeWidget.type, 'boolean');
  assert.equal(byKey.showOfficeWidget.default, true);
  assert.equal(byKey.fatigueThreshold.default, 50);
  assert.equal(byKey.fatigueThreshold.min, 0);
  assert.equal(byKey.fatigueThreshold.max, 100);
  assert.equal(byKey.fatigueThreshold.integer, true);
  assert.equal(byKey.includeHighRisk.default, true);
  assert.equal(byKey.widgetMaxItems.default, 8);
  assert.equal(byKey.widgetMaxItems.min, 1);
  assert.equal(byKey.widgetMaxItems.max, 20);
  assert.ok(Object.isFrozen(SETTINGS_SCHEMA));
});

test('liste des ports', () => {
  assert.deepEqual(PORTS.RosterReader, ['readRoster', 'readContract']);
  assert.deepEqual(PORTS.LeaveWriter, ['startLeave']);
  assert.deepEqual(PORTS.GameState, ['playerPromotionId', 'today']);
});

test('assertPort accepte un objet complet et le renvoie', () => {
  const writer = { startLeave() {} };
  assert.equal(assertPort('LeaveWriter', writer), writer);
});

test('assertPort refuse un objet incomplet, absent ou un port inconnu', () => {
  assert.throws(() => assertPort('LeaveWriter', {}), /startLeave/);
  assert.throws(() => assertPort('LeaveWriter', null), TypeError);
  assert.throws(() => assertPort('Nope', {}), /inconnu/);
});
