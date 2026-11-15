'use strict';
const { compareByRisk } = require('./report');

/** Catcheurs à afficher dans le widget : fatigués ou à risque élevé, du plus grave au moins grave. */
function buildWatchlist(available, { fatigueThreshold, includeHighRisk, maxItems }) {
  const matches = available
    .filter((w) => w.fatigue >= fatigueThreshold || (includeHighRisk && w.level === 'high'))
    .sort(compareByRisk);
  return { items: matches.slice(0, maxItems), total: matches.length };
}

module.exports = { buildWatchlist };
