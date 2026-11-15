'use strict';
const { t } = require('./i18n');
const { escapeHtml } = require('./format');

function input(def, value) {
  if (def.type === 'boolean') {
    return `<input type="checkbox" data-fv-setting="${def.key}"${value ? ' checked' : ''}>`;
  }
  const min = def.min !== undefined ? ` min="${def.min}"` : '';
  const max = def.max !== undefined ? ` max="${def.max}"` : '';
  return `<input type="number" data-fv-setting="${def.key}"${min}${max} step="1" value="${escapeHtml(value)}">`;
}

function renderSettingsForm(schema, values, locale) {
  const rows = schema.map((def) => '<div class="labelInputPair fv-setting">'
    + `<label>${escapeHtml(t(locale, `settings.${def.key}`))}`
    + `<small class="fv-setting-help">${escapeHtml(t(locale, `settings.${def.key}.help`))}</small></label>`
    + `${input(def, values[def.key])}</div>`).join('');
  return `<form class="fv-settings" data-fv-saved="${escapeHtml(t(locale, 'settings.saved'))}"`
    + ` data-fv-error="${escapeHtml(t(locale, 'settings.error'))}" onsubmit="return false">`
    + `<h3>${escapeHtml(t(locale, 'settings.title'))}</h3>${rows}`
    + '<p class="fv-settings-status"></p></form>';
}

module.exports = { renderSettingsForm };
