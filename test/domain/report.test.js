'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReport, compareByRisk } = require('../../src/domain/report');

const TODAY = '2026-08-19';

function row(overrides = {}) {
  return {
    contractId: 1, workerId: 10, name: 'Alpha', picture: null, contractPicture: null, fatigue: 0,
    injuryProne: false, cursed: false, robust: false,
    injuryType: null, injuryHealDate: null,
    onTimeOff: false, timeOffEndDate: null, suspended: false, suspensionEndDate: null,
    ...overrides,
  };
}

test('les images de l\'avatar sont recopiées dans les trois listes', () => {
  const images = { picture: 'Alpha.png', contractPicture: 'Alpha Gimmick.png' };
  const { available, onLeave, injured } = buildReport([
    row({ contractId: 1, ...images }),
    row({ contractId: 2, onTimeOff: true, ...images }),
    row({ contractId: 3, injuryType: 'Neck Injury', ...images }),
  ], TODAY);
  for (const w of [available[0], onLeave[0], injured[0]]) {
    assert.equal(w.picture, 'Alpha.png');
    assert.equal(w.contractPicture, 'Alpha Gimmick.png');
  }
});

test('un catcheur disponible est enrichi du risque, du niveau et de la récupération', () => {
  const { available, onLeave, injured } = buildReport([row({ fatigue: 60, injuryProne: true })], TODAY);
  assert.equal(onLeave.length, 0);
  assert.equal(injured.length, 0);
  assert.equal(available.length, 1);
  const w = available[0];
  assert.equal(w.contractId, 1);
  assert.equal(w.workerId, 10);
  assert.equal(w.name, 'Alpha');
  assert.equal(w.fatigue, 60);
  assert.ok(Math.abs(w.risk - 0.032) < 1e-12);
  assert.equal(w.level, 'high');
  assert.equal(w.daysToRecover, 20);
  assert.deepEqual(w.traits, { injuryProne: true, cursed: false, robust: false });
});

test('la fatigue est bornée dans le rapport', () => {
  const { available } = buildReport([row({ fatigue: 140 })], TODAY);
  assert.equal(available[0].fatigue, 100);
});

test('blessure active : type non vide et date de guérison future ou absente', () => {
  const rows = [
    row({ contractId: 1, name: 'A', injuryType: 'Neck Injury', injuryHealDate: '2027-01-01' }),
    row({ contractId: 2, name: 'B', injuryType: 'Foot Injury', injuryHealDate: null }),
    row({ contractId: 3, name: 'C', injuryType: 'Foot Injury', injuryHealDate: TODAY }),
    row({ contractId: 4, name: 'D', injuryType: '  ', injuryHealDate: '2027-01-01' }),
    row({ contractId: 5, name: 'E', injuryType: 'None', injuryHealDate: '2027-01-01' }),
  ];
  const { available, injured } = buildReport(rows, TODAY);
  assert.deepEqual(injured.map((w) => w.contractId), [1, 2]);
  assert.deepEqual(available.map((w) => w.contractId).sort(), [3, 4, 5]);
  assert.deepEqual(injured[0], {
    contractId: 1, workerId: 10, name: 'A', picture: null, contractPicture: null,
    injuryType: 'Neck Injury', returnDate: '2027-01-01',
  });
  assert.equal(injured[1].returnDate, null);
});

test('congé et suspension vont dans onLeave avec motif et date de retour', () => {
  const rows = [
    row({ contractId: 1, name: 'A', onTimeOff: true, timeOffEndDate: '2026-08-26', suspended: true, suspensionEndDate: '2026-08-26' }),
    row({ contractId: 2, name: 'B', suspended: true, suspensionEndDate: '2026-09-01' }),
  ];
  const { onLeave, available } = buildReport(rows, TODAY);
  assert.equal(available.length, 0);
  assert.deepEqual(onLeave, [
    { contractId: 1, workerId: 10, name: 'A', picture: null, contractPicture: null, reason: 'timeOff', returnDate: '2026-08-26' },
    { contractId: 2, workerId: 10, name: 'B', picture: null, contractPicture: null, reason: 'suspension', returnDate: '2026-09-01' },
  ]);
});

test('une date de retour vide devient null', () => {
  const { onLeave } = buildReport([row({ onTimeOff: true, timeOffEndDate: '' })], TODAY);
  assert.equal(onLeave[0].returnDate, null);
});

test('un blessé en congé reste dans les blessés', () => {
  const { injured, onLeave } = buildReport([
    row({ injuryType: 'Hamstring Injury', injuryHealDate: '2027-04-06', onTimeOff: true, timeOffEndDate: '2026-08-26' }),
  ], TODAY);
  assert.equal(injured.length, 1);
  assert.equal(onLeave.length, 0);
});

test('disponibles triés par risque, puis fatigue, puis nom', () => {
  const rows = [
    row({ contractId: 1, name: 'Zed', fatigue: 10 }),
    row({ contractId: 2, name: 'Bob', fatigue: 70 }),
    row({ contractId: 3, name: 'Amy', fatigue: 70 }),
    row({ contractId: 4, name: 'Cid', fatigue: 30, injuryProne: true }),
  ];
  const { available } = buildReport(rows, TODAY);
  assert.deepEqual(available.map((w) => w.name), ['Amy', 'Bob', 'Cid', 'Zed']);
});

test('congés et blessés triés par date de retour (inconnue en dernier), puis nom', () => {
  const rows = [
    row({ contractId: 1, name: 'B', injuryType: 'X', injuryHealDate: '2027-01-01' }),
    row({ contractId: 2, name: 'A', injuryType: 'X', injuryHealDate: null }),
    row({ contractId: 3, name: 'C', injuryType: 'X', injuryHealDate: '2026-09-01' }),
    row({ contractId: 4, name: 'D', injuryType: 'X', injuryHealDate: '2026-09-01' }),
  ];
  const { injured } = buildReport(rows, TODAY);
  assert.deepEqual(injured.map((w) => w.name), ['C', 'D', 'B', 'A']);
});

test('compareByRisk', () => {
  const a = { risk: 0.01, fatigue: 10, name: 'A' };
  const b = { risk: 0.02, fatigue: 10, name: 'B' };
  assert.ok(compareByRisk(a, b) > 0);
  assert.ok(compareByRisk(b, a) < 0);
  assert.equal(compareByRisk(a, { ...a }), 0);
});
