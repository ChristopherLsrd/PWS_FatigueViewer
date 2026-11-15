'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { clampFatigue, injuryRiskPerMatch, riskLevel, RISK_THRESHOLDS } = require('../../src/domain/injuryRisk');

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
}

test('clampFatigue borne entre 0 et 100 et neutralise les valeurs invalides', () => {
  assert.equal(clampFatigue(42), 42);
  assert.equal(clampFatigue(-10), 0);
  assert.equal(clampFatigue(150), 100);
  assert.equal(clampFatigue(null), 0);
  assert.equal(clampFatigue(undefined), 0);
  assert.equal(clampFatigue('abc'), 0);
  assert.equal(clampFatigue('30'), 30);
});

test('risque de base : (2 + fatigue / 2) / 2000', () => {
  near(injuryRiskPerMatch({ fatigue: 0 }), 0.001);
  near(injuryRiskPerMatch({ fatigue: 50 }), 0.0135);
  near(injuryRiskPerMatch({ fatigue: 100 }), 0.026);
});

test('la fatigue hors bornes est ramenée dans 0-100', () => {
  near(injuryRiskPerMatch({ fatigue: -5 }), 0.001);
  near(injuryRiskPerMatch({ fatigue: 400 }), 0.026);
  near(injuryRiskPerMatch({}), 0.001);
});

test('injury prone et cursed doublent chacun le risque, robust le divise par 4', () => {
  near(injuryRiskPerMatch({ fatigue: 0, injuryProne: true }), 0.002);
  near(injuryRiskPerMatch({ fatigue: 0, cursed: true }), 0.002);
  near(injuryRiskPerMatch({ fatigue: 0, injuryProne: true, cursed: true }), 0.004);
  near(injuryRiskPerMatch({ fatigue: 100, robust: true }), 0.0065);
  near(injuryRiskPerMatch({ fatigue: 100, injuryProne: true, robust: true }), 0.013);
});

test('seuils des niveaux', () => {
  assert.deepEqual(RISK_THRESHOLDS, { medium: 0.0075, high: 0.015 });
  assert.equal(riskLevel(0), 'low');
  assert.equal(riskLevel(0.0074), 'low');
  assert.equal(riskLevel(0.0075), 'medium');
  assert.equal(riskLevel(0.0149), 'medium');
  assert.equal(riskLevel(0.015), 'high');
});

test('niveaux pour un catcheur sans trait : moyen dès 26, élevé dès 56', () => {
  assert.equal(riskLevel(injuryRiskPerMatch({ fatigue: 25 })), 'low');
  assert.equal(riskLevel(injuryRiskPerMatch({ fatigue: 26 })), 'medium');
  assert.equal(riskLevel(injuryRiskPerMatch({ fatigue: 55 })), 'medium');
  assert.equal(riskLevel(injuryRiskPerMatch({ fatigue: 56 })), 'high');
});

test('un catcheur injury prone est à risque élevé dès 26 de fatigue', () => {
  assert.equal(riskLevel(injuryRiskPerMatch({ fatigue: 26, injuryProne: true })), 'high');
});

test('un catcheur robust reste à risque faible même épuisé', () => {
  assert.equal(riskLevel(injuryRiskPerMatch({ fatigue: 100, robust: true })), 'low');
});
