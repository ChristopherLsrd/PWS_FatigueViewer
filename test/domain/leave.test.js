'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LEAVE_MIN_DAYS, LEAVE_MAX_DAYS, validateLeaveDays, isIsoDate, leaveEndDate, suggestedLeaveDays,
} = require('../../src/domain/leave');

test('bornes de durée', () => {
  assert.equal(LEAVE_MIN_DAYS, 1);
  assert.equal(LEAVE_MAX_DAYS, 90);
});

test('validateLeaveDays accepte les entiers de 1 à 90', () => {
  assert.deepEqual(validateLeaveDays(1), { ok: true, days: 1 });
  assert.deepEqual(validateLeaveDays(7), { ok: true, days: 7 });
  assert.deepEqual(validateLeaveDays(90), { ok: true, days: 90 });
});

test('validateLeaveDays refuse le reste', () => {
  for (const value of [0, 91, -1, 1.5, NaN, Infinity, '7', null, undefined]) {
    assert.deepEqual(validateLeaveDays(value), { ok: false, reason: 'invalidDays' }, String(value));
  }
});

test('isIsoDate', () => {
  assert.equal(isIsoDate('2026-08-19'), true);
  assert.equal(isIsoDate('2028-02-29'), true);
  assert.equal(isIsoDate('2027-02-29'), false);
  assert.equal(isIsoDate('2026-13-01'), false);
  assert.equal(isIsoDate('2026-8-19'), false);
  assert.equal(isIsoDate(''), false);
  assert.equal(isIsoDate(null), false);
});

test('fin de congé = date du jeu + durée (cas observé dans le jeu)', () => {
  assert.equal(leaveEndDate('2026-08-19', 7), '2026-08-26');
});

test('fin de congé à travers les mois, années et années bissextiles', () => {
  assert.equal(leaveEndDate('2026-08-30', 3), '2026-09-02');
  assert.equal(leaveEndDate('2026-12-28', 7), '2027-01-04');
  assert.equal(leaveEndDate('2028-02-27', 2), '2028-02-29');
  assert.equal(leaveEndDate('2027-02-27', 2), '2027-03-01');
  assert.equal(leaveEndDate('2026-01-01', 90), '2026-04-01');
});

test('leaveEndDate refuse une date invalide', () => {
  assert.throws(() => leaveEndDate('19/08/2026', 7), TypeError);
  assert.throws(() => leaveEndDate(null, 7), TypeError);
});

test('durée suggérée = jours de récupération, au moins 1', () => {
  assert.equal(suggestedLeaveDays(0), 1);
  assert.equal(suggestedLeaveDays(2), 1);
  assert.equal(suggestedLeaveDays(50), 17);
  assert.equal(suggestedLeaveDays(100), 34);
  assert.equal(suggestedLeaveDays(null), 1);
});
