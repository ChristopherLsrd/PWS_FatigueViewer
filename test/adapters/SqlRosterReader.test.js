'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSqlRosterReader, ROSTER_SQL, CONTRACT_SQL } = require('../../src/adapters/SqlRosterReader');

function fakeQuery(rows) {
  const calls = [];
  return { calls, query: (sql, params) => { calls.push([sql, params]); return rows; } };
}

const RAW = {
  contractId: 13100, workerId: 9729, name: 'Celine Faery', picture: 'Celine%20Faery.png', contractPicture: '', fatigue: 57,
  injuryProne: 1, cursed: 0, robust: null,
  injuryType: '', injuryHealDate: null,
  onTimeOff: 0, timeOffEndDate: "''", suspended: 0, suspensionEndDate: '',
};

test('la requête du roster filtre la promotion, les contrats actifs, les catcheurs et la date de début', () => {
  assert.match(ROSTER_SQL, /c\.promotionID = \?/);
  assert.match(ROSTER_SQL, /c\.finalised = 1/);
  assert.match(ROSTER_SQL, /COALESCE\(c\.expired, 0\) = 0/);
  assert.match(ROSTER_SQL, /w\.type = 'Wrestler'/);
  assert.match(ROSTER_SQL, /w\.status IN \('Active', 'Semi-Active'\)/);
  assert.match(ROSTER_SQL, /date\(w\.debutDate\) <= date\(\?\)/);
  assert.match(ROSTER_SQL, /w\.picture AS picture, c\.contractPicture AS contractPicture/);
});

test('readRoster passe promotion et date, et normalise les lignes', () => {
  const { query, calls } = fakeQuery([RAW]);
  const rows = createSqlRosterReader(query).readRoster(239, '2026-08-20');
  assert.deepEqual(calls, [[ROSTER_SQL, [239, '2026-08-20']]]);
  assert.deepEqual(rows, [{
    contractId: 13100, workerId: 9729, name: 'Celine Faery', picture: 'Celine%20Faery.png', contractPicture: null, fatigue: 57,
    injuryProne: true, cursed: false, robust: false,
    injuryType: null, injuryHealDate: null,
    onTimeOff: false, timeOffEndDate: null, suspended: false, suspensionEndDate: null,
  }]);
});

test('readRoster garde les textes utiles et convertit les nombres', () => {
  const { query } = fakeQuery([{
    ...RAW, fatigue: null, injuryType: ' Neck Injury ', injuryHealDate: '2027-01-01',
    onTimeOff: 1, timeOffEndDate: '2026-08-26', suspended: '1', suspensionEndDate: '2026-08-26',
  }]);
  const [row] = createSqlRosterReader(query).readRoster(239, '2026-08-20');
  assert.equal(row.fatigue, 0);
  assert.equal(row.injuryType, 'Neck Injury');
  assert.equal(row.injuryHealDate, '2027-01-01');
  assert.equal(row.onTimeOff, true);
  assert.equal(row.timeOffEndDate, '2026-08-26');
  assert.equal(row.suspended, true);
});

test('readRoster renvoie une liste vide si la requête ne renvoie rien', () => {
  assert.deepEqual(createSqlRosterReader(() => undefined).readRoster(1, '2026-08-20'), []);
});

test('readContract lit un contrat', () => {
  const { query, calls } = fakeQuery([{
    contractId: 13100, workerId: 9729, name: 'Celine Faery', promotionId: '239',
    finalised: 1, expired: null, fatigue: 12, onTimeOff: 0, suspended: 0,
  }]);
  assert.deepEqual(createSqlRosterReader(query).readContract(13100), {
    contractId: 13100, workerId: 9729, name: 'Celine Faery', promotionId: 239,
    finalised: true, expired: false, fatigue: 12, onTimeOff: false, suspended: false,
  });
  assert.deepEqual(calls, [[CONTRACT_SQL, [13100]]]);
});

test('readContract renvoie null si le contrat n\'existe pas', () => {
  assert.equal(createSqlRosterReader(() => []).readContract(1), null);
});
