'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderLeaveDialog, LEAVE_MODAL_ID } = require('../../src/presentation/leaveDialogHtml');

const PREP = { ok: true, contractId: 13100, name: 'Celine <Faery>', fatigue: 50, suggestedDays: 17, endDate: '2026-09-05' };

test('fenêtre de congé au format des modales du jeu', () => {
  const html = renderLeaveDialog(PREP, 'fr');
  assert.equal(LEAVE_MODAL_ID, 'fvLeaveModal');
  assert.match(html, /class="modalContainer" style="display:none" id="fvLeaveModal" data-plugin-id="fatigue-viewer"/);
  assert.match(html, /class="modal smallModal"/);
  assert.match(html, /Envoyer Celine &lt;Faery&gt; en congé/);
  assert.match(html, /id="fv-leave-days" min="1" max="90" step="1" value="17"/);
  assert.match(html, /id="fv-leave-return">5 septembre 2026</);
  assert.match(html, /Suggestion : 17 jours pour récupérer complètement\./);
  assert.match(html, /id="fv-leave-error"/);
  assert.match(html, /id="fv-leave-confirm" data-fv-contract="13100">Confirmer</);
  assert.match(html, /secondaryButton" onclick="closeModal\(this\)">Annuler</);
});
