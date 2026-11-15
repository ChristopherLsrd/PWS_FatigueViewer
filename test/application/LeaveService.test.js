'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLeaveService } = require('../../src/application/LeaveService');
const {
  contractRow, createFakeRoster, createFakeLeaveWriter, createFakeGameState, createFakeLogger,
} = require('../fakes');

function setup({ contracts = { 13100: contractRow({ contractId: 13100, name: 'Celine Faery', fatigue: 50, promotionId: 239 }) },
  gameState = { promotionId: 239, today: '2026-08-19' }, writer = {}, throws = null } = {}) {
  const roster = createFakeRoster({ contracts, throws });
  const leaveWriter = createFakeLeaveWriter(writer);
  const logger = createFakeLogger();
  const service = createLeaveService({ roster, writer: leaveWriter, gameState: createFakeGameState(gameState), logger });
  return { service, roster, leaveWriter, logger };
}

test('refuse des ports incomplets', () => {
  assert.throws(() => createLeaveService({}), TypeError);
});

test('prepare propose la durée de récupération et la date de retour', () => {
  assert.deepEqual(setup().service.prepare(13100), {
    ok: true, contractId: 13100, name: 'Celine Faery', fatigue: 50, suggestedDays: 17, endDate: '2026-09-05',
  });
});

test('prepare refuse un contrat inéligible', () => {
  const cases = [
    [{}, 'notFound'],
    [{ 13100: contractRow({ contractId: 13100, promotionId: 1 }) }, 'notYourWorker'],
    [{ 13100: contractRow({ contractId: 13100, promotionId: 239, finalised: false }) }, 'inactiveContract'],
    [{ 13100: contractRow({ contractId: 13100, promotionId: 239, expired: true }) }, 'inactiveContract'],
    [{ 13100: contractRow({ contractId: 13100, promotionId: 239, onTimeOff: true }) }, 'alreadyOff'],
    [{ 13100: contractRow({ contractId: 13100, promotionId: 239, suspended: true }) }, 'alreadyOff'],
  ];
  for (const [contracts, reason] of cases) {
    assert.deepEqual(setup({ contracts }).service.prepare(13100), { ok: false, reason }, reason);
  }
});

test('prepare sans sauvegarde ou en erreur de lecture', () => {
  assert.deepEqual(setup({ gameState: { promotionId: null } }).service.prepare(13100), { ok: false, reason: 'noSave' });
  const { service, logger } = setup({ throws: new Error('SQL') });
  assert.deepEqual(service.prepare(13100), { ok: false, reason: 'readFailed' });
  assert.equal(logger.errors.length, 1);
});

test('preview calcule la date de retour', () => {
  assert.deepEqual(setup().service.preview(7), { ok: true, days: 7, endDate: '2026-08-26' });
  assert.deepEqual(setup().service.preview(0), { ok: false, reason: 'invalidDays' });
  assert.deepEqual(setup({ gameState: { today: null } }).service.preview(7), { ok: false, reason: 'noSave' });
});

test('send écrit le congé avec date du jeu + durée', () => {
  const { service, leaveWriter, logger } = setup();
  assert.deepEqual(service.send(13100, 7), { ok: true, endDate: '2026-08-26' });
  assert.deepEqual(leaveWriter.calls, [[13100, '2026-08-26']]);
  assert.equal(logger.logs.length, 1);
});

test('send valide la durée avant toute lecture', () => {
  const { service, roster, leaveWriter } = setup();
  assert.deepEqual(service.send(13100, 91), { ok: false, reason: 'invalidDays' });
  assert.equal(roster.calls.length, 0);
  assert.equal(leaveWriter.calls.length, 0);
});

test('send n\'écrit pas pour un contrat inéligible', () => {
  const { service, leaveWriter } = setup({ contracts: { 13100: contractRow({ contractId: 13100, promotionId: 239, onTimeOff: true }) } });
  assert.deepEqual(service.send(13100, 7), { ok: false, reason: 'alreadyOff' });
  assert.equal(leaveWriter.calls.length, 0);
});

test('send signale une écriture sans effet ou en erreur', () => {
  assert.deepEqual(setup({ writer: { result: false } }).service.send(13100, 7), { ok: false, reason: 'writeFailed' });
  const { service, logger } = setup({ writer: { throws: new Error('SQLITE_BUSY') } });
  assert.deepEqual(service.send(13100, 7), { ok: false, reason: 'writeFailed' });
  assert.equal(logger.errors.length, 1);
});
