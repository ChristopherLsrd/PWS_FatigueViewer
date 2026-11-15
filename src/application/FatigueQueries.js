'use strict';
const { assertPort } = require('./ports');
const { buildReport } = require('../domain/report');
const { buildWatchlist } = require('../domain/watchlist');

/** Lectures pour la page Fatigue Viewer et le widget du Bureau. */
function createFatigueQueries({ roster, gameState, settings, logger } = {}) {
  assertPort('RosterReader', roster);
  assertPort('GameState', gameState);
  assertPort('Settings', settings);
  assertPort('Logger', logger);

  function loadReport() {
    const promotionId = gameState.playerPromotionId();
    const today = gameState.today();
    if (promotionId === null || !today) return { ok: false, reason: 'noSave' };
    return { ok: true, today, report: buildReport(roster.readRoster(promotionId, today), today) };
  }

  function getReport() {
    try {
      return loadReport();
    } catch (e) {
      logger.error('getReport', e);
      return { ok: false, reason: 'readFailed' };
    }
  }

  function getWatchlist() {
    try {
      if (!settings.get('showOfficeWidget')) return { ok: true, enabled: false, items: [], total: 0 };
      const result = loadReport();
      if (!result.ok) return result;
      const { items, total } = buildWatchlist(result.report.available, {
        fatigueThreshold: settings.get('fatigueThreshold'),
        includeHighRisk: settings.get('includeHighRisk'),
        maxItems: settings.get('widgetMaxItems'),
      });
      return { ok: true, enabled: true, items, total };
    } catch (e) {
      logger.error('getWatchlist', e);
      return { ok: false, reason: 'readFailed' };
    }
  }

  return { getReport, getWatchlist };
}

module.exports = { createFatigueQueries };
