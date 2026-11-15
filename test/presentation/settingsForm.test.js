'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderSettingsForm } = require('../../src/presentation/settingsForm');

const SCHEMA = [
  { key: 'showOfficeWidget', type: 'boolean', default: true },
  { key: 'fatigueThreshold', type: 'number', default: 50, min: 0, max: 100 },
];

test('formulaire des réglages traduit avec les valeurs courantes', () => {
  const html = renderSettingsForm(SCHEMA, { showOfficeWidget: false, fatigueThreshold: 65 }, 'fr');
  assert.match(html, /<form class="fv-settings" data-fv-saved="Enregistré" data-fv-error="Échec de l&#39;enregistrement"/);
  assert.match(html, /<h3>Réglages<\/h3>/);
  assert.match(html, /Widget du Bureau/);
  assert.match(html, /<input type="checkbox" data-fv-setting="showOfficeWidget">/);
  assert.match(html, /<input type="number" data-fv-setting="fatigueThreshold" min="0" max="100" step="1" value="65">/);
  assert.match(html, /Fatigue minimale pour apparaître dans le widget/);
  assert.match(html, /class="fv-settings-status"/);
});

test('case cochée quand la valeur est vraie', () => {
  const html = renderSettingsForm(SCHEMA, { showOfficeWidget: true, fatigueThreshold: 50 }, 'en');
  assert.match(html, /<input type="checkbox" data-fv-setting="showOfficeWidget" checked>/);
});
