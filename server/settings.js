'use strict';
// Configurações da IA mudáveis pelo app (sem editar o .env). Ficam em data/settings.json e valem na hora.
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { q } = require('./db');

const FILE = path.join(cfg.dataDir, 'settings.json');
const MASK = '••••••••';

// id -> { path no cfg, tipo, grupo }
const FIELDS = [
  { id: 'modelBase', path: 'modelBase', type: 'url', group: 'model' },
  { id: 'modelKey', path: 'modelKey', type: 'secret', group: 'model', empty: true },
  { id: 'm_fast', path: 'models.fast', type: 'name', group: 'model' },
  { id: 'm_mid', path: 'models.mid', type: 'name', group: 'model' },
  { id: 'm_slow', path: 'models.slow', type: 'name', group: 'model' },
  { id: 'simple', path: 'simpleFiles', type: 'bool', group: 'code' },
  { id: 'c_fast', path: 'codeModels.fast', type: 'name', group: 'code' },
  { id: 'c_mid', path: 'codeModels.mid', type: 'name', group: 'code' },
  { id: 'c_slow', path: 'codeModels.slow', type: 'name', group: 'code' },
  { id: 'vision', path: 'visionModel', type: 'name', group: 'vision', empty: true },
  { id: 'i_url', path: 'image.baseUrl', type: 'url', group: 'image', empty: true },
  { id: 'i_api', path: 'image.api', type: 'enum', options: ['a1111', 'openai'], group: 'image' },
  { id: 'i_model', path: 'image.model', type: 'name', group: 'image', empty: true },
  { id: 'i_size', path: 'image.size', type: 'num', min: 256, max: 1024, group: 'image' },
  { id: 'i_steps', path: 'image.steps', type: 'num', min: 1, max: 100, group: 'image' },
  { id: 'i_cfg', path: 'image.cfg', type: 'num', min: 0, max: 30, group: 'image' },
  { id: 'i_limit', path: 'image.dailyLimit', type: 'num', min: 0, max: 1000, group: 'image' },
  { id: 'exec', path: 'exec', type: 'enum', options: ['off', 'docker', 'local'], group: 'terminal' },
  { id: 'dockerImage', path: 'dockerImage', type: 'name', group: 'terminal' },
  { id: 'execNet', path: 'execNetwork', type: 'name', group: 'terminal' },
  { id: 'privUrls', path: 'allowPrivateUrls', type: 'bool', group: 'limits' },
  { id: 'dailyLimit', path: 'dailyLimit', type: 'num', min: 1, max: 100000, group: 'limits' },
];

const get = (o, p) => p.split('.').reduce((a, k) => a[k], o);
const set = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const DEFAULTS = Object.fromEntries(FIELDS.map((f) => [f.id, get(cfg, f.path)]));

function bad(msg) { const e = new Error(msg); e.status = 400; e.code = 'bad'; return e; }

function clean(f, v) {
  if (f.type === 'bool') return v === true || v === 'true' || v === 1;
  if (f.type === 'num') { const n = Number(v); if (!Number.isFinite(n) || n < f.min || n > f.max) throw bad(`${f.id}: valor entre ${f.min} e ${f.max}`); return n; }
  if (f.type === 'enum') { if (!f.options.includes(v)) throw bad(`${f.id}: opção inválida`); return v; }
  const s = String(v == null ? '' : v).trim();
  if (!s) { if (f.empty) return ''; throw bad(`${f.id}: não pode ficar vazio`); }
  if (s.length > 300) throw bad(`${f.id}: grande demais`);
  if (f.type === 'secret') return s;
  if (f.type === 'url') { try { const u = new URL(s); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { throw bad(`${f.id}: endereço inválido (use http:// ou https://)`); } return s.replace(/\/$/, ''); }
  if (f.type === 'name') { if (/[\s"'<>]/.test(s) && f.id !== 'dockerImage') throw bad(`${f.id}: nome inválido`); return s.toLowerCase() === 'off' && f.id === 'vision' ? '' : s; }
  return s;
}

function apply(saved) {
  for (const f of FIELDS) if (f.id in saved) set(cfg, f.path, saved[f.id]);
}
function readFile() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } }
apply(readFile());

function view() {
  return FIELDS.map((f) => {
    const v = get(cfg, f.path);
    return { id: f.id, group: f.group, type: f.type, options: f.options, value: f.type === 'secret' ? (v ? MASK : '') : v, def: f.type === 'secret' ? '' : DEFAULTS[f.id] };
  });
}

function save(patch) {
  if (!patch || typeof patch !== 'object') throw bad('pedido inválido');
  const next = { ...readFile() };
  for (const [id, raw] of Object.entries(patch)) {
    const f = FIELDS.find((x) => x.id === id); if (!f) continue;
    if (f.type === 'secret' && raw === MASK) continue;
    next[id] = clean(f, raw);
  }
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
  apply(next);
  return view();
}

function reset() {
  try { fs.unlinkSync(FILE); } catch {}
  for (const f of FIELDS) set(cfg, f.path, DEFAULTS[f.id]);
  return view();
}

/** Dono do servidor: o primeiro a entrar, ou o e-mail em ADMIN_EMAIL. */
function isAdmin(u) {
  const a = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (a) return u.email.toLowerCase() === a;
  const r = q.one('SELECT MIN(id) AS m FROM users'); return !!r && r.m === u.id;
}

/** Lista modelos que o servidor de modelos tem (API /models, que o Ollama também tem). */
async function listModels() {
  if (cfg.provider === 'mock') return ['mock'];
  const h = cfg.modelKey ? { Authorization: 'Bearer ' + cfg.modelKey } : {};
  let r;
  try { r = await fetch(cfg.modelBase.replace(/\/$/, '') + '/models', { headers: h, signal: AbortSignal.timeout(6000) }); }
  catch { throw Object.assign(new Error('Não consegui falar com o servidor de modelos (' + cfg.modelBase + ').'), { status: 424 }); }
  if (!r.ok) throw Object.assign(new Error('O servidor de modelos respondeu ' + r.status), { status: 424 });
  const j = await r.json();
  return ((j && j.data) || []).map((m) => m.id).filter(Boolean).sort();
}

module.exports = { view, save, reset, isAdmin, listModels };
