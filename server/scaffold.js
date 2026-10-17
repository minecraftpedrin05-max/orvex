'use strict';
// Acabamento dos projetos gerados pela IA: confere a sintaxe e completa o que costuma faltar
// (.gitignore, .env.example, requirements.txt, package.json, README). Não usa o modelo, então é de graça.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PY_PKG = { discord: 'discord.py>=2.3', dotenv: 'python-dotenv>=1.0', requests: 'requests>=2.31', aiohttp: 'aiohttp>=3.9', flask: 'flask>=3.0', fastapi: 'fastapi>=0.110', uvicorn: 'uvicorn>=0.29', pygame: 'pygame>=2.5', PIL: 'pillow>=10.0', numpy: 'numpy>=1.26', pandas: 'pandas>=2.1', telebot: 'pyTelegramBotAPI>=4.16', bs4: 'beautifulsoup4>=4.12', yaml: 'pyyaml>=6.0', flask_cors: 'flask-cors>=4.0', sqlalchemy: 'sqlalchemy>=2.0', aiosqlite: 'aiosqlite>=0.19' };
const NODE_BUILTIN = new Set(['fs', 'path', 'os', 'http', 'https', 'url', 'crypto', 'util', 'events', 'stream', 'child_process', 'readline', 'zlib', 'net', 'assert', 'buffer', 'querystring', 'timers', 'worker_threads', 'node:fs', 'node:path', 'node:http', 'node:https', 'node:crypto', 'node:os', 'node:sqlite', 'node:test', 'node:util', 'node:events', 'node:url', 'node:readline', 'node:child_process', 'node:stream', 'node:zlib', 'node:assert']);
const NODE_VER = { 'discord.js': '^14.14.1', dotenv: '^16.4.5', express: '^4.19.2', axios: '^1.7.2', cors: '^2.8.5', 'node-fetch': '^3.3.2', 'better-sqlite3': '^11.1.2', 'socket.io': '^4.7.5', ws: '^8.17.0', 'telegraf': '^4.16.3', mongoose: '^8.4.0' };

const ext = (p) => (path.extname(p) || '').toLowerCase();

function tmpCheck(name, content, cmd, args) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ovx-'));
  try {
    const f = path.join(dir, path.basename(name)); fs.writeFileSync(f, content);
    const r = spawnSync(cmd, [...args, f], { encoding: 'utf8', timeout: 8000 });
    if (r.error) return null; // ferramenta não existe: não bloqueia
    return r.status === 0 ? null : String(r.stderr || r.stdout || 'erro de sintaxe').replace(new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '.').trim().slice(-600);
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* */ } }
}

/** Retorna a mensagem de erro de sintaxe do arquivo, ou null se estiver ok / não dá para checar. */
function syntaxError(name, content) {
  const e = ext(name);
  if (e === '.json') { try { JSON.parse(content); return null; } catch (x) { return 'JSON inválido: ' + x.message; } }
  if (e === '.py') return tmpCheck(name, content, 'python3', ['-I', '-m', 'py_compile']);
  if (e === '.js' || e === '.cjs' || e === '.mjs') return tmpCheck(name, content, process.execPath, ['--check']);
  return null;
}

// Palavras de variáveis de ambiente usadas no código.
function envNames(files) {
  const set = new Set();
  for (const f of files) {
    const c = f.content;
    for (const m of c.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) set.add(m[1]);
    for (const m of c.matchAll(/(?:os\.getenv|os\.environ\.get|os\.environ\[)\s*\(?\s*['"]([A-Z][A-Z0-9_]+)['"]/g)) set.add(m[1]);
  }
  return [...set];
}

function pyImports(files) {
  const mods = new Set();
  for (const f of files) if (ext(f.path) === '.py') for (const m of f.content.matchAll(/^\s*(?:from|import)\s+([A-Za-z_][\w]*)/gm)) mods.add(m[1]);
  return mods;
}
function nodeRequires(files) {
  const mods = new Set();
  for (const f of files) if (/\.(c|m)?js$/.test(f.path)) {
    for (const m of f.content.matchAll(/require\(\s*['"]([^'".][^'"]*)['"]\s*\)/g)) mods.add(m[1]);
    for (const m of f.content.matchAll(/from\s+['"]([^'".][^'"]*)['"]/g)) mods.add(m[1]);
  }
  return [...mods].map((m) => (m.startsWith('@') ? m.split('/').slice(0, 2).join('/') : m.split('/')[0])).filter((m) => !NODE_BUILTIN.has(m) && !NODE_BUILTIN.has('node:' + m));
}

/** Completa o que falta. `files` = [{path, content}] no mesmo projeto (pasta raiz = primeira parte do caminho). */
function complete(files) {
  const added = [];
  const roots = new Map();
  for (const f of files) { const i = f.path.indexOf('/'); if (i > 0) { const r = f.path.slice(0, i); (roots.get(r) || roots.set(r, []).get(r)).push({ path: f.path.slice(i + 1), content: f.content }); } }
  for (const [root, fs_] of roots) {
    if (fs_.length < 2) continue; // arquivo solto não precisa de acabamento
    const has = (n) => fs_.some((f) => f.path.toLowerCase() === n);
    const add = (n, c) => { files.push({ path: root + '/' + n, content: c }); fs_.push({ path: n, content: c }); added.push(root + '/' + n); };
    const isPy = fs_.some((f) => ext(f.path) === '.py'); const isNode = fs_.some((f) => /\.(c|m)?js$/.test(f.path)) && !fs_.some((f) => ext(f.path) === '.html' && !fs_.some((g) => /server|index\.js|app\.js/.test(g.path)));
    const env = envNames(fs_);
    if (env.length && !has('.env.example') && !has('.env')) add('.env.example', env.map((n) => n + '=').join('\n') + '\n');
    if (!has('.gitignore') && (isPy || isNode || env.length)) add('.gitignore', ['.env', 'node_modules/', '__pycache__/', '*.pyc', '.venv/', 'data/*.db', ''].join('\n'));
    if (isPy && !has('requirements.txt')) {
      const pk = [...pyImports(fs_)].map((m) => PY_PKG[m]).filter(Boolean); if (env.length && !pk.includes(PY_PKG.dotenv)) pk.push(PY_PKG.dotenv);
      if (pk.length) add('requirements.txt', [...new Set(pk)].join('\n') + '\n');
    }
    if (isNode && !has('package.json')) {
      const deps = {}; for (const m of nodeRequires(fs_)) deps[m] = NODE_VER[m] || 'latest'; if (env.length && !deps.dotenv) deps.dotenv = NODE_VER.dotenv;
      const main = (fs_.find((f) => /^(index|main|bot|app|server)\.js$/.test(f.path)) || fs_.find((f) => /\.js$/.test(f.path)) || { path: 'index.js' }).path;
      add('package.json', JSON.stringify({ name: root.toLowerCase().replace(/[^a-z0-9-]/g, '-'), version: '1.0.0', main, scripts: { start: 'node ' + main }, dependencies: deps }, null, 2) + '\n');
    }
    if (!has('readme.md') && (isPy || isNode)) {
      const run = isPy ? `pip install -r requirements.txt\npython ${(fs_.find((f) => /^(main|bot|app|run)\.py$/.test(f.path)) || { path: 'main.py' }).path}` : 'npm install\nnpm start';
      const envStep = env.length ? '1. Copie `.env.example` para `.env` e preencha: ' + env.map((n) => '`' + n + '`').join(', ') + '.\n2. ' : '1. ';
      add('README.md', `# ${root}\n\n## Como rodar\n\n${envStep}Instale e rode:\n\n\`\`\`\n${run}\n\`\`\`\n`);
    }
  }
  return added;
}

/** Avisos que valem a pena (token escrito no código, biblioteca morta). */
function warnings(files) {
  const w = [];
  for (const f of files) {
    if (/discord_slash|discord-py-slash-command|discord_components/.test(f.content)) w.push(f.path + ': biblioteca de discord antiga que não funciona mais');
    if (/(\.run|login|Client)\(\s*['"][A-Za-z0-9_\-.]{25,}['"]/.test(f.content)) w.push(f.path + ': token escrito no código');
  }
  return w;
}

module.exports = { syntaxError, complete, warnings, envNames };
