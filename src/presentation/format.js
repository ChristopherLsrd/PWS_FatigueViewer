'use strict';
const { resolveLocale } = require('./i18n');

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

function formatPercent(p, locale) {
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(p);
}

function formatDate(iso, locale) {
  const match = typeof iso === 'string' ? ISO_DATE.exec(iso) : null;
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

module.exports = { escapeHtml, formatPercent, formatDate };
