'use strict';
const { t } = require('./i18n');
const { escapeHtml } = require('./format');

// Initiales affichées tant que la photo n'est pas chargée (ou si le catcheur n'en a pas).
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (!parts.length) return '?';
  const text = parts.length === 1
    ? parts[0].slice(0, 2)
    : parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  return text.toUpperCase();
}

/** Pastille ronde : initiales, et les noms de fichiers que le jeu sait convertir en image. */
function renderAvatar(worker, locale) {
  return `<span class="fv-avatar" role="img" aria-label="${escapeHtml(t(locale, 'avatar.photoOf', { name: worker.name }))}"`
    + ` data-fv-picture="${escapeHtml(worker.picture)}" data-fv-contract-picture="${escapeHtml(worker.contractPicture)}">`
    + `${escapeHtml(initials(worker.name))}</span>`;
}

// Script du renderer : remplace les initiales par la photo quand le jeu en a une
// (Game.getContractImage, comme ses propres écrans ; repris de MatchImpact).
function resolveAvatarsJs(rootExpr) {
  return `(function (root) {
  try {
    if (!root || typeof Game === 'undefined' || !Game || typeof Game.getContractImage !== 'function') return;
    var fallback = typeof Game._getFallbackImage === 'function' ? Game._getFallbackImage('people') : null;
    var avatars = root.querySelectorAll('.fv-avatar[data-fv-picture]');
    Array.prototype.forEach.call(avatars, function (avatar) {
      var picture = avatar.getAttribute('data-fv-picture') || '';
      var contractPicture = avatar.getAttribute('data-fv-contract-picture') || '';
      if (!picture && !contractPicture) return;
      var src = Game.getContractImage(contractPicture, picture);
      if (!src || src === fallback) return;
      var img = document.createElement('img');
      img.alt = '';
      img.onload = function () { avatar.textContent = ''; avatar.appendChild(img); };
      img.src = src;
    });
  } catch (e) {}
})(${rootExpr});`;
}

module.exports = { initials, renderAvatar, resolveAvatarsJs };
