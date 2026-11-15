'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWidget } = require('../../src/presentation/widgetHtml');

const ITEMS = [
  { contractId: 1, name: 'Tired <One>', fatigue: 70, risk: 0.0185, level: 'high', daysToRecover: 24, traits: {} },
  { contractId: 2, name: 'Medium', fatigue: 50, risk: 0.0135, level: 'medium', daysToRecover: 17, traits: {} },
];

test('rien à afficher si erreur ou widget désactivé', () => {
  assert.equal(renderWidget({ ok: false, reason: 'noSave' }, 'fr'), '');
  assert.equal(renderWidget({ ok: true, enabled: false, items: [], total: 0 }, 'fr'), '');
});

test('liste compacte des catcheurs à surveiller', () => {
  const html = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 2 }, 'fr');
  assert.match(html, /class="panel fv-widget"/);
  assert.match(html, /Fatigue et risque de blessure/);
  assert.match(html, /Tired &lt;One&gt;/);
  assert.match(html, /Fatigue 70/);
  assert.match(html, /class="fv-badge fv-level-high">Élevé</);
  assert.match(html, /class="fv-badge fv-level-medium">Moyen</);
  assert.match(html, /data-navigate-to="fatigueViewerPage">Voir tout</);
  assert.doesNotMatch(html, /fv-widget-more/);
});

test('indique les catcheurs non affichés', () => {
  const html = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 5 }, 'fr');
  assert.match(html, /class="fv-widget-more">\+ 3 autres</);
  const one = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 3 }, 'fr');
  assert.match(one, /\+ 1 autre</);
});

test('message quand personne n\'est à surveiller', () => {
  const html = renderWidget({ ok: true, enabled: true, items: [], total: 0 }, 'fr');
  assert.match(html, /Aucun catcheur à surveiller\./);
  assert.match(html, /data-navigate-to="fatigueViewerPage"/);
});

test('la fatigue décimale est arrondie dans le widget', () => {
  const html = renderWidget({
    ok: true,
    enabled: true,
    items: [{ contractId: 3, name: 'Decimal', fatigue: 14.6, risk: 0.01, level: 'low', daysToRecover: 3, traits: {} }],
    total: 1,
  }, 'fr');
  assert.match(html, /Fatigue 15/);
});
