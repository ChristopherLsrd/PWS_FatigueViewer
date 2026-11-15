'use strict';
const path = require('path');

const PLUGIN_DIR = __dirname + path.sep;
const PLUGIN_ID = 'fatigue-viewer';

// Le jeu vide le cache du module principal au rechargement à chaud ; on vide aussi celui de src/.
function purgeModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(PLUGIN_DIR) && key !== __filename) delete require.cache[key];
  }
}

let teardown = null;
let reinject = null;

module.exports = {
  activate(api) {
    purgeModuleCache();
    const { createFatigueQueries } = require('./src/application/FatigueQueries');
    const { createLeaveService } = require('./src/application/LeaveService');
    const { createSettingsEditor } = require('./src/application/SettingsEditor');
    const { createSqlRosterReader } = require('./src/adapters/SqlRosterReader');
    const { createSqlLeaveWriter } = require('./src/adapters/SqlLeaveWriter');
    const { createGameState } = require('./src/adapters/GameState');
    const { createGameSettings } = require('./src/adapters/GameSettings');
    const { createFatiguePage } = require('./src/adapters/fatiguePage');
    const { createOfficeWidget } = require('./src/adapters/officeWidget');
    const { FATIGUE_VIEWER_CSS } = require('./src/presentation/styles');

    const logger = {
      log: (...args) => api.console.log(...args),
      error: (...args) => api.console.error(...args),
    };
    const query = (sql, params) => api.database.query(sql, params);
    const settings = createGameSettings(api.settings);
    const roster = createSqlRosterReader(query);
    const writer = createSqlLeaveWriter((sql, params) => api.database.execute(sql, params));
    const gameState = createGameState(api.game, query);

    const queries = createFatigueQueries({ roster, gameState, settings, logger });
    const leave = createLeaveService({ roster, writer, gameState, logger });
    const settingsEditor = createSettingsEditor({ settings, logger });

    const widget = createOfficeWidget({ ui: api.ui, ipc: api.ipc, queries, logger });
    const page = createFatiguePage({
      ui: api.ui, ipc: api.ipc, queries, leave, settingsEditor, onChange: () => widget.refresh(), logger,
    });

    api.ui.injectCSS(FATIGUE_VIEWER_CSS);
    page.start();
    widget.start();
    for (const name of ['day:advanced', 'show:ended', 'database:opened']) {
      api.events.on(name, () => widget.refresh());
    }

    reinject = () => {
      api.ui.injectCSS(FATIGUE_VIEWER_CSS);
      page.reinject();
      widget.reinject();
    };

    teardown = () => {
      page.stop();
      widget.stop();
      try { api.ui.widgets.removeAll(); } catch (e) { logger.error('widgets.removeAll', e); }
      Promise.resolve(api.ui.executeJS(
        `(function () { try { document.querySelectorAll('[data-plugin-id="${PLUGIN_ID}"]')`
        + '.forEach(function (el) { el.remove(); }); } catch (e) {} })();',
      )).catch((e) => logger.error('nettoyage', e));
    };

    logger.log('Fatigue Viewer activé.');
  },

  onRendererLoad() {
    if (reinject) reinject();
  },

  deactivate() {
    if (!teardown) return;
    try { teardown(); } catch (e) { /* le jeu nettoie le reste */ }
    teardown = null;
    reinject = null;
  },
};
