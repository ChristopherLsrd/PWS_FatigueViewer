'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

function fakeApi() {
  const api = {
    handlers: {}, events: {}, pages: [], menu: [], scripts: [], css: [], logs: [], errors: [],
    console: { log: (...a) => api.logs.push(a), error: (...a) => api.errors.push(a) },
    database: {
      query: (sql) => (/FROM saveInfo/.test(sql) ? [{ saveUserPromotion: 239, saveCurrentDate: '2026-08-20' }] : []),
      execute: () => ({ changes: 1 }),
    },
    settings: { store: {}, register() {}, get(k) { return this.store[k]; }, set(k, v) { this.store[k] = v; } },
    game: { getState: () => ({}) },
    ui: {
      addPage: (c) => api.pages.push(c),
      addSideMenuItem: (c) => api.menu.push(c),
      executeJS: (js) => { api.scripts.push(js); return Promise.resolve(); },
      injectCSS: (css) => api.css.push(css),
      widgets: { removeAll() {} },
    },
    ipc: { handle: (channel, fn) => { api.handlers[channel] = fn; } },
  };
  api.events.on = (name, fn) => { (api.events[name] = api.events[name] || []).push(fn); };
  return api;
}

test('activate branche la page, le widget, les styles et les événements', () => {
  const plugin = require('../index');
  const api = fakeApi();
  plugin.activate(api);
  assert.deepEqual(api.pages.map((p) => p.id), ['fatigueViewerPage']);
  assert.equal(api.menu.length, 1);
  assert.equal(api.css.length, 1);
  for (const channel of ['page-texts', 'report-html', 'leave-dialog-html', 'leave-preview', 'send-on-leave',
    'settings-form-html', 'settings-set', 'widget-html']) {
    assert.equal(typeof api.handlers[channel], 'function', channel);
  }
  for (const name of ['day:advanced', 'show:ended', 'database:opened']) {
    assert.equal(api.events[name].length, 1, name);
  }
  assert.match(api.handlers['report-html']({}, 'fr'), /Catcheurs disponibles/);
  const before = api.scripts.length;
  api.events['day:advanced'][0]();
  assert.equal(api.scripts.length, before + 1);
  plugin.onRendererLoad();
  plugin.deactivate();
  assert.doesNotThrow(() => plugin.deactivate());
});
