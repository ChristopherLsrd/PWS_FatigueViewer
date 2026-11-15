'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderPageShell, renderReport, renderReportError } = require('../../src/presentation/reportHtml');

const REPORT = {
  available: [
    {
      contractId: 13100, workerId: 9729, name: 'Celine <Faery>', picture: 'Celine.png', contractPicture: 'Gimmick.png',
      fatigue: 60, risk: 0.032, level: 'high', daysToRecover: 20,
      traits: { injuryProne: true, cursed: false, robust: false },
    },
    {
      contractId: 2, workerId: 2, name: 'Fresh', fatigue: 0, risk: 0.001, level: 'low', daysToRecover: 0,
      traits: { injuryProne: false, cursed: false, robust: true },
    },
  ],
  onLeave: [
    { contractId: 3, workerId: 3, name: 'Resting', reason: 'timeOff', returnDate: '2026-08-26' },
    { contractId: 4, workerId: 4, name: 'Banned', reason: 'suspension', returnDate: null },
  ],
  injured: [{ contractId: 5, workerId: 5, name: 'Hurt', injuryType: 'Neck Injury', returnDate: '2027-01-01' }],
};

test('la coquille de page contient les points d\'accroche du script', () => {
  const html = renderPageShell();
  assert.match(html, /data-plugin-id="fatigue-viewer"/);
  assert.match(html, /id="fv-settings-button"/);
  assert.match(html, /class="fv-settings-label"/);
  assert.match(html, /id="fv-status"/);
  assert.match(html, /id="fv-content"/);
});

test('tableau des disponibles en français', () => {
  const html = renderReport(REPORT, 'fr');
  assert.match(html, /Catcheurs disponibles <span class="fv-count">\(2\)<\/span>/);
  assert.match(html, /Celine &lt;Faery&gt;/);
  assert.doesNotMatch(html, /<Faery>/);
  assert.match(html, /class="fv-badge fv-level-high">Élevé</);
  assert.match(html, /3,2\s%/u);
  assert.match(html, /20 jours/);
  assert.match(html, /Reposé/);
  assert.match(html, /fv-trait-injuryProne">Fragile</);
  assert.match(html, /fv-trait-robust">Robuste</);
  assert.match(html, /data-fv-leave="13100">Congé</);
  assert.match(html, /style="width:60%"/);
});

test('les lignes portent les valeurs de tri et les en-têtes sont triables', () => {
  const html = renderReport(REPORT, 'en');
  assert.match(html, /data-sort-name="celine &lt;faery&gt;"/);
  assert.match(html, /data-sort-fatigue="60"/);
  assert.match(html, /data-sort-risk="0.032"/);
  assert.match(html, /data-sort-recovery="20"/);
  for (const key of ['name', 'fatigue', 'risk', 'recovery']) {
    assert.match(html, new RegExp(`th data-fv-sort="${key}"`));
  }
  assert.match(html, /th data-fv-sort="name" data-fv-type="text"/);
  assert.match(html, /th data-fv-sort="fatigue" data-fv-type="number"/);
});

test('sections congés et blessés', () => {
  const html = renderReport(REPORT, 'fr');
  assert.match(html, /En congé \/ suspendus <span class="fv-count">\(2\)<\/span>/);
  assert.match(html, /Resting<\/span><\/span><\/td><td>Congé<\/td><td>26 août 2026</);
  assert.match(html, /Banned<\/span><\/span><\/td><td>Suspension<\/td><td>Inconnue</);
  assert.match(html, /Blessés <span class="fv-count">\(1\)<\/span>/);
  assert.match(html, /Hurt<\/span><\/span><\/td><td>Neck Injury<\/td><td>1 janvier 2027</);
});

test('chaque nom est précédé de son avatar, dans les trois sections', () => {
  const html = renderReport(REPORT, 'fr');
  assert.equal((html.match(/class="fv-avatar"/g) || []).length, 5);
  assert.match(html, /data-fv-picture="Celine.png" data-fv-contract-picture="Gimmick.png">CF<\/span>/);
  assert.match(html, /aria-label="Photo de Celine &lt;Faery&gt;"/);
  assert.match(html, /data-fv-picture="" data-fv-contract-picture="">RE<\/span><span class="fv-name-text">Resting/);
});

test('une section vide affiche « Personne. »', () => {
  const html = renderReport({ available: [], onLeave: [], injured: [] }, 'fr');
  assert.equal((html.match(/Personne\./g) || []).length, 3);
  assert.doesNotMatch(html, /<table/);
});

test('message d\'erreur traduit', () => {
  assert.match(renderReportError('noSave', 'fr'), /Aucune sauvegarde n&#39;est chargée\./);
  assert.match(renderReportError('noSave', 'fr'), /class="noResults fv-error"/);
});

test('la fatigue décimale est arrondie à l\'affichage, la valeur exacte reste dans les attributs', () => {
  const html = renderReport({
    available: [{
      contractId: 7, workerId: 7, name: 'Decimal', fatigue: 14.2, risk: 0.01, level: 'low', daysToRecover: 3,
      traits: {},
    }],
    onLeave: [],
    injured: [],
  }, 'en');
  assert.match(html, /class="fv-bar-value">14</);
  assert.match(html, /data-sort-fatigue="14.2"/);
  assert.match(html, /style="width:14.2%"/);
});

test('chaque ligne de catcheur porte son contrat pour ouvrir sa fiche', () => {
  const html = renderReport(REPORT, 'fr');
  for (const id of [13100, 2, 3, 4, 5]) {
    assert.match(html, new RegExp(`<tr class="fv-row-link" data-fv-worker="${id}"[ >]`), `ligne ${id}`);
  }
  assert.match(html, /data-fv-worker="13100" data-sort-name=/);
});
