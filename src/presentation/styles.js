'use strict';

// Styles du plugin : uniquement les variables CSS du thème du jeu (pas de couleurs en dur hors niveaux de risque).
const FATIGUE_VIEWER_CSS = `
.fv-page { padding: 12px; color: var(--color-0); }
.fv-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.fv-status { color: var(--color-2); }
.fv-status.is-error, .fv-error { color: var(--alert); }
.fv-section { margin-bottom: 18px; background: var(--background-1); border: var(--panel-border);
  border-radius: var(--panel-radius); box-shadow: var(--panel-shadow); padding: 10px; }
.fv-section h3 { margin: 0 0 8px; }
.fv-count { color: var(--color-2); font-weight: normal; }
.fv-table { width: 100%; border-collapse: collapse; }
.fv-table th { background: var(--table-header); color: var(--table-header-text); text-align: left; padding: 6px; }
.fv-table th[data-fv-dir="asc"]::after { content: ' ▲'; }
.fv-table th[data-fv-dir="desc"]::after { content: ' ▼'; }
.fv-table td { padding: 6px; vertical-align: middle; }
.fv-table tbody tr:nth-child(odd) { background: var(--table-row-odd); }
.fv-table tbody tr:nth-child(even) { background: var(--table-row-even); }
.fv-bar { display: inline-block; width: 90px; height: 8px; background: var(--background-3);
  border-radius: 4px; overflow: hidden; vertical-align: middle; margin-right: 6px; }
.fv-bar-fill { height: 100%; }
.fv-bar-fill.fv-level-low { background: var(--positive-effect); }
.fv-bar-fill.fv-level-medium { background: #e0a030; }
.fv-bar-fill.fv-level-high { background: var(--negative-effect); }
.fv-badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 0.85em; color: #fff; }
.fv-badge.fv-level-low { background: var(--positive-effect); }
.fv-badge.fv-level-medium { background: #e0a030; }
.fv-badge.fv-level-high { background: var(--negative-effect); }
.fv-risk { color: var(--color-2); }
.fv-trait { display: inline-block; padding: 1px 6px; margin: 1px; border-radius: 8px; font-size: 0.8em;
  background: var(--background-3); color: var(--color-1); }
.fv-trait-robust { color: var(--positive-effect); }
.fv-identity { display: flex; align-items: center; gap: 8px; }
.fv-avatar { flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; display: inline-flex;
  align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
  background: var(--background-3); color: var(--color-1); border: 1px solid var(--color-2); box-sizing: border-box; }
.fv-avatar img { width: 100%; height: 100%; object-fit: cover; }
.fv-leave-button { padding: 2px 10px; }
.fv-table tr.fv-row-link { cursor: pointer; }
.fv-table tr.fv-row-link:hover td { background: color-mix(in srgb, var(--m-tint, #fff) 4%, transparent); }
.fv-hint { color: var(--color-2); }
.fv-settings .fv-setting-help { display: block; color: var(--color-2); font-size: 0.85em; }
.fv-settings-status { min-height: 1.2em; color: var(--positive-effect); }
.fv-settings-status.is-error { color: var(--alert); }
#mainOfficePage .fv-office { display: flex; flex-direction: column; gap: 4px; }
#mainOfficePage .fv-office-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; }
#mainOfficePage .fv-office-row > .fv-avatar { width: 36px; height: 36px; }
#mainOfficePage .fv-office-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
#mainOfficePage .mainOfficeGrid:not(.isEditing) .fv-office-title { cursor: pointer; }
#mainOfficePage .mainOfficeGrid:not(.isEditing) .fv-office-title:hover { color: var(--m-accent); }
#mainOfficePage .fv-office-row { cursor: pointer; }
#mainOfficePage .fv-office-row:hover { background: color-mix(in srgb, var(--m-tint) 3%, transparent); }
#mainOfficePage .fv-office-top { display: flex; align-items: center; gap: 8px; }
#mainOfficePage .fv-office-name { flex: 1 1 auto; min-width: 0; font-weight: 600; color: var(--m-fg);
  font-size: var(--font-size-m); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#mainOfficePage .fv-office-top .fv-badge { flex-shrink: 0; }
#mainOfficePage .panelContents.fv-office .fv-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
#mainOfficePage .fv-office-meta { color: var(--m-fg-2); font-size: var(--font-size-sm); }
#mainOfficePage .fv-office-more { padding: 4px 10px; text-align: right; color: var(--m-fg-muted); font-size: var(--font-size-sm); }
#mainOfficePage .fv-office-empty { padding: 8px 10px; color: var(--m-fg-muted); }
`;

module.exports = { FATIGUE_VIEWER_CSS };
