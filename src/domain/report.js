'use strict';
const { clampFatigue, injuryRiskPerMatch, riskLevel } = require('./injuryRisk');
const { daysToRecover } = require('./fatigue');

function text(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function isInjured(row, today) {
  const type = text(row.injuryType);
  if (!type || type === 'None') return false;
  const heal = text(row.injuryHealDate);
  return !heal || heal > today;
}

function isOff(row) {
  return Boolean(row.onTimeOff) || Boolean(row.suspended);
}

function compareByRisk(a, b) {
  return (b.risk - a.risk) || (b.fatigue - a.fatigue) || a.name.localeCompare(b.name);
}

function compareByReturn(a, b) {
  const x = a.returnDate || '9999-99-99';
  const y = b.returnDate || '9999-99-99';
  if (x !== y) return x < y ? -1 : 1;
  return a.name.localeCompare(b.name);
}

// Identité commune aux trois listes : de quoi afficher le nom et l'avatar.
function identity(row) {
  return {
    contractId: row.contractId,
    workerId: row.workerId,
    name: row.name,
    picture: text(row.picture),
    contractPicture: text(row.contractPicture),
  };
}

function toAvailable(row) {
  const fatigue = clampFatigue(row.fatigue);
  const traits = { injuryProne: Boolean(row.injuryProne), cursed: Boolean(row.cursed), robust: Boolean(row.robust) };
  const risk = injuryRiskPerMatch({ fatigue, ...traits });
  return {
    ...identity(row),
    fatigue,
    risk,
    level: riskLevel(risk),
    daysToRecover: daysToRecover(fatigue),
    traits,
  };
}

function toOnLeave(row) {
  const timeOff = Boolean(row.onTimeOff);
  return {
    ...identity(row),
    reason: timeOff ? 'timeOff' : 'suspension',
    returnDate: text(timeOff ? row.timeOffEndDate : row.suspensionEndDate),
  };
}

function toInjured(row) {
  return {
    ...identity(row),
    injuryType: text(row.injuryType),
    returnDate: text(row.injuryHealDate),
  };
}

/** Répartit le roster : blessés (prioritaires), en congé ou suspendus, disponibles. */
function buildReport(rows, today) {
  const available = [];
  const onLeave = [];
  const injured = [];
  for (const row of rows) {
    if (isInjured(row, today)) injured.push(toInjured(row));
    else if (isOff(row)) onLeave.push(toOnLeave(row));
    else available.push(toAvailable(row));
  }
  available.sort(compareByRisk);
  onLeave.sort(compareByReturn);
  injured.sort(compareByReturn);
  return { available, onLeave, injured };
}

module.exports = { buildReport, compareByRisk };
