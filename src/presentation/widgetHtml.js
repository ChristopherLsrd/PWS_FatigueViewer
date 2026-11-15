'use strict';
const { t, tCount } = require('./i18n');
const { escapeHtml } = require('./format');
const { levelClass } = require('./reportHtml');

function item(w, locale) {
  return '<li class="fv-widget-item">'
    + `<span class="fv-widget-name">${escapeHtml(w.name)}</span>`
    + `<span class="fv-widget-fatigue">${escapeHtml(t(locale, 'widget.fatigue', { value: Math.round(w.fatigue) }))}</span>`
    + `<span class="fv-badge ${levelClass(w.level)}">${escapeHtml(t(locale, `level.${w.level}`))}</span>`
    + '</li>';
}

function renderWidget(result, locale) {
  if (!result || !result.ok || !result.enabled) return '';
  const hidden = result.total - result.items.length;
  const body = result.items.length
    ? `<ul class="fv-widget-list">${result.items.map((w) => item(w, locale)).join('')}</ul>`
    : `<div class="noResults">${escapeHtml(t(locale, 'widget.empty'))}</div>`;
  const more = hidden > 0 ? `<span class="fv-widget-more">${escapeHtml(tCount(locale, 'widget.more', hidden))}</span>` : '<span></span>';
  return '<div class="panel fv-widget">'
    + `<h3 class="fv-widget-title">${escapeHtml(t(locale, 'widget.title'))}</h3>`
    + body
    + `<div class="fv-widget-footer">${more}`
    + `<span class="clickable fv-widget-link" data-navigate-to="fatigueViewerPage">${escapeHtml(t(locale, 'widget.seeAll'))}</span></div>`
    + '</div>';
}

module.exports = { renderWidget };
