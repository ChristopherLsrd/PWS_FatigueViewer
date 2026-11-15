'use strict';

// api.game.getState() ne donne pas toujours la promotion : elle est aussi dans saveInfo.saveUserPromotion.
const SAVE_INFO_SQL = 'SELECT saveUserPromotion, saveCurrentDate FROM saveInfo LIMIT 1';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toId(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function createGameState(gameApi, query) {
  function saveInfo() {
    try {
      const rows = query(SAVE_INFO_SQL, []);
      return rows && rows.length ? rows[0] : null;
    } catch (e) {
      return null;
    }
  }

  function stateId() {
    try {
      const state = gameApi.getState();
      return toId(state && state.promotionId);
    } catch (e) {
      return null;
    }
  }

  return {
    playerPromotionId() {
      const id = stateId();
      if (id !== null) return id;
      const info = saveInfo();
      return info ? toId(info.saveUserPromotion) : null;
    },
    today() {
      const info = saveInfo();
      const date = info && typeof info.saveCurrentDate === 'string' ? info.saveCurrentDate.slice(0, 10) : '';
      return ISO_DATE.test(date) ? date : null;
    },
  };
}

module.exports = { createGameState };
