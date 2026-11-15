'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSqlLeaveWriter, START_LEAVE_SQL } = require('../../src/adapters/SqlLeaveWriter');

test('écrit les quatre colonnes du congé natif, seulement si le contrat n\'est pas déjà arrêté', () => {
  assert.match(START_LEAVE_SQL, /UPDATE contracts SET onTimeOff = 1, timeOffEndDate = \?, suspended = 1, suspensionEndDate = \?/);
  assert.match(START_LEAVE_SQL, /WHERE contractID = \?/);
  assert.match(START_LEAVE_SQL, /COALESCE\(onTimeOff, 0\) = 0/);
  assert.match(START_LEAVE_SQL, /COALESCE\(suspended, 0\) = 0/);
});

test('startLeave passe la date deux fois puis le contrat, et renvoie true si une ligne change', () => {
  const calls = [];
  const writer = createSqlLeaveWriter((sql, params) => { calls.push([sql, params]); return { changes: 1 }; });
  assert.equal(writer.startLeave(13100, '2026-08-26'), true);
  assert.deepEqual(calls, [[START_LEAVE_SQL, ['2026-08-26', '2026-08-26', 13100]]]);
});

test('startLeave renvoie false si aucune ligne ne change', () => {
  assert.equal(createSqlLeaveWriter(() => ({ changes: 0 })).startLeave(1, '2026-08-26'), false);
  assert.equal(createSqlLeaveWriter(() => undefined).startLeave(1, '2026-08-26'), false);
});

test('startLeave laisse remonter une erreur SQL (gérée par le cas d\'usage)', () => {
  assert.throws(() => createSqlLeaveWriter(() => { throw new Error('SQLITE_BUSY'); }).startLeave(1, '2026-08-26'), /SQLITE_BUSY/);
});
