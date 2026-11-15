'use strict';
const { renderWidget, WIDGET_ID } = require('../presentation/widgetHtml');
const { resolveAvatarsJs } = require('../presentation/avatar');
const { t } = require('../presentation/i18n');

// Script exécuté dans la fenêtre du jeu. Le Bureau est une grille GridStack
// (MainOffice.grid) dont les cartes sont listées dans MainOffice.WIDGETS : la carte
// du plugin y est ajoutée comme les autres, ce qui lui donne le cadre, la poignée
// de déplacement, le menu des widgets et la position sauvegardée par le jeu.
const WIDGET_SCRIPT = `(function () { try {
  if (window.FatigueViewerWidget) window.FatigueViewerWidget.stop();
  var PLUGIN = 'fatigue-viewer';
  var ID = '${WIDGET_ID}';
  var MAX_TRIES = 120;
  var pending = false;
  var again = false;
  var stopped = false;
  var retry = null;
  var tries = 0;
  function locale() {
    try { return (typeof I18n !== 'undefined' && I18n && I18n.locale) ? String(I18n.locale) : null; } catch (e) { return null; }
  }
  function office() {
    return (typeof MainOffice !== 'undefined' && MainOffice && MainOffice.grid) ? MainOffice : null;
  }
  function resolveAvatars(node) { ${resolveAvatarsJs('node')} }
  function card() {
    return document.querySelector('#mainOfficePage .mainOfficeGrid .grid-stack-item[gs-id="' + ID + '"]');
  }
  function register(mo, title) {
    for (var i = 0; i < mo.WIDGETS.length; i++) {
      if (mo.WIDGETS[i].id === ID) { mo.WIDGETS[i].title = title; return; }
    }
    mo.WIDGETS.push({ id: ID, title: title });
  }
  function unregister(mo) {
    for (var i = mo.WIDGETS.length - 1; i >= 0; i--) if (mo.WIDGETS[i].id === ID) mo.WIDGETS.splice(i, 1);
    if (mo._gameVisible) delete mo._gameVisible[ID];
    try { mo.buildWidgetMenu(); } catch (e) {}
  }
  function ensureCard(mo) {
    var el = card();
    if (el) return el;
    var gridEl = document.querySelector('#mainOfficePage .mainOfficeGrid');
    if (!gridEl) return null;
    el = document.createElement('div');
    el.className = 'grid-stack-item';
    el.setAttribute('gs-id', ID);
    el.setAttribute('gs-w', 3);
    el.setAttribute('gs-h', 5);
    el.setAttribute('data-plugin-id', PLUGIN);
    var content = document.createElement('div');
    content.className = 'grid-stack-item-content';
    el.appendChild(content);
    gridEl.appendChild(el);
    mo.grid.makeWidget(el);
    return el;
  }
  function removeCard() {
    var mo = office();
    var el = card();
    if (el) {
      if (mo && el.dataset.removed !== '1') { try { mo.grid.removeWidget(el, true); } catch (e) {} }
      if (el.parentNode) el.remove();
    }
    if (typeof MainOffice !== 'undefined' && MainOffice && MainOffice.WIDGETS) unregister(MainOffice);
  }
  function schedule() {
    if (stopped || retry || tries >= MAX_TRIES) return;
    tries++;
    retry = setTimeout(function () { retry = null; refresh(); }, 1000);
  }
  function show(reply) {
    var mo = office();
    if (!mo) { schedule(); return; }
    if (!reply || !reply.html) { removeCard(); return; }
    var el = ensureCard(mo);
    if (!el) { schedule(); return; }
    el.querySelector('.grid-stack-item-content').innerHTML = reply.html;
    register(mo, reply.title || 'Fatigue Viewer');
    mo.setGameVisible(ID, true);
    try { mo.buildWidgetMenu(); } catch (e) {}
    resolveAvatars(el);
  }
  function settle() {
    pending = false;
    if (again) { again = false; refresh(); }
  }
  function refresh() {
    if (stopped) return;
    if (pending) { again = true; return; }
    pending = true;
    var request;
    try {
      request = plugins.invoke(PLUGIN, 'widget-html', locale());
    } catch (e) {
      console.error('[fatigue-viewer] widget', e);
      settle();
      return;
    }
    Promise.resolve(request).then(function (reply) {
      if (stopped) return;
      try { show(reply); } catch (e) { console.error('[fatigue-viewer] widget', e); }
      settle();
    }, function (e) { console.error('[fatigue-viewer] widget', e); settle(); });
  }
  window.FatigueViewerWidget = {
    refresh: refresh,
    stop: function () {
      stopped = true;
      if (retry) { clearTimeout(retry); retry = null; }
      removeCard();
    }
  };
  refresh();
} catch (e) { console.error('[fatigue-viewer] widget', e); } })();`;

const REFRESH_SCRIPT = '(function () { try { if (window.FatigueViewerWidget) window.FatigueViewerWidget.refresh(); } catch (e) {} })();';

const STOP_SCRIPT = '(function () { try { if (window.FatigueViewerWidget) { window.FatigueViewerWidget.stop(); delete window.FatigueViewerWidget; } } catch (e) {} })();';

function createOfficeWidget({ ui, ipc, queries, logger }) {
  function run(script, label) {
    Promise.resolve(ui.executeJS(script)).catch((e) => logger.error(label, e));
  }

  function start() {
    ipc.handle('widget-html', (event, locale) => {
      const title = t(locale, 'widget.title');
      try {
        return { html: renderWidget(queries.getWatchlist(), locale), title };
      } catch (e) {
        logger.error('widget-html', e);
        return { html: '', title };
      }
    });
    run(WIDGET_SCRIPT, 'officeWidget.start');
  }

  return {
    start,
    refresh() { run(REFRESH_SCRIPT, 'officeWidget.refresh'); },
    reinject() { run(WIDGET_SCRIPT, 'officeWidget.reinject'); },
    stop() { run(STOP_SCRIPT, 'officeWidget.stop'); },
  };
}

module.exports = { createOfficeWidget, WIDGET_SCRIPT, REFRESH_SCRIPT, STOP_SCRIPT };
