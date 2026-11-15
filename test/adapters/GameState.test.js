'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameState } = require('../../src/adapters/GameState');

function queryReturning(rows) {
  const calls = [];
  const query = (sql, params) => { calls.push([sql, params]); return rows; };
  return { query, calls };
}

test('playerPromotionId préfère l\'état du jeu', () => {
  const { query, calls } = queryReturning([{ saveUserPromotion: 239 }]);
  const state = createGameState({ getState: () => ({ promotionId: 12 }) }, query);
  assert.equal(state.playerPromotionId(), 12);
  assert.equal(calls.length, 0);
});

test('playerPromotionId lit saveInfo si l\'état du jeu ne la donne pas', () => {
  const { query, calls } = queryReturning([{ saveUserPromotion: '239' }]);
  const state = createGameState({ getState: () => ({}) }, query);
  assert.equal(state.playerPromotionId(), 239);
  assert.match(calls[0][0], /FROM saveInfo/);
});

test('playerPromotionId renvoie null sans sauvegarde ou en erreur', () => {
  assert.equal(createGameState({ getState: () => null }, () => []).playerPromotionId(), null);
  assert.equal(createGameState({ getState: () => { throw new Error('x'); } }, () => { throw new Error('y'); }).playerPromotionId(), null);
});

test('today lit saveCurrentDate au format AAAA-MM-JJ', () => {
  assert.equal(createGameState({ getState: () => ({}) }, () => [{ saveCurrentDate: '2026-08-20' }]).today(), '2026-08-20');
  assert.equal(createGameState({ getState: () => ({}) }, () => [{ saveCurrentDate: '2026-08-20 00:00:00' }]).today(), '2026-08-20');
});

test('today renvoie null si la date est absente, invalide ou illisible', () => {
  assert.equal(createGameState({ getState: () => ({}) }, () => []).today(), null);
  assert.equal(createGameState({ getState: () => ({}) }, () => [{ saveCurrentDate: '20/08/2026' }]).today(), null);
  assert.equal(createGameState({ getState: () => ({}) }, () => { throw new Error('x'); }).today(), null);
});
