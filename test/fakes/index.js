'use strict';
const { SETTINGS_SCHEMA } = require('../../src/application/ports');

function rosterRow(overrides = {}) {
  return {
    contractId: 1, workerId: 10, name: 'Alpha', picture: null, contractPicture: null, fatigue: 0,
    injuryProne: false, cursed: false, robust: false,
    injuryType: null, injuryHealDate: null,
    onTimeOff: false, timeOffEndDate: null, suspended: false, suspensionEndDate: null,
    ...overrides,
  };
}

function contractRow(overrides = {}) {
  return {
    contractId: 1, workerId: 10, name: 'Alpha', promotionId: 1, finalised: true, expired: false,
    fatigue: 0, onTimeOff: false, suspended: false,
    ...overrides,
  };
}

function createFakeRoster({ rows = [], contracts = {}, throws = null } = {}) {
  return {
    calls: [],
    readRoster(promotionId, today) {
      this.calls.push(['readRoster', promotionId, today]);
      if (throws) throw throws;
      return rows;
    },
    readContract(contractId) {
      this.calls.push(['readContract', contractId]);
      if (throws) throw throws;
      return contracts[contractId] || null;
    },
  };
}

function createFakeLeaveWriter({ result = true, throws = null } = {}) {
  return {
    calls: [],
    startLeave(contractId, endDate) {
      this.calls.push([contractId, endDate]);
      if (throws) throw throws;
      return result;
    },
  };
}

function createFakeSettings(overrides = {}) {
  const values = Object.fromEntries(SETTINGS_SCHEMA.map((s) => [s.key, s.default]));
  Object.assign(values, overrides);
  return {
    values,
    get(key) { return values[key]; },
    set(key, value) { values[key] = value; },
  };
}

function createFakeGameState({ promotionId = 1, today = '2026-08-19' } = {}) {
  return {
    playerPromotionId() { return promotionId; },
    today() { return today; },
  };
}

function createFakeLogger() {
  return {
    logs: [],
    errors: [],
    log(...args) { this.logs.push(args); },
    error(...args) { this.errors.push(args); },
  };
}

module.exports = {
  rosterRow, contractRow, createFakeRoster, createFakeLeaveWriter, createFakeSettings, createFakeGameState, createFakeLogger,
};
