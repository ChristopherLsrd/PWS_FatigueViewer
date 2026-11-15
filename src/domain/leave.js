'use strict';
const { daysToRecover } = require('./fatigue');

const LEAVE_MIN_DAYS = 1;
const LEAVE_MAX_DAYS = 90;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function validateLeaveDays(n) {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < LEAVE_MIN_DAYS || n > LEAVE_MAX_DAYS) {
    return { ok: false, reason: 'invalidDays' };
  }
  return { ok: true, days: n };
}

function parts(s) {
  const match = typeof s === 'string' ? ISO_DATE.exec(s) : null;
  return match ? match.slice(1).map(Number) : null;
}

function isIsoDate(s) {
  const p = parts(s);
  if (!p) return false;
  const [y, m, d] = p;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Date de retour, comme le jeu : date du jeu + durée. Calcul en UTC pour éviter les décalages de fuseau. */
function leaveEndDate(today, days) {
  if (!isIsoDate(today)) throw new TypeError('Date AAAA-MM-JJ attendue');
  const [y, m, d] = parts(today);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function suggestedLeaveDays(fatigue) {
  return Math.max(LEAVE_MIN_DAYS, Math.min(LEAVE_MAX_DAYS, daysToRecover(fatigue)));
}

module.exports = {
  LEAVE_MIN_DAYS, LEAVE_MAX_DAYS, validateLeaveDays, isIsoDate, leaveEndDate, suggestedLeaveDays,
};
