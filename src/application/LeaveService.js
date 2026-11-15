'use strict';
const { assertPort } = require('./ports');
const { validateLeaveDays, leaveEndDate, suggestedLeaveDays } = require('../domain/leave');

/** Envoi d'un catcheur en congé, avec les mêmes écritures que le bouton du jeu. */
function createLeaveService({ roster, writer, gameState, logger } = {}) {
  assertPort('RosterReader', roster);
  assertPort('LeaveWriter', writer);
  assertPort('GameState', gameState);
  assertPort('Logger', logger);

  function context() {
    const promotionId = gameState.playerPromotionId();
    const today = gameState.today();
    return promotionId === null || !today ? null : { promotionId, today };
  }

  function eligibleContract(contractId, promotionId) {
    const contract = roster.readContract(contractId);
    if (!contract) return { ok: false, reason: 'notFound' };
    if (contract.promotionId !== promotionId) return { ok: false, reason: 'notYourWorker' };
    if (!contract.finalised || contract.expired) return { ok: false, reason: 'inactiveContract' };
    if (contract.onTimeOff || contract.suspended) return { ok: false, reason: 'alreadyOff' };
    return { ok: true, contract };
  }

  function guarded(label, failReason, fn) {
    try {
      return fn();
    } catch (e) {
      logger.error(label, e);
      return { ok: false, reason: failReason };
    }
  }

  function prepare(contractId) {
    return guarded('leave.prepare', 'readFailed', () => {
      const ctx = context();
      if (!ctx) return { ok: false, reason: 'noSave' };
      const check = eligibleContract(contractId, ctx.promotionId);
      if (!check.ok) return check;
      const { name, fatigue } = check.contract;
      const suggestedDays = suggestedLeaveDays(fatigue);
      return { ok: true, contractId, name, fatigue, suggestedDays, endDate: leaveEndDate(ctx.today, suggestedDays) };
    });
  }

  function preview(days) {
    return guarded('leave.preview', 'readFailed', () => {
      const valid = validateLeaveDays(days);
      if (!valid.ok) return valid;
      const ctx = context();
      if (!ctx) return { ok: false, reason: 'noSave' };
      return { ok: true, days, endDate: leaveEndDate(ctx.today, days) };
    });
  }

  function send(contractId, days) {
    return guarded('leave.send', 'writeFailed', () => {
      const valid = validateLeaveDays(days);
      if (!valid.ok) return valid;
      const ctx = context();
      if (!ctx) return { ok: false, reason: 'noSave' };
      const check = eligibleContract(contractId, ctx.promotionId);
      if (!check.ok) return check;
      const endDate = leaveEndDate(ctx.today, days);
      if (!writer.startLeave(contractId, endDate)) return { ok: false, reason: 'writeFailed' };
      logger.log(`Congé : contrat ${contractId} jusqu'au ${endDate}`);
      return { ok: true, endDate };
    });
  }

  return { prepare, preview, send };
}

module.exports = { createLeaveService };
