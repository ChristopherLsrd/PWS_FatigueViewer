'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderWidget, WIDGET_ID } = require('../../src/presentation/widgetHtml');

const ITEMS = [
  { contractId: 1, name: 'Tired <One>', fatigue: 70, risk: 0.0185, level: 'high', daysToRecover: 24, traits: {}, picture: 'Tired.png', contractPicture: null },
  { contractId: 2, name: 'Medium', fatigue: 50, risk: 0.0135, level: 'medium', daysToRecover: 17, traits: {}, picture: null, contractPicture: null },
];

test('rien à afficher si erreur ou widget désactivé', () => {
  assert.equal(renderWidget({ ok: false, reason: 'noSave' }, 'fr'), '');
  assert.equal(renderWidget({ ok: true, enabled: false, items: [], total: 0 }, 'fr'), '');
});

test('carte au format des widgets du Bureau, le titre ouvre la page', () => {
  assert.equal(WIDGET_ID, 'fatigueViewer');
  const html = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 2 }, 'fr');
  assert.match(html, /^<div class="panel" data-widget="fatigueViewer">/);
  assert.match(html, /<h3 class="fv-office-title" onclick="Game\.showPage\('fatigueViewerPage'\)">Fatigue et risque de blessure<\/h3>/);
  assert.match(html, /<div class="panelContents fv-office">/);
  assert.doesNotMatch(html, /Voir tout/);
});

test('une ligne par catcheur : avatar, nom, badge, puis fatigue et risque', () => {
  const html = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 2 }, 'fr');
  assert.equal((html.match(/class="fv-office-row"/g) || []).length, 2);
  assert.match(html, /<div class="fv-office-row" onclick="[^"]*"><span class="fv-avatar"[^>]*data-fv-picture="Tired\.png"[^>]*>TO<\/span><div class="fv-office-text"><div class="fv-office-top">/);
  assert.match(html, /<span class="fv-office-name">Tired &lt;One&gt;<\/span>/);
  assert.match(html, /class="fv-badge fv-level-high">Élevé</);
  assert.match(html, /class="fv-badge fv-level-medium">Moyen</);
  assert.match(html, /<div class="fv-office-meta">Fatigue 70 · 1,9.%<\/div>/);
});

test('un clic sur une ligne ouvre la fiche du catcheur (par son contrat)', () => {
  const html = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 2 }, 'fr');
  assert.match(html, /onclick="if \(typeof Booking !== &#39;undefined&#39; &amp;&amp; Booking\.showWorkerDetails\) Booking\.showWorkerDetails\(1\)"/);
  assert.match(html, /Booking\.showWorkerDetails\(2\)/);
  const odd = renderWidget({ ok: true, enabled: true, items: [{ ...ITEMS[0], contractId: '1);alert(1' }], total: 1 }, 'fr');
  assert.match(odd, /Booking\.showWorkerDetails\(NaN\)/);
});

test('indique les catcheurs non affichés', () => {
  const html = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 5 }, 'fr');
  assert.match(html, /class="fv-office-more">\+ 3 autres</);
  const one = renderWidget({ ok: true, enabled: true, items: ITEMS, total: 3 }, 'fr');
  assert.match(one, /\+ 1 autre</);
  assert.doesNotMatch(renderWidget({ ok: true, enabled: true, items: ITEMS, total: 2 }, 'fr'), /fv-office-more/);
});

test('message quand personne n\'est à surveiller, la carte reste', () => {
  const html = renderWidget({ ok: true, enabled: true, items: [], total: 0 }, 'fr');
  assert.match(html, /data-widget="fatigueViewer"/);
  assert.match(html, /<div class="fv-office-empty">Aucun catcheur fatigué ou à risque\.<\/div>/);
  assert.match(renderWidget({ ok: true, enabled: true, items: [], total: 0 }, 'en'), /No tired or at-risk wrestler\./);
});

test('la fatigue décimale est arrondie dans le widget', () => {
  const html = renderWidget({
    ok: true,
    enabled: true,
    items: [{ contractId: 3, name: 'Decimal', fatigue: 14.6, risk: 0.01, level: 'low', daysToRecover: 3, traits: {} }],
    total: 1,
  }, 'fr');
  assert.match(html, /Fatigue 15 ·/);
});
