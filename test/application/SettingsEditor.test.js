'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSettingsEditor } = require('../../src/application/SettingsEditor');
const { createFakeSettings, createFakeLogger } = require('../fakes');

function setup(overrides) {
  const settings = createFakeSettings(overrides);
  const logger = createFakeLogger();
  return { editor: createSettingsEditor({ settings, logger }), settings, logger };
}

test('getAll renvoie toutes les valeurs', () => {
  assert.deepEqual(setup().editor.getAll(), {
    showOfficeWidget: true, fatigueThreshold: 50, includeHighRisk: true, widgetMaxItems: 8,
  });
});

test('set enregistre un booléen', () => {
  const { editor, settings } = setup();
  assert.deepEqual(editor.set('showOfficeWidget', false), { ok: true, value: false });
  assert.equal(settings.values.showOfficeWidget, false);
});

test('set borne et arrondit les nombres', () => {
  const { editor, settings } = setup();
  assert.deepEqual(editor.set('fatigueThreshold', 140), { ok: true, value: 100 });
  assert.deepEqual(editor.set('fatigueThreshold', -3), { ok: true, value: 0 });
  assert.deepEqual(editor.set('widgetMaxItems', 4.6), { ok: true, value: 5 });
  assert.deepEqual(editor.set('widgetMaxItems', 0), { ok: true, value: 1 });
  assert.equal(settings.values.widgetMaxItems, 1);
});

test('set refuse une clé inconnue ou un mauvais type', () => {
  const { editor, settings } = setup();
  assert.deepEqual(editor.set('nope', 1), { ok: false });
  assert.deepEqual(editor.set('showOfficeWidget', 'yes'), { ok: false });
  assert.deepEqual(editor.set('fatigueThreshold', '60'), { ok: false });
  assert.deepEqual(editor.set('fatigueThreshold', NaN), { ok: false });
  assert.equal(settings.values.fatigueThreshold, 50);
});

test('set attrape une erreur d\'enregistrement', () => {
  const { editor, settings, logger } = setup();
  settings.set = () => { throw new Error('disk'); };
  assert.deepEqual(editor.set('showOfficeWidget', false), { ok: false });
  assert.equal(logger.errors.length, 1);
});
