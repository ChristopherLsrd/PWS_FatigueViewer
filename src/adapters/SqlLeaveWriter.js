'use strict';

// Mêmes colonnes que le bouton « congé » du jeu (observé sur PWEve.db) : congé + suspension jusqu'à la même date.
const START_LEAVE_SQL = `UPDATE contracts SET onTimeOff = 1, timeOffEndDate = ?, suspended = 1, suspensionEndDate = ?
WHERE contractID = ? AND COALESCE(onTimeOff, 0) = 0 AND COALESCE(suspended, 0) = 0`;

function createSqlLeaveWriter(execute) {
  return {
    startLeave(contractId, endDate) {
      const info = execute(START_LEAVE_SQL, [endDate, endDate, contractId]);
      return Boolean(info) && info.changes === 1;
    },
  };
}

module.exports = { createSqlLeaveWriter, START_LEAVE_SQL };
