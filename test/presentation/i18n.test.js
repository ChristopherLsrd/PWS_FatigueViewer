'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MESSAGES, resolveLocale, t, tCount, errorMessage } = require('../../src/presentation/i18n');

test('le français a toutes les clés de l\'anglais', () => {
  const missing = Object.keys(MESSAGES.en).filter((key) => !(key in MESSAGES.fr));
  assert.deepEqual(missing, []);
});

test('aucune langue n\'a de clé absente de l\'anglais', () => {
  for (const [lang, dict] of Object.entries(MESSAGES)) {
    const extra = Object.keys(dict).filter((key) => !(key in MESSAGES.en));
    assert.deepEqual(extra, [], lang);
  }
});

test('resolveLocale : code exact, préfixe, sinon anglais', () => {
  assert.equal(resolveLocale('fr'), 'fr');
  assert.equal(resolveLocale('fr-CA'), 'fr');
  assert.equal(resolveLocale('FR_fr'), 'fr');
  assert.equal(resolveLocale('ja'), 'en');
  assert.equal(resolveLocale(null), 'en');
  assert.equal(resolveLocale(42), 'en');
});

test('t traduit, interpole et replie sur l\'anglais puis sur la clé', () => {
  assert.equal(t('fr', 'leave.button'), 'Congé');
  assert.equal(t('en', 'leave.title', { name: 'Celine' }), 'Send Celine on time off');
  assert.equal(t('ja', 'leave.button'), 'Time off');
  assert.equal(t('fr', 'missing.key'), 'missing.key');
  assert.equal(t('en', 'leave.title', {}), 'Send {name} on time off');
});

test('tCount : 0 et 1 au singulier en français, seul 1 en anglais', () => {
  assert.equal(tCount('fr', 'recovery.days', 0), '0 jour');
  assert.equal(tCount('fr', 'recovery.days', 1), '1 jour');
  assert.equal(tCount('fr', 'recovery.days', 2), '2 jours');
  assert.equal(tCount('en', 'recovery.days', 0), '0 days');
  assert.equal(tCount('en', 'recovery.days', 1), '1 day');
});

test('errorMessage traduit chaque motif et replie sur readFailed', () => {
  for (const reason of ['invalidDays', 'noSave', 'notFound', 'notYourWorker', 'inactiveContract', 'alreadyOff', 'writeFailed', 'readFailed']) {
    assert.notEqual(errorMessage('fr', reason), `error.${reason}`, reason);
  }
  assert.equal(errorMessage('fr', 'weird'), errorMessage('fr', 'readFailed'));
});

test('langues bonus disponibles et complètes', () => {
  for (const lang of ['de', 'es', 'it', 'pt']) {
    assert.equal(resolveLocale(lang), lang);
    const missing = Object.keys(MESSAGES.en).filter((key) => !(key in MESSAGES[lang]));
    assert.deepEqual(missing, [], lang);
  }
  assert.equal(t('de', 'leave.button'), 'Auszeit');
  assert.equal(t('es-MX', 'leave.button'), 'Descanso');
  assert.equal(t('it', 'leave.button'), 'Riposo');
  assert.equal(t('pt-BR', 'leave.button'), 'Folga');
});
