'use strict';

// Textes du plugin. La langue suit celle du jeu (I18n.locale).
// Français et anglais sont obligatoires ; les autres langues sont en bonus. Toute clé manquante replie sur l'anglais.
const en = require('./locales/en');
const fr = require('./locales/fr');
const de = require('./locales/de');
const es = require('./locales/es');
const it = require('./locales/it');
const pt = require('./locales/pt');

const MESSAGES = Object.freeze({ en, fr, de, es, it, pt });

// Langues où 0 et 1 prennent le singulier.
const SINGULAR_BELOW_TWO = new Set(['fr', 'pt']);

const ERROR_REASONS = new Set([
  'invalidDays', 'noSave', 'notFound', 'notYourWorker', 'inactiveContract', 'alreadyOff', 'writeFailed', 'readFailed',
]);

function has(dict, key) {
  return Object.prototype.hasOwnProperty.call(dict, key);
}

function resolveLocale(code) {
  if (typeof code !== 'string') return 'en';
  const full = code.trim().toLowerCase();
  if (has(MESSAGES, full)) return full;
  const prefix = full.split(/[-_]/)[0];
  return has(MESSAGES, prefix) ? prefix : 'en';
}

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (
    params[name] === undefined || params[name] === null ? match : String(params[name])
  ));
}

function t(locale, key, params) {
  const dict = MESSAGES[resolveLocale(locale)];
  let text = String(key);
  if (has(dict, key)) text = dict[key];
  else if (has(MESSAGES.en, key)) text = MESSAGES.en[key];
  return interpolate(text, params);
}

function tCount(locale, key, count) {
  const lang = resolveLocale(locale);
  const singular = SINGULAR_BELOW_TWO.has(lang) ? count < 2 : count === 1;
  return t(locale, `${key}.${singular ? 'one' : 'other'}`, { count });
}

function errorMessage(locale, reason) {
  return t(locale, `error.${ERROR_REASONS.has(reason) ? reason : 'readFailed'}`);
}

module.exports = { MESSAGES, resolveLocale, t, tCount, errorMessage };
