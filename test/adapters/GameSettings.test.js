'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameSettings } = require('../../src/adapters/GameSettings');
const { SETTINGS_SCHEMA } = require('../../src/application/ports');

function fakeSettingsApi(stored = {}) {
  return {
    registered: null,
    stored,
    register(defs) { this.registered = defs; },
    get(key) { return this.stored[key]; },
    set(key, value) { this.stored[key] = value; },
  };
}

test('enregistre le schéma auprès du jeu', () => {
  const api = fakeSettingsApi();
  createGameSettings(api);
  assert.deepEqual(api.registered.map((s) => s.key), SETTINGS_SCHEMA.map((s) => s.key));
});

test('get renvoie la valeur stockée ou le défaut', () => {
  const settings = createGameSettings(fakeSettingsApi({ fatigueThreshold: 70, includeHighRisk: null }));
  assert.equal(settings.get('fatigueThreshold'), 70);
  assert.equal(settings.get('includeHighRisk'), true);
  assert.equal(settings.get('widgetMaxItems'), 8);
});

test('set écrit dans le jeu', () => {
  const api = fakeSettingsApi();
  createGameSettings(api).set('widgetMaxItems', 5);
  assert.equal(api.stored.widgetMaxItems, 5);
});
