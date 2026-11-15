'use strict';
const { renderWidget } = require('../presentation/widgetHtml');

const CONTAINER_ID = 'fv-office-widget';

// Script exécuté dans la fenêtre du jeu : gère le conteneur du widget dans le Bureau (mainOfficePage).
const WIDGET_SCRIPT = `(function () { try {
  if (window.FatigueViewerWidget) window.FatigueViewerWidget.stop();
  var PLUGIN = 'fatigue-viewer';
  var CONTAINER_ID = '${CONTAINER_ID}';
  var observer = null;
  var pending = false;
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
    parent.appendChild(node);
    return node;
  }
  function refresh() {
    if (pending) return;
    pending = true;
    plugins.invoke(PLUGIN, 'widget-html', locale()).then(function (html) {
      pending = false;
      if (!html) { var old = document.getElementById(CONTAINER_ID); if (old) old.remove(); return; }
      var node = container();
      if (node) node.innerHTML = html;
    }).catch(function (e) { pending = false; console.error('[fatigue-viewer] widget', e); });
  }
  function watch() {
    var office = page();
    if (!office || observer) return;
    observer = new MutationObserver(function () {
      if (!document.getElementById(CONTAINER_ID) && !pending) refresh();
    });
    observer.observe(office, { childList: true, subtree: true });
  }
  window.FatigueViewerWidget = {
    refresh: refresh,
    stop: function () {
      if (observer) { observer.disconnect(); observer = null; }
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
