'use strict';
const { t, tCount, errorMessage } = require('./i18n');
const { escapeHtml, formatPercent, formatDate } = require('./format');
const { renderAvatar } = require('./avatar');

const LEVELS = Object.freeze(['low', 'medium', 'high']);
const TRAITS = Object.freeze(['injuryProne', 'cursed', 'robust']);

function levelClass(level) {
  return `fv-level-${LEVELS.includes(level) ? level : 'low'}`;
}

function renderPageShell() {
  return '<div class="fv-page" data-plugin-id="fatigue-viewer">'
    + '<div class="fv-toolbar">'
    + '<div class="button clickable" id="fv-settings-button"><i class="fa fa-cog" aria-hidden="true"></i> '
    + '<span class="fv-settings-label"></span></div>'
    + '<span class="fv-status" id="fv-status"></span>'
    + '</div>'
    + '<div class="fv-content" id="fv-content"></div>'
    + '</div>';
}

function section(title, count, body, locale) {
  const content = count ? body : `<div class="noResults">${escapeHtml(t(locale, 'section.empty'))}</div>`;
  return `<section class="fv-section"><h3>${escapeHtml(title)} <span class="fv-count">(${count})</span></h3>${content}</section>`;
}

function th(label, sortKey, type) {
  if (!sortKey) return `<th>${escapeHtml(label)}</th>`;
  return `<th data-fv-sort="${sortKey}" data-fv-type="${type}" class="clickable">${escapeHtml(label)}</th>`;
}

function dateText(iso, locale) {
  return formatDate(iso, locale) || t(locale, 'date.unknown');
}

function recoveryText(days, locale) {
  return days > 0 ? tCount(locale, 'recovery.days', days) : t(locale, 'recovery.rested');
}

function traitBadges(traits, locale) {
  return TRAITS.filter((key) => traits && traits[key])
    .map((key) => `<span class="fv-trait fv-trait-${key}">${escapeHtml(t(locale, `trait.${key}`))}</span>`)
    .join(' ');
}

function nameCell(w, locale) {
  return `<td class="fv-name"><span class="fv-identity">${renderAvatar(w, locale)}`
    + `<span class="fv-name-text">${escapeHtml(w.name)}</span></span></td>`;
}

function availableRow(w, locale) {
  const level = levelClass(w.level);
  return `<tr data-sort-name="${escapeHtml(w.name.toLowerCase())}" data-sort-fatigue="${w.fatigue}"`
    + ` data-sort-risk="${w.risk}" data-sort-recovery="${w.daysToRecover}">`
    + nameCell(w, locale)
    + `<td><div class="fv-bar"><div class="fv-bar-fill ${level}" style="width:${w.fatigue}%"></div></div>`
    + `<span class="fv-bar-value">${Math.round(w.fatigue)}</span></td>`
    + `<td><span class="fv-badge ${level}">${escapeHtml(t(locale, `level.${w.level}`))}</span> `
    + `<span class="fv-risk" title="${escapeHtml(t(locale, 'risk.perMatch'))}">${escapeHtml(formatPercent(w.risk, locale))}</span></td>`
    + `<td>${escapeHtml(recoveryText(w.daysToRecover, locale))}</td>`
    + `<td>${traitBadges(w.traits, locale)}</td>`
    + `<td><div class="button clickable fv-leave-button" data-fv-leave="${w.contractId}">${escapeHtml(t(locale, 'leave.button'))}</div></td>`
    + '</tr>';
}

function availableTable(list, locale) {
  const head = th(t(locale, 'col.name'), 'name', 'text')
    + th(t(locale, 'col.fatigue'), 'fatigue', 'number')
    + th(t(locale, 'col.risk'), 'risk', 'number')
    + th(t(locale, 'col.recovery'), 'recovery', 'number')
    + th(t(locale, 'col.traits'))
    + th(t(locale, 'col.actions'));
  return `<table class="fv-table"><thead><tr>${head}</tr></thead>`
    + `<tbody>${list.map((w) => availableRow(w, locale)).join('')}</tbody></table>`;
}

// rows : [{ worker, cells }] ; la première colonne est le nom avec l'avatar, les autres du texte.
function simpleTable(headers, rows, locale) {
  const body = rows.map(({ worker, cells }) => `<tr>${nameCell(worker, locale)}`
    + `<td>${cells.map(escapeHtml).join('</td><td>')}</td></tr>`).join('');
  return `<table class="fv-table"><thead><tr>${headers.map((h) => th(h)).join('')}</tr></thead>`
    + `<tbody>${body}</tbody></table>`;
}

function renderReport(report, locale) {
  const onLeaveRows = report.onLeave.map((w) => ({
    worker: w, cells: [t(locale, `reason.${w.reason}`), dateText(w.returnDate, locale)],
  }));
  const injuredRows = report.injured.map((w) => ({
    worker: w, cells: [w.injuryType || '', dateText(w.returnDate, locale)],
  }));
  return section(t(locale, 'section.available'), report.available.length, availableTable(report.available, locale), locale)
    + section(t(locale, 'section.onLeave'), report.onLeave.length,
      simpleTable([t(locale, 'col.name'), t(locale, 'col.reason'), t(locale, 'col.return')], onLeaveRows, locale), locale)
    + section(t(locale, 'section.injured'), report.injured.length,
      simpleTable([t(locale, 'col.name'), t(locale, 'col.injury'), t(locale, 'col.return')], injuredRows, locale), locale);
}

function renderReportError(reason, locale) {
  return `<div class="noResults fv-error">${escapeHtml(errorMessage(locale, reason))}</div>`;
}

module.exports = { renderPageShell, renderReport, renderReportError, levelClass };
