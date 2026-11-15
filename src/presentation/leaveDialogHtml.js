'use strict';
const { t, tCount } = require('./i18n');
const { escapeHtml, formatDate } = require('./format');

const LEAVE_MODAL_ID = 'fvLeaveModal';

function renderLeaveDialog(prep, locale) {
  return `<div class="modalContainer" style="display:none" id="${LEAVE_MODAL_ID}" data-plugin-id="fatigue-viewer">`
    + '<div class="modal smallModal">'
    + `<div class="modalHeader"><h3>${escapeHtml(t(locale, 'leave.title', { name: prep.name }))}</h3>`
    + '<i class="close fa fa-times" onclick="closeModal(this)"></i></div>'
    + '<div class="modalContents hasButtons">'
    + `<div class="labelInputPair"><label for="fv-leave-days">${escapeHtml(t(locale, 'leave.days'))}</label>`
    + `<input type="number" id="fv-leave-days" min="1" max="90" step="1" value="${prep.suggestedDays}"></div>`
    + `<div class="labelInputPair"><label>${escapeHtml(t(locale, 'leave.return'))}</label>`
    + `<span id="fv-leave-return">${escapeHtml(formatDate(prep.endDate, locale) || '')}</span></div>`
    + `<p class="fv-hint">${escapeHtml(tCount(locale, 'leave.hint', prep.suggestedDays))}</p>`
    + '<p class="fv-error" id="fv-leave-error"></p>'
    + '</div>'
    + '<div class="buttonArea">'
    + `<div class="button clickable secondaryButton" onclick="closeModal(this)">${escapeHtml(t(locale, 'leave.cancel'))}</div>`
    + `<div class="button clickable" id="fv-leave-confirm" data-fv-contract="${prep.contractId}">${escapeHtml(t(locale, 'leave.confirm'))}</div>`
    + '</div>'
    + '</div></div>';
}

module.exports = { LEAVE_MODAL_ID, renderLeaveDialog };
