'use strict';

// Formule du jeu : (2 + fatigue / 2) chances sur 2000, par catcheur et par match.
const BASE_CHANCE = 2;
const PER_FATIGUE_POINT = 0.5;
const DIVISOR = 2000;

const RISK_THRESHOLDS = Object.freeze({ medium: 0.0075, high: 0.015 });

function clampFatigue(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Risque intrinsèque par match ; ignore les facteurs liés au show (promotion, gimmick, spots). */
function injuryRiskPerMatch({ fatigue, injuryProne = false, cursed = false, robust = false } = {}) {
  let p = (BASE_CHANCE + clampFatigue(fatigue) * PER_FATIGUE_POINT) / DIVISOR;
  if (injuryProne) p *= 2;
  if (cursed) p *= 2;
  if (robust) p /= 4;
  return p;
}

function riskLevel(p) {
  if (p >= RISK_THRESHOLDS.high) return 'high';
  if (p >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

module.exports = { RISK_THRESHOLDS, clampFatigue, injuryRiskPerMatch, riskLevel };
