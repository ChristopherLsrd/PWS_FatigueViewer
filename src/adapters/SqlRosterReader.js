'use strict';

const NAME = "COALESCE(NULLIF(TRIM(c.contractName), ''), w.name)";

const ROSTER_SQL = `SELECT c.contractID AS contractId, w.workerID AS workerId, ${NAME} AS name,
  w.picture AS picture, c.contractPicture AS contractPicture,
  w.fatigue AS fatigue, w.injuryProne AS injuryProne, w.cursed AS cursed, w.robust AS robust,
  w.injuryType AS injuryType, w.injuryHealDate AS injuryHealDate,
  c.onTimeOff AS onTimeOff, c.timeOffEndDate AS timeOffEndDate,
  c.suspended AS suspended, c.suspensionEndDate AS suspensionEndDate
FROM contracts c JOIN workers w ON w.workerID = c.workerID
WHERE c.promotionID = ? AND c.finalised = 1 AND COALESCE(c.expired, 0) = 0
  AND w.type = 'Wrestler' AND w.status IN ('Active', 'Semi-Active')
  AND (w.debutDate IS NULL OR w.debutDate = '' OR date(w.debutDate) <= date(?))
ORDER BY name`;

const CONTRACT_SQL = `SELECT c.contractID AS contractId, w.workerID AS workerId, ${NAME} AS name,
  c.promotionID AS promotionId, c.finalised AS finalised, c.expired AS expired,
  w.fatigue AS fatigue, c.onTimeOff AS onTimeOff, c.suspended AS suspended
FROM contracts c JOIN workers w ON w.workerID = c.workerID
WHERE c.contractID = ?`;

function bool(value) {
  return value === 1 || value === true || value === '1';
}

function num(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function id(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Le jeu laisse parfois la chaîne littérale '' dans les colonnes de date.
function text(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === "''" ? null : trimmed;
}

function toRosterRow(r) {
  return {
    contractId: id(r.contractId),
    workerId: id(r.workerId),
    name: String(r.name || ''),
    picture: text(r.picture),
    contractPicture: text(r.contractPicture),
    fatigue: num(r.fatigue),
    injuryProne: bool(r.injuryProne),
    cursed: bool(r.cursed),
    robust: bool(r.robust),
    injuryType: text(r.injuryType),
    injuryHealDate: text(r.injuryHealDate),
    onTimeOff: bool(r.onTimeOff),
    timeOffEndDate: text(r.timeOffEndDate),
    suspended: bool(r.suspended),
    suspensionEndDate: text(r.suspensionEndDate),
  };
}

function toContractRow(r) {
  return {
    contractId: id(r.contractId),
    workerId: id(r.workerId),
    name: String(r.name || ''),
    promotionId: id(r.promotionId),
    finalised: bool(r.finalised),
    expired: bool(r.expired),
    fatigue: num(r.fatigue),
    onTimeOff: bool(r.onTimeOff),
    suspended: bool(r.suspended),
  };
}

function createSqlRosterReader(query) {
  return {
    readRoster(promotionId, today) {
      return (query(ROSTER_SQL, [promotionId, today]) || []).map(toRosterRow);
    },
    readContract(contractId) {
      const rows = query(CONTRACT_SQL, [contractId]) || [];
      return rows.length ? toContractRow(rows[0]) : null;
    },
  };
}

module.exports = { createSqlRosterReader, ROSTER_SQL, CONTRACT_SQL };
