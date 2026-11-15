'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFatiguePage, PAGE_ID, PAGE_SCRIPT, STOP_SCRIPT } = require('../../src/adapters/fatiguePage');
const { createFakeLogger } = require('../fakes');

function fakeUi() {
  return {
    pages: [], menu: [], scripts: [],
    addPage(config) { this.pages.push(config); },
    addSideMenuItem(config) { this.menu.push(config); },
    executeJS(js) { this.scripts.push(js); return Promise.resolve(); },
  };
}

function fakeIpc() {
  return {
    handlers: {},
    handle(channel, fn) { this.handlers[channel] = fn; },
    call(channel, ...args) { return this.handlers[channel]({}, ...args); },
  };
}

const REPORT = {
  available: [{ contractId: 7, workerId: 1, name: 'Tired', fatigue: 70, risk: 0.0185, level: 'high', daysToRecover: 24, traits: {} }],
  onLeave: [],
  injured: [],
};

function setup(overrides = {}) {
  const ui = fakeUi();
  const ipc = fakeIpc();
  const logger = createFakeLogger();
  const changes = [];
  const deps = {
    ui, ipc, logger,
    queries: { getReport: () => ({ ok: true, today: '2026-08-19', report: REPORT }) },
    leave: {
      prepare: (id) => ({ ok: true, contractId: id, name: 'Tired', fatigue: 70, suggestedDays: 24, endDate: '2026-09-12' }),
      preview: (days) => (days === 7 ? { ok: true, days, endDate: '2026-08-26' } : { ok: false, reason: 'invalidDays' }),
      send: (id, days) => ({ ok: true, endDate: '2026-08-26', id, days }),
    },
    settingsEditor: {
      getAll: () => ({ showOfficeWidget: true, fatigueThreshold: 50, includeHighRisk: true, widgetMaxItems: 8 }),
      set: (key, value) => ({ ok: true, value }),
    },
    onChange: () => changes.push('change'),
    ...overrides,
  };
  const page = createFatiguePage(deps);
  page.start();
  return { page, ui, ipc, logger, changes };
}

test('start ajoute la page, l\'entrée de menu et le script du renderer', () => {
  const { ui } = setup();
  assert.equal(PAGE_ID, 'fatigueViewerPage');
  assert.equal(ui.pages.length, 1);
  assert.equal(ui.pages[0].id, PAGE_ID);
  assert.equal(ui.pages[0].title, 'Fatigue Viewer');
  assert.equal(ui.pages[0].initFunction, 'FatigueViewerPage');
  assert.equal(ui.pages[0].backButton, 'mainOfficePage');
  assert.match(ui.pages[0].html, /id="fv-content"/);
  assert.deepEqual(ui.menu.map((m) => [m.pageId, m.label, m.section]), [[PAGE_ID, 'Fatigue Viewer', 'bottom']]);
  assert.match(ui.menu[0].svgIcon, /^<svg/);
  assert.deepEqual(ui.scripts, [PAGE_SCRIPT]);
});

test('les scripts du renderer sont du JavaScript valide', () => {
  assert.doesNotThrow(() => new Function(PAGE_SCRIPT));
  assert.doesNotThrow(() => new Function(STOP_SCRIPT));
  assert.match(PAGE_SCRIPT, /window\.FatigueViewerPage/);
  assert.match(PAGE_SCRIPT, /'fatigue-viewer'/);
  assert.match(PAGE_SCRIPT, /function resolveAvatars\(node\)/);
  assert.match(PAGE_SCRIPT, /Game\.getContractImage/);
  assert.match(PAGE_SCRIPT, /content\.innerHTML = html; resolveAvatars\(content\);/);
});

test('PAGE_SCRIPT ignore les réponses périmées et construit le chargement via le DOM', () => {
  assert.match(PAGE_SCRIPT, /var seq = 0;/);
  assert.match(PAGE_SCRIPT, /var my = \+\+seq;/);
  assert.match(PAGE_SCRIPT, /my !== seq/);
  assert.match(PAGE_SCRIPT, /var previewSeq = 0;/);
  assert.match(PAGE_SCRIPT, /\+\+previewSeq/);
  assert.match(PAGE_SCRIPT, /textContent = texts\.loading/);
  assert.doesNotMatch(PAGE_SCRIPT, /'<div class="loading">'/);
});

test('page-texts traduit les libellés', () => {
  assert.deepEqual(setup().ipc.call('page-texts', 'fr'), { settings: 'Réglages', back: 'Retour à la liste', loading: 'Chargement…' });
});

test('report-html rend le rapport ou l\'erreur', () => {
  assert.match(setup().ipc.call('report-html', 'fr'), /data-fv-leave="7"/);
  const failing = setup({ queries: { getReport: () => ({ ok: false, reason: 'noSave' }) } });
  assert.match(failing.ipc.call('report-html', 'fr'), /Aucune sauvegarde/);
});

test('report-html attrape une exception', () => {
  const { ipc, logger } = setup({ queries: { getReport: () => { throw new Error('boom'); } } });
  assert.match(ipc.call('report-html', 'fr'), /Le roster n&#39;a pas pu être lu/);
  assert.equal(logger.errors.length, 1);
});

test('leave-dialog-html convertit l\'id et rend la fenêtre', () => {
  const result = setup().ipc.call('leave-dialog-html', '7', 'fr');
  assert.equal(result.ok, true);
  assert.match(result.html, /data-fv-contract="7"/);
  assert.match(result.html, /value="24"/);
  const refused = setup({ leave: { prepare: () => ({ ok: false, reason: 'alreadyOff' }), preview() {}, send() {} } });
  assert.deepEqual(refused.ipc.call('leave-dialog-html', 7, 'fr'), { ok: false, message: 'Ce catcheur est déjà en congé ou suspendu.' });
});

test('leave-preview renvoie la date de retour formatée ou le message d\'erreur', () => {
  const { ipc } = setup();
  assert.deepEqual(ipc.call('leave-preview', '7', 'fr'), { ok: true, returnLabel: '26 août 2026' });
  assert.deepEqual(ipc.call('leave-preview', 0, 'fr'), { ok: false, message: 'Choisis une durée entre 1 et 90 jours.' });
});

test('send-on-leave écrit, prévient le widget et confirme', () => {
  const calls = [];
  const { ipc, changes } = setup({
    leave: { prepare() {}, preview() {}, send: (id, days) => { calls.push([id, days]); return { ok: true, endDate: '2026-08-26' }; } },
  });
  assert.deepEqual(ipc.call('send-on-leave', '7', '7', 'fr'), { ok: true, message: 'Congé enregistré jusqu\'au 26 août 2026.' });
  assert.deepEqual(calls, [[7, 7]]);
  assert.deepEqual(changes, ['change']);
});

test('send-on-leave refusé ne prévient pas le widget', () => {
  const { ipc, changes } = setup({ leave: { prepare() {}, preview() {}, send: () => ({ ok: false, reason: 'writeFailed' }) } });
  assert.deepEqual(ipc.call('send-on-leave', 7, 7, 'fr'), { ok: false, message: 'Le congé n\'a pas pu être enregistré.' });
  assert.deepEqual(changes, []);
});

test('réglages : formulaire et enregistrement qui prévient le widget', () => {
  const { ipc, changes } = setup();
  assert.match(ipc.call('settings-form-html', 'fr'), /data-fv-setting="fatigueThreshold"/);
  assert.deepEqual(ipc.call('settings-set', 'fatigueThreshold', 60), { ok: true, value: 60 });
  assert.deepEqual(changes, ['change']);
});

test('réglage refusé ne prévient pas le widget', () => {
  const { ipc, changes } = setup({ settingsEditor: { getAll: () => ({}), set: () => ({ ok: false }) } });
  assert.deepEqual(ipc.call('settings-set', 'nope', 1), { ok: false });
  assert.deepEqual(changes, []);
});

test('stop et reinject exécutent leurs scripts', () => {
  const { page, ui } = setup();
  page.stop();
  page.reinject();
  assert.deepEqual(ui.scripts, [PAGE_SCRIPT, STOP_SCRIPT, PAGE_SCRIPT]);
});
