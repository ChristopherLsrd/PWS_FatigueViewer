'use strict';

/**
 * @typedef {{contractId:number,workerId:number,name:string,picture:string|null,contractPicture:string|null,
 *   fatigue:number,injuryProne:boolean,cursed:boolean,robust:boolean,
 *   injuryType:string|null,injuryHealDate:string|null,onTimeOff:boolean,timeOffEndDate:string|null,
 *   suspended:boolean,suspensionEndDate:string|null}} RosterRow
 * @typedef {{contractId:number,workerId:number,name:string,promotionId:number|null,finalised:boolean,expired:boolean,
 *   fatigue:number,onTimeOff:boolean,suspended:boolean}} ContractRow
 *
 * Ports :
 * - RosterReader : readRoster(promotionId, today) → RosterRow[] ; readContract(contractId) → ContractRow|null
 * - LeaveWriter : startLeave(contractId, endDate) → boolean (true si une ligne a été modifiée)
 * - GameState : playerPromotionId() → number|null ; today() → 'AAAA-MM-JJ'|null
 * - Settings : get(key) → valeur (clés et défauts : SETTINGS_SCHEMA) ; set(key, value)
 * - Logger : log(...args) ; error(...args)
 */

function setting(key, label, type, def, description, bounds = {}) {
  return Object.freeze({ key, label, type, default: def, description, ...bounds });
}

const SETTINGS_SCHEMA = Object.freeze([
  setting('showOfficeWidget', 'Office widget', 'boolean', true, 'Show tired or at-risk wrestlers on the office screen'),
  setting('fatigueThreshold', 'Fatigue threshold', 'number', 50, 'Minimum fatigue to appear in the widget',
    { min: 0, max: 100, integer: true }),
  setting('includeHighRisk', 'High injury risk', 'boolean', true, 'Also list wrestlers with a high injury risk'),
  setting('widgetMaxItems', 'Widget rows', 'number', 8, 'Maximum number of wrestlers in the widget',
    { min: 1, max: 20, integer: true }),
]);

const PORTS = Object.freeze({
  RosterReader: ['readRoster', 'readContract'],
  LeaveWriter: ['startLeave'],
  GameState: ['playerPromotionId', 'today'],
  Settings: ['get', 'set'],
  Logger: ['log', 'error'],
});

function assertPort(name, candidate) {
  const methods = PORTS[name];
  if (!methods) throw new TypeError(`Port inconnu : ${name}`);
  if (!candidate || typeof candidate !== 'object') throw new TypeError(`${name} : objet attendu`);
  for (const method of methods) {
    if (typeof candidate[method] !== 'function') throw new TypeError(`${name} : méthode ${method}() manquante`);
  }
  return candidate;
}

module.exports = { SETTINGS_SCHEMA, PORTS, assertPort };
