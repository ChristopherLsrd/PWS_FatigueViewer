'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createOfficeWidget, WIDGET_SCRIPT, REFRESH_SCRIPT, STOP_SCRIPT, CONTAINER_ID,
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

test('les scripts du renderer sont du JavaScript valide et ciblent le Bureau', () => {
  for (const script of [WIDGET_SCRIPT, REFRESH_SCRIPT, STOP_SCRIPT]) assert.doesNotThrow(() => new Function(script));
  assert.equal(CONTAINER_ID, 'fv-office-widget');
  assert.match(WIDGET_SCRIPT, /mainOfficePage/);
  assert.match(WIDGET_SCRIPT, /data-plugin-id/);
  assert.match(WIDGET_SCRIPT, /MutationObserver/);
  assert.match(WIDGET_SCRIPT, /window\.FatigueViewerWidget/);
});

test('WIDGET_SCRIPT : conteneur masqué, observer réattaché, file de rafraîchissement', () => {
  assert.match(WIDGET_SCRIPT, /node\.hidden = true/);
  assert.match(WIDGET_SCRIPT, /node\.hidden = false/);
  assert.match(WIDGET_SCRIPT, /again/);
  assert.match(WIDGET_SCRIPT, /observed/);
  assert.match(WIDGET_SCRIPT, /try \{\s*request = plugins\.invoke/);
  assert.match(WIDGET_SCRIPT, /pending = false;\s*if \(again\)/);
  const removes = WIDGET_SCRIPT.match(/\.remove\(\)/g) || [];
  assert.equal(removes.length, 1, 'seul stop retire le conteneur');
  assert.doesNotMatch(WIDGET_SCRIPT, /if \(old\) old\.remove/);
});

test('start enregistre le canal et injecte le script', () => {
  const { ui, ipc } = setup(() => ({ ok: true, enabled: true, items: ITEMS, total: 1 }));
  assert.equal(typeof ipc.handlers['widget-html'], 'function');
  assert.deepEqual(ui.scripts, [WIDGET_SCRIPT]);
});

test('widget-html rend la liste dans la langue demandée', () => {
  const { ipc } = setup(() => ({ ok: true, enabled: true, items: ITEMS, total: 1 }));
  const html = ipc.handlers['widget-html']({}, 'fr');
  assert.match(html, /Fatigue et risque de blessure/);
  assert.match(html, /Tired/);
});

test('widget-html vide si désactivé ou en erreur', () => {
  assert.equal(setup(() => ({ ok: true, enabled: false, items: [], total: 0 })).ipc.handlers['widget-html']({}, 'fr'), '');
  const { ipc, logger } = setup(() => { throw new Error('boom'); });
  assert.equal(ipc.handlers['widget-html']({}, 'fr'), '');
  assert.equal(logger.errors.length, 1);
});

test('refresh, reinject et stop exécutent leurs scripts', () => {
  const { widget, ui } = setup(() => ({ ok: true, enabled: true, items: [], total: 0 }));
  widget.refresh();
  widget.reinject();
  widget.stop();
  assert.deepEqual(ui.scripts, [WIDGET_SCRIPT, REFRESH_SCRIPT, WIDGET_SCRIPT, STOP_SCRIPT]);
});
