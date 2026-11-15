'use strict';
const { renderPageShell, renderReport, renderReportError } = require('../presentation/reportHtml');
const { renderLeaveDialog } = require('../presentation/leaveDialogHtml');
const { renderSettingsForm } = require('../presentation/settingsForm');
const { t, errorMessage } = require('../presentation/i18n');
const { formatDate } = require('../presentation/format');
const { resolveAvatarsJs } = require('../presentation/avatar');
const { SETTINGS_SCHEMA } = require('../application/ports');

const PAGE_ID = 'fatigueViewerPage';

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
  + '<path fill="currentColor" d="M64 96h288v64H64zm0 128h224v64H64zm0 128h160v64H64zm336-224 64 64-96 96-64-64z'
  + 'M368 320h80v112h-80z"/></svg>';

// Script exécuté dans la fenêtre du jeu. Chaque appel transmet la langue du jeu (I18n.locale).
const PAGE_SCRIPT = `(function () { try {
  var PLUGIN = 'fatigue-viewer';
  var texts = { settings: '', back: '', loading: '' };
  var showingSettings = false;
  function locale() {
    try { return (typeof I18n !== 'undefined' && I18n && I18n.locale) ? String(I18n.locale) : null; } catch (e) { return null; }
  }
  function invoke() {
    return plugins.invoke.apply(plugins, [PLUGIN].concat(Array.prototype.slice.call(arguments)));
  }
  function el(id) { return document.getElementById(id); }
  function resolveAvatars(node) { ${resolveAvatarsJs('node')} }
  function status(text, isError) {
    var node = el('fv-status');
    if (!node) return;
    node.textContent = text || '';
    node.classList.toggle('is-error', !!isError);
  }
  function load() {
    var content = el('fv-content');
    if (!content) return;
    content.innerHTML = '<div class="loading">' + (texts.loading || '') + '</div>';
    invoke('report-html', locale()).then(function (html) { content.innerHTML = html; resolveAvatars(content); })
      .catch(function (e) { console.error('[fatigue-viewer] rapport', e); });
  }
  function sortTable(table, th) {
    var key = th.getAttribute('data-fv-sort');
    var numeric = th.getAttribute('data-fv-type') === 'number';
    var asc = th.getAttribute('data-fv-dir') !== 'asc';
    table.querySelectorAll('th[data-fv-sort]').forEach(function (h) { h.removeAttribute('data-fv-dir'); });
    th.setAttribute('data-fv-dir', asc ? 'asc' : 'desc');
    var body = table.tBodies[0];
    var rows = Array.prototype.slice.call(body.rows);
    rows.sort(function (a, b) {
      var x = a.getAttribute('data-sort-' + key) || '';
      var y = b.getAttribute('data-sort-' + key) || '';
      var c = numeric ? (Number(x) - Number(y)) : x.localeCompare(y);
      return asc ? c : -c;
    });
    rows.forEach(function (r) { body.appendChild(r); });
  }
  function bindSettings(form) {
    var node = form.querySelector('.fv-settings-status');
    form.addEventListener('change', function (event) {
      var input = event.target;
      var key = input && input.getAttribute ? input.getAttribute('data-fv-setting') : null;
      if (!key) return;
      var value;
      if (input.type === 'checkbox') {
        value = input.checked;
      } else {
        if (input.value === '') return;
        value = Number(input.value);
        if (!isFinite(value)) return;
      }
      invoke('settings-set', key, value).then(function (result) {
        var ok = result && result.ok;
        if (ok) { if (input.type === 'checkbox') { input.checked = result.value; } else { input.value = result.value; } }
        if (node) {
          node.textContent = form.getAttribute(ok ? 'data-fv-saved' : 'data-fv-error');
          node.classList.toggle('is-error', !ok);
        }
      }).catch(function (e) { console.error('[fatigue-viewer] réglage', e); });
    });
  }
  function openLeave(contractId) {
    status('', false);
    invoke('leave-dialog-html', contractId, locale()).then(function (res) {
      if (!res || !res.ok) { status(res ? res.message : '', true); return; }
      var old = el('fvLeaveModal');
      if (old) old.remove();
      document.body.insertAdjacentHTML('beforeend', res.html);
      var modal = el('fvLeaveModal');
      var input = modal.querySelector('#fv-leave-days');
      var ret = modal.querySelector('#fv-leave-return');
      var err = modal.querySelector('#fv-leave-error');
      var confirm = modal.querySelector('#fv-leave-confirm');
      input.addEventListener('input', function () {
        invoke('leave-preview', Number(input.value), locale()).then(function (p) {
          if (p && p.ok) { ret.textContent = p.returnLabel; err.textContent = ''; confirm.classList.remove('disabled'); }
          else { ret.textContent = '—'; err.textContent = p ? p.message : ''; confirm.classList.add('disabled'); }
        }).catch(function (e) { console.error('[fatigue-viewer] aperçu', e); });
      });
      confirm.addEventListener('click', function () {
        if (confirm.classList.contains('disabled')) return;
        confirm.classList.add('disabled');
        invoke('send-on-leave', contractId, Number(input.value), locale()).then(function (r) {
          if (r && r.ok) { closeModal(confirm); status(r.message, false); load(); }
          else { err.textContent = r ? r.message : ''; confirm.classList.remove('disabled'); }
        }).catch(function (e) { console.error('[fatigue-viewer] congé', e); confirm.classList.remove('disabled'); });
      });
      openModal('fvLeaveModal');
    }).catch(function (e) { console.error('[fatigue-viewer] fenêtre congé', e); });
  }
  window.FatigueViewerPage = {
    init: function () {
      var content = el('fv-content');
      var button = el('fv-settings-button');
      if (!content) return;
      var label = button ? button.querySelector('.fv-settings-label') : null;
      showingSettings = false;
      status('', false);
      invoke('page-texts', locale()).then(function (result) {
        if (result) texts = result;
        if (label) label.textContent = texts.settings;
      }).catch(function (e) { console.error('[fatigue-viewer] textes', e); });
      content.onclick = function (event) {
        var th = event.target.closest('th[data-fv-sort]');
        if (th) { sortTable(th.closest('table'), th); return; }
        var leave = event.target.closest('[data-fv-leave]');
        if (leave) openLeave(Number(leave.getAttribute('data-fv-leave')));
      };
      if (button) {
        button.onclick = function () {
          showingSettings = !showingSettings;
          if (label) label.textContent = showingSettings ? texts.back : texts.settings;
          if (!showingSettings) { load(); return; }
          invoke('settings-form-html', locale()).then(function (html) {
            content.innerHTML = html;
            var form = content.querySelector('form.fv-settings');
            if (form) bindSettings(form);
          }).catch(function (e) { console.error('[fatigue-viewer] réglages', e); });
        };
      }
      load();
    }
  };
} catch (e) { console.error('[fatigue-viewer] page', e); } })();`;

const STOP_SCRIPT = "(function () { try { delete window.FatigueViewerPage; var m = document.getElementById('fvLeaveModal'); if (m) m.remove(); } catch (e) {} })();";

function toNumber(value) {
  return value === '' || value === null || value === undefined ? NaN : Number(value);
}

function createFatiguePage({ ui, ipc, queries, leave, settingsEditor, onChange, logger }) {
  function run(script, label) {
    Promise.resolve(ui.executeJS(script)).catch((e) => logger.error(label, e));
  }

  function safe(label, fallback, fn) {
    return (event, ...args) => {
      try {
        return fn(...args);
      } catch (e) {
        logger.error(label, e);
        return fallback(args[args.length - 1]);
      }
    };
  }

  function notify() {
    try { onChange(); } catch (e) { logger.error('onChange', e); }
  }

  const failMessage = (locale) => ({ ok: false, message: errorMessage(locale, 'readFailed') });

  function start() {
    ipc.handle('page-texts', safe('page-texts', () => ({ settings: '', back: '', loading: '' }), (locale) => ({
      settings: t(locale, 'page.settings'),
      back: t(locale, 'page.back'),
      loading: t(locale, 'page.loading'),
    })));
    ipc.handle('report-html', safe('report-html', (locale) => renderReportError('readFailed', locale), (locale) => {
      const result = queries.getReport();
      return result.ok ? renderReport(result.report, locale) : renderReportError(result.reason, locale);
    }));
    ipc.handle('leave-dialog-html', safe('leave-dialog-html', failMessage, (contractId, locale) => {
      const prep = leave.prepare(toNumber(contractId));
      return prep.ok ? { ok: true, html: renderLeaveDialog(prep, locale) } : { ok: false, message: errorMessage(locale, prep.reason) };
    }));
    ipc.handle('leave-preview', safe('leave-preview', failMessage, (days, locale) => {
      const result = leave.preview(toNumber(days));
      return result.ok
        ? { ok: true, returnLabel: formatDate(result.endDate, locale) }
        : { ok: false, message: errorMessage(locale, result.reason) };
    }));
    ipc.handle('send-on-leave', safe('send-on-leave', failMessage, (contractId, days, locale) => {
      const result = leave.send(toNumber(contractId), toNumber(days));
      if (!result.ok) return { ok: false, message: errorMessage(locale, result.reason) };
      notify();
      return { ok: true, message: t(locale, 'leave.done', { date: formatDate(result.endDate, locale) }) };
    }));
    ipc.handle('settings-form-html', safe('settings-form-html', (locale) => renderReportError('readFailed', locale),
      (locale) => renderSettingsForm(SETTINGS_SCHEMA, settingsEditor.getAll(), locale)));
    ipc.handle('settings-set', safe('settings-set', () => ({ ok: false }), (key, value) => {
      const result = settingsEditor.set(key, value);
      if (result.ok) notify();
      return result;
    }));
    ui.addPage({
      id: PAGE_ID,
      title: 'Fatigue Viewer',
      backButton: 'mainOfficePage',
      initFunction: 'FatigueViewerPage',
      html: renderPageShell(),
    });
    ui.addSideMenuItem({ pageId: PAGE_ID, label: 'Fatigue Viewer', section: 'bottom', svgIcon: ICON });
    run(PAGE_SCRIPT, 'fatiguePage.start');
  }

  return {
    start,
    stop() { run(STOP_SCRIPT, 'fatiguePage.stop'); },
    reinject() { run(PAGE_SCRIPT, 'fatiguePage.reinject'); },
  };
}

module.exports = { createFatiguePage, PAGE_ID, PAGE_SCRIPT, STOP_SCRIPT };
