'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createOfficeWidget, WIDGET_SCRIPT, REFRESH_SCRIPT, STOP_SCRIPT,
} = require('../../src/adapters/officeWidget');
const { createFakeLogger } = require('../fakes');

function setup(getWatchlist) {
  const ui = { scripts: [], executeJS(js) { this.scripts.push(js); return Promise.resolve(); } };
  const ipc = { handlers: {}, handle(channel, fn) { this.handlers[channel] = fn; } };
  const logger = createFakeLogger();
  const widget = createOfficeWidget({ ui, ipc, queries: { getWatchlist }, logger });
  widget.start();
  return { widget, ui, ipc, logger };
}

const ITEMS = [{ contractId: 1, name: 'Tired', fatigue: 70, risk: 0.0185, level: 'high', daysToRecover: 24, traits: {} }];

// --- Faux Bureau : juste ce que le script touche (grille GridStack du jeu et MainOffice). ---
function fakeElement(tag) {
  const el = {
    tagName: tag, attrs: {}, dataset: {}, children: [], parentNode: null, innerHTML: '', className: '',
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    remove() { if (this.parentNode) { const p = this.parentNode; p.children = p.children.filter((c) => c !== this); this.parentNode = null; } },
    querySelector(sel) { return sel === '.grid-stack-item-content' ? this.children[0] || null : null; },
    querySelectorAll() { return []; },
  };
  return el;
}

function fakeOffice({ ready = true } = {}) {
  const gridEl = fakeElement('div');
  const calls = [];
  const office = {
    grid: ready ? {
      makeWidget(el) { el.gridstackNode = { id: el.getAttribute('gs-id') }; calls.push(['makeWidget', el.getAttribute('gs-id')]); },
      removeWidget(el, removeDom) { calls.push(['removeWidget']); if (removeDom) el.remove(); },
    } : null,
    WIDGETS: [{ id: 'shows', title: 'Recent Shows' }],
    _gameVisible: {},
    setGameVisible(id, v) { this._gameVisible[id] = v; calls.push(['setGameVisible', id, v]); },
    buildWidgetMenu() { calls.push(['buildWidgetMenu']); },
  };
  const document = {
    createElement: fakeElement,
    querySelector(sel) {
      if (sel === '#mainOfficePage .mainOfficeGrid') return gridEl;
      const m = /gs-id="([^"]+)"/.exec(sel);
      return m ? gridEl.children.find((c) => c.getAttribute('gs-id') === m[1]) || null : null;
    },
  };
  return { office, document, gridEl, calls };
}

function run(script, env, reply) {
  const window = env.window || {};
  const plugins = { invoke: () => Promise.resolve(reply()) };
  const timers = [];
  const fn = new Function('window', 'document', 'MainOffice', 'plugins', 'setTimeout', 'clearTimeout', 'console', script);
  fn(window, env.document, env.office, plugins, (f) => { timers.push(f); return timers.length; }, () => {}, { error() {} });
  return { window, timers };
}

const tick = () => new Promise((r) => setImmediate(r));

test('les scripts du renderer sont du JavaScript valide et passent par la grille du Bureau', () => {
  for (const script of [WIDGET_SCRIPT, REFRESH_SCRIPT, STOP_SCRIPT]) assert.doesNotThrow(() => new Function(script));
  assert.match(WIDGET_SCRIPT, /MainOffice\.grid/);
  assert.match(WIDGET_SCRIPT, /makeWidget/);
  assert.match(WIDGET_SCRIPT, /data-plugin-id/);
  assert.match(WIDGET_SCRIPT, /try \{\s*request = plugins\.invoke/);
  assert.doesNotMatch(WIDGET_SCRIPT, /MutationObserver/);
});

test('ajoute une carte GridStack enregistrée dans les widgets du Bureau', async () => {
  const env = fakeOffice();
  run(WIDGET_SCRIPT, env, () => ({ html: '<div class="panel">x</div>', title: 'Fatigue et risque' }));
  await tick();
  const card = env.gridEl.children[0];
  assert.ok(card, 'carte ajoutée à la grille');
  assert.equal(card.className, 'grid-stack-item');
  assert.equal(card.getAttribute('gs-id'), 'fatigueViewer');
  assert.equal(card.getAttribute('gs-w'), '3');
  assert.equal(card.getAttribute('gs-h'), '5');
  assert.equal(card.getAttribute('data-plugin-id'), 'fatigue-viewer');
  assert.equal(card.children[0].className, 'grid-stack-item-content');
  assert.equal(card.children[0].innerHTML, '<div class="panel">x</div>');
  assert.deepEqual(env.office.WIDGETS.at(-1), { id: 'fatigueViewer', title: 'Fatigue et risque' });
  assert.deepEqual(env.calls.slice(0, 2), [['makeWidget', 'fatigueViewer'], ['setGameVisible', 'fatigueViewer', true]]);
});

test('un rafraîchissement réutilise la carte existante', async () => {
  const env = fakeOffice();
  let n = 0;
  const { window } = run(WIDGET_SCRIPT, env, () => ({ html: `<p>${++n}</p>`, title: 'T' }));
  await tick();
  window.FatigueViewerWidget.refresh();
  await tick();
  assert.equal(env.gridEl.children.length, 1);
  assert.equal(env.gridEl.children[0].children[0].innerHTML, '<p>2</p>');
  assert.equal(env.office.WIDGETS.filter((w) => w.id === 'fatigueViewer').length, 1);
  assert.equal(env.calls.filter((c) => c[0] === 'makeWidget').length, 1);
});

test('widget désactivé : la carte est retirée de la grille et du menu', async () => {
  const env = fakeOffice();
  let html = '<p>x</p>';
  const { window } = run(WIDGET_SCRIPT, env, () => ({ html, title: 'T' }));
  await tick();
  html = '';
  window.FatigueViewerWidget.refresh();
  await tick();
  assert.equal(env.gridEl.children.length, 0);
  assert.equal(env.office.WIDGETS.some((w) => w.id === 'fatigueViewer'), false);
});

test('attend que la grille du Bureau soit prête', async () => {
  const env = fakeOffice({ ready: false });
  const { timers } = run(WIDGET_SCRIPT, env, () => ({ html: '<p>x</p>', title: 'T' }));
  await tick();
  assert.equal(env.gridEl.children.length, 0);
  assert.equal(timers.length, 1, 'nouvel essai programmé');
  env.office.grid = { makeWidget(el) { el.gridstackNode = {}; }, removeWidget() {} };
  timers[0]();
  await tick();
  assert.equal(env.gridEl.children.length, 1);
});

test('stop retire la carte et ignore une réponse arrivée après', async () => {
  const env = fakeOffice();
  let resolve;
  const window = {};
  const plugins = { invoke: () => new Promise((r) => { resolve = r; }) };
  const fn = new Function('window', 'document', 'MainOffice', 'plugins', 'setTimeout', 'clearTimeout', 'console', WIDGET_SCRIPT);
  fn(window, env.document, env.office, plugins, () => 0, () => {}, { error() {} });
  window.FatigueViewerWidget.stop();
  resolve({ html: '<p>late</p>', title: 'T' });
  await tick();
  assert.equal(env.gridEl.children.length, 0);
  assert.equal(env.office.WIDGETS.some((w) => w.id === 'fatigueViewer'), false);
});

test('start enregistre le canal et injecte le script', () => {
  const { ui, ipc } = setup(() => ({ ok: true, enabled: true, items: ITEMS, total: 1 }));
  assert.equal(typeof ipc.handlers['widget-html'], 'function');
  assert.deepEqual(ui.scripts, [WIDGET_SCRIPT]);
});

test('widget-html rend la carte et son titre dans la langue demandée', () => {
  const { ipc } = setup(() => ({ ok: true, enabled: true, items: ITEMS, total: 1 }));
  const reply = ipc.handlers['widget-html']({}, 'fr');
  assert.equal(reply.title, 'Fatigue et risque de blessure');
  assert.match(reply.html, /data-widget="fatigueViewer"/);
  assert.match(reply.html, /Tired/);
});

test('widget-html sans contenu si désactivé ou en erreur', () => {
  const off = setup(() => ({ ok: true, enabled: false, items: [], total: 0 })).ipc.handlers['widget-html']({}, 'fr');
  assert.equal(off.html, '');
  const { ipc, logger } = setup(() => { throw new Error('boom'); });
  assert.equal(ipc.handlers['widget-html']({}, 'fr').html, '');
  assert.equal(logger.errors.length, 1);
});

test('refresh, reinject et stop exécutent leurs scripts', () => {
  const { widget, ui } = setup(() => ({ ok: true, enabled: true, items: [], total: 0 }));
  widget.refresh();
  widget.reinject();
  widget.stop();
  assert.deepEqual(ui.scripts, [WIDGET_SCRIPT, REFRESH_SCRIPT, WIDGET_SCRIPT, STOP_SCRIPT]);
});
