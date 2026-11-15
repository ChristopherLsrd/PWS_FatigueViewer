'use strict';
const { t, tCount } = require('./i18n');
const { escapeHtml, formatPercent } = require('./format');
const { levelClass } = require('./reportHtml');
const { renderAvatar } = require('./avatar');

// Identifiant de la carte dans la grille du Bureau (gs-id, MainOffice.WIDGETS).
const WIDGET_ID = 'fatigueViewer';
const PAGE_ID = 'fatigueViewerPage';

function row(w, locale) {
  const meta = `${t(locale, 'widget.fatigue', { value: Math.round(w.fatigue) })} · ${formatPercent(w.risk, locale)}`;
  return '<div class="fv-office-row">'
    + '<div class="fv-office-top">'
    + renderAvatar(w, locale)
    + `<span class="fv-office-name">${escapeHtml(w.name)}</span>`
    + `<span class="fv-badge ${levelClass(w.level)}">${escapeHtml(t(locale, `level.${w.level}`))}</span>`
    + '</div>'
    + `<div class="fv-office-meta">${escapeHtml(meta)}</div>`
    + '</div>';
}

/** Contenu de la carte du Bureau (.panel des widgets du jeu) ; '' si désactivé ou en erreur. */
function renderWidget(result, locale) {
  if (!result || !result.ok || !result.enabled) return '';
  const hidden = result.total - result.items.length;
  const body = result.items.length
    ? result.items.map((w) => row(w, locale)).join('')
    : `<div class="fv-office-empty">${escapeHtml(t(locale, 'widget.empty'))}</div>`;
  const more = hidden > 0
    ? `<div class="fv-office-more">${escapeHtml(tCount(locale, 'widget.more', hidden))}</div>`
    : '';
  return `<div class="panel" data-widget="${WIDGET_ID}" onclick="Game.showPage('${PAGE_ID}')">`
    + `<h3>${escapeHtml(t(locale, 'widget.title'))}</h3>`
    + `<div class="panelContents fv-office">${body}${more}</div>`
    + '</div>';
}

module.exports = { renderWidget, WIDGET_ID };
