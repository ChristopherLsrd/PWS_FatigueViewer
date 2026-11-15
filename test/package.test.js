'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const zlib = require('node:zlib');
const { packageFiles, buildZip, PLUGIN_ID } = require('../scripts/package');

const ROOT = path.join(__dirname, '..');

test('le paquet ne contient que ce que le jeu charge', () => {
  const files = packageFiles(ROOT);
  assert.equal(PLUGIN_ID, 'fatigue-viewer');
  for (const f of ['plugin.json', 'index.js', 'README.md', 'src/domain/injuryRisk.js', 'src/presentation/locales/fr.js']) {
    assert.ok(files.includes(f), f);
  }
  for (const f of files) {
    assert.match(f, /^(plugin\.json|index\.js|README\.md|src\/.+\.js)$/, f);
  }
});

test('plugin.json et package.json annoncent la même version', () => {
  const manifest = require('../plugin.json');
  const pkg = require('../package.json');
  assert.equal(manifest.id, PLUGIN_ID);
  assert.equal(manifest.version, pkg.version);
});

// Relit le répertoire central du zip produit : noms, contenus décompressés.
function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(local + 26);
    const lelen = buf.readUInt16LE(local + 28);
    const data = buf.subarray(local + 30 + lnlen + lelen, local + 30 + lnlen + lelen + csize);
    const raw = method === 8 ? zlib.inflateRawSync(data) : data;
    assert.equal(zlib.crc32(raw), crc, name);
    out[name] = raw.toString('utf8');
    p += 46 + nlen + elen + clen;
  }
  return out;
}

test('le zip range tout sous fatigue-viewer/ avec des contenus intacts', () => {
  const zip = buildZip([
    { name: 'fatigue-viewer/plugin.json', data: Buffer.from('{"id":"fatigue-viewer"}') },
    { name: 'fatigue-viewer/src/a é.js', data: Buffer.from('x'.repeat(5000)) },
  ]);
  const entries = readZip(zip);
  assert.deepEqual(Object.keys(entries), ['fatigue-viewer/plugin.json', 'fatigue-viewer/src/a é.js']);
  assert.equal(entries['fatigue-viewer/plugin.json'], '{"id":"fatigue-viewer"}');
  assert.equal(entries['fatigue-viewer/src/a é.js'], 'x'.repeat(5000));
});
