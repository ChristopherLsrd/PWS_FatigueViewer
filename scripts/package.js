'use strict';
// Prépare le plugin pour une release GitHub et le Steam Workshop :
//   dist/fatigue-viewer/            dossier propre (ce que le jeu charge, rien d'autre)
//   dist/fatigue-viewer-<v>.zip     même contenu, sous fatigue-viewer/
// Usage : npm run package
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const PLUGIN_ID = 'fatigue-viewer';
const ROOT_FILES = ['plugin.json', 'index.js', 'README.md'];

function walk(dir, base) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const rel = `${base}/${entry.name}`;
      if (entry.isDirectory()) return walk(path.join(dir, entry.name), rel);
      return entry.name.endsWith('.js') ? [rel] : [];
    });
}

/** Chemins relatifs (séparateur /) des fichiers à livrer. */
function packageFiles(root) {
  return [...ROOT_FILES, ...walk(path.join(root, 'src'), 'src')];
}

// --- Zip minimal (deflate, sans dépendance) ---
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1; // 1980-01-01 : zip reproductible

function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // noms en UTF-8
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function main() {
  const root = path.join(__dirname, '..');
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
  const dist = path.join(root, 'dist');
  const folder = path.join(dist, PLUGIN_ID);
  fs.rmSync(dist, { recursive: true, force: true });
  const entries = packageFiles(root).map((rel) => {
    const data = fs.readFileSync(path.join(root, rel));
    fs.mkdirSync(path.dirname(path.join(folder, rel)), { recursive: true });
    fs.writeFileSync(path.join(folder, rel), data);
    return { name: `${PLUGIN_ID}/${rel}`, data };
  });
  const zipPath = path.join(dist, `${PLUGIN_ID}-${version}.zip`);
  fs.writeFileSync(zipPath, buildZip(entries));
  console.log(`${entries.length} fichiers -> ${path.relative(root, folder)}/ et ${path.relative(root, zipPath)}`);
}

if (require.main === module) main();

module.exports = { packageFiles, buildZip, PLUGIN_ID };
