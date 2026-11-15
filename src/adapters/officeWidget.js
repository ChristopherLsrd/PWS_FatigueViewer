'use strict';
const { renderWidget } = require('../presentation/widgetHtml');

const CONTAINER_ID = 'fv-office-widget';

// Script exécuté dans la fenêtre du jeu : gère le conteneur du widget dans le Bureau (mainOfficePage).
const WIDGET_SCRIPT = `(function () { try {
  if (window.FatigueViewerWidget) window.FatigueViewerWidget.stop();
  var PLUGIN = 'fatigue-viewer';
  var CONTAINER_ID = '${CONTAINER_ID}';
  var observer = null;
  var observed = null;
  var pending = false;
  var again = false;
  function locale() {
    try { return (typeof I18n !== 'undefined' && I18n && I18n.locale) ? String(I18n.locale) : null; } catch (e) { return null; }
  }
  function page() { return document.getElementById('mainOfficePage'); }
  function target() {
    var office = page();
    if (!office) return null;
    return office.querySelector('.pageContainer') || office;
  }
  function container() {
    var node = document.getElementById(CONTAINER_ID);
    if (node) return node;
    var parent = target();
    if (!parent) return null;
    node = document.createElement('div');
    node.id = CONTAINER_ID;
    node.className = 'fv-office-widget';
    node.setAttribute('data-plugin-id', PLUGIN);
    node.hidden = true;
    parent.appendChild(node);
    return node;
  }
  function settle() {
    pending = false;
    if (again) { again = false; refresh(); }
  }
  function refresh() {
    watch();
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
    Promise.resolve(request).then(function (html) {
      var node = container();
      if (node) {
        if (html) { node.innerHTML = html; node.hidden = false; }
        else { node.innerHTML = ''; node.hidden = true; }
      }
      settle();
    }, function (e) { console.error('[fatigue-viewer] widget', e); settle(); });
  }
  function watch() {
    var current = page();
    if (observer && observed === current) return;
    if (observer) { observer.disconnect(); observer = null; observed = null; }
    if (!current) return;
    observer = new MutationObserver(function () {
      watch();
      if (page() && !document.getElementById(CONTAINER_ID) && !pending) refresh();
    });
    observer.observe(current, { childList: true, subtree: true });
    observed = current;
  }
  window.FatigueViewerWidget = {
    refresh: refresh,
    stop: function () {
      if (observer) { observer.disconnect(); observer = null; observed = null; }
      var node = document.getElementById(CONTAINER_ID);
      if (node) node.remove();
    }
  };
  watch();
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
      try {
        return renderWidget(queries.getWatchlist(), locale);
      } catch (e) {
        logger.error('widget-html', e);
        return '';
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

module.exports = { createOfficeWidget, WIDGET_SCRIPT, REFRESH_SCRIPT, STOP_SCRIPT, CONTAINER_ID };
