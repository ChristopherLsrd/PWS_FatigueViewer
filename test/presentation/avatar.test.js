'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { initials, renderAvatar, resolveAvatarsJs } = require('../../src/presentation/avatar');

test('initials : première et dernière initiale, ou deux lettres pour un nom seul', () => {
  assert.equal(initials('Celine Faery'), 'CF');
  assert.equal(initials('Gustave Le Brun'), 'GB');
  assert.equal(initials('Amale'), 'AM');
  assert.equal(initials('Celine <Faery>'), 'CF');
  assert.equal(initials('  '), '?');
  assert.equal(initials(null), '?');
});

test('renderAvatar : initiales, nom accessible et fichiers d\'image échappés', () => {
  const html = renderAvatar({ name: 'Lauren Carnall', picture: 'Lauren%20Carnall.png', contractPicture: null }, 'fr');
  assert.equal(html, '<span class="fv-avatar" role="img" aria-label="Photo de Lauren Carnall"'
    + ' data-fv-picture="Lauren%20Carnall.png" data-fv-contract-picture="">LC</span>');
  assert.match(renderAvatar({ name: 'X', picture: '"><b>.png' }, 'en'), /data-fv-picture="&quot;&gt;&lt;b&gt;\.png"/);
});

test('resolveAvatarsJs produit du JavaScript valide qui passe par Game.getContractImage', () => {
  const js = resolveAvatarsJs('root');
  assert.doesNotThrow(() => new Function('root', js));
  assert.match(js, /Game\.getContractImage\(contractPicture, picture\)/);
  assert.match(js, /\.fv-avatar\[data-fv-picture\]/);
});

test('resolveAvatarsJs remplace les initiales par l\'image une fois chargée', () => {
  const avatar = {
    textContent: 'LC', children: [],
    getAttribute: (name) => ({ 'data-fv-picture': 'Lauren.png', 'data-fv-contract-picture': '' }[name]),
    appendChild(child) { this.children.push(child); },
  };
  const root = { querySelectorAll: () => [avatar] };
  const created = [];
  const document = { createElement: () => { const img = {}; created.push(img); return img; } };
  const Game = { getContractImage: (c, p) => `file:///pics/${p}`, _getFallbackImage: () => 'file:///fallback.png' };
  new Function('root', 'document', 'Game', resolveAvatarsJs('root'))(root, document, Game);
  assert.equal(created.length, 1);
  assert.equal(created[0].src, 'file:///pics/Lauren.png');
  created[0].onload();
  assert.equal(avatar.textContent, '');
  assert.deepEqual(avatar.children, [created[0]]);
});

test('resolveAvatarsJs garde les initiales sans image ou avec l\'image par défaut du jeu', () => {
  const avatar = { getAttribute: () => '', appendChild() { throw new Error('ne doit pas être appelé'); } };
  const fallbackAvatar = {
    getAttribute: (name) => (name === 'data-fv-picture' ? 'Missing.png' : ''),
    appendChild() { throw new Error('ne doit pas être appelé'); },
  };
  const root = { querySelectorAll: () => [avatar, fallbackAvatar] };
  const document = { createElement: () => { throw new Error('ne doit pas être appelé'); } };
  const Game = { getContractImage: () => 'file:///fallback.png', _getFallbackImage: () => 'file:///fallback.png' };
  assert.doesNotThrow(() => new Function('root', 'document', 'Game', resolveAvatarsJs('root'))(root, document, Game));
});
