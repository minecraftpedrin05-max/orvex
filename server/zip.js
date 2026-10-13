'use strict';
// Gerador de ZIP simples, sem dependências (usa zlib do Node).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = zlib.crc32 ? (b) => zlib.crc32(b) >>> 0 : (b) => {
  let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;
};

function dosTime(d) {
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  };
}

/** entries: [{name:'pasta/arquivo.txt', data:Buffer, mtime:Date}] */
function buildZip(entries) {
  const locals = []; const centrals = []; let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name.replace(/\\/g, '/'), 'utf8');
    const raw = e.data; const comp = zlib.deflateRawSync(raw);
    const useDeflate = comp.length < raw.length; const body = useDeflate ? comp : raw;
    const crc = crc32(raw); const { time, date } = dosTime(e.mtime || new Date());
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(useDeflate ? 8 : 0, 8); lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(useDeflate ? 8 : 0, 10); ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(e.dir ? 0x10 : 0, 38); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += lh.length + name.length + body.length;
  }
  const cdSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

const SKIP = new Set(['node_modules', '.git']);

/** Lê uma pasta (recursivo, com limites) e devolve a lista de arquivos. */
function collect(dir, base, out, limits) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) { collect(full, base, out, limits); continue; }
    if (!ent.isFile()) continue;
    const st = fs.statSync(full);
    limits.total += st.size; limits.count++;
    if (limits.total > limits.maxBytes || limits.count > limits.maxFiles) throw Object.assign(new Error('Pasta grande demais para baixar'), { status: 413 });
    out.push({ name: limits.flat ? path.relative(base, full) : path.join(path.basename(base), path.relative(base, full)), data: fs.readFileSync(full), mtime: st.mtime });
  }
}

function zipFolder(dir, maxBytes = 200 * 1024 * 1024, maxFiles = 5000, flat = false) {
  const out = []; collect(dir, dir, out, { total: 0, count: 0, maxBytes, maxFiles, flat });
  if (!out.length) out.push({ name: path.basename(dir) + '/', data: Buffer.alloc(0), dir: true });
  return buildZip(out);
}

module.exports = { buildZip, zipFolder };
