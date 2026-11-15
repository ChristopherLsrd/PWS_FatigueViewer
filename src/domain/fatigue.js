'use strict';
const { clampFatigue } = require('./injuryRisk');

// Le jeu retire 3 points de fatigue par jour.
const RECOVERY_PER_DAY = 3;

function daysToRecover(fatigue) {
  return Math.ceil(clampFatigue(fatigue) / RECOVERY_PER_DAY);
}

module.exports = { RECOVERY_PER_DAY, daysToRecover };
