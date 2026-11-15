'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { daysToRecover } = require('../../src/domain/fatigue');

test('3 points de fatigue récupérés par jour, arrondi au jour supérieur', () => {
  assert.equal(daysToRecover(0), 0);
  assert.equal(daysToRecover(1), 1);
  assert.equal(daysToRecover(3), 1);
  assert.equal(daysToRecover(4), 2);
  assert.equal(daysToRecover(50), 17);
  assert.equal(daysToRecover(100), 34);
});

test('valeurs invalides ou hors bornes', () => {
  assert.equal(daysToRecover(-3), 0);
  assert.equal(daysToRecover(null), 0);
  assert.equal(daysToRecover(300), 34);
});
