'use strict';
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const cfg = require('./config');
const { q } = require('./db');

/* ---------- espaço de trabalho (pasta da IA) ---------- */
function wsDir(userId, chat) {
  const key = chat.project_id ? 'p-' + chat.project_id : 'c-' + chat.id;
  const dir = path.join(cfg.dataDir, 'ws', String(userId), key);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const bad = (m) => Object.assign(new Error(m), { status: 400 });
function safePath(ws, rel) {
  rel = String(rel || '.').replace(/\\/g, '/');
  if (rel.includes('\0')) throw bad('Caminho inválido');
  const full = path.resolve(ws, rel);
  if (full !== ws && !full.startsWith(ws + path.sep)) throw bad('Caminho fora da pasta de trabalho');
  // Confere links simbólicos: o caminho real do trecho existente precisa continuar dentro da pasta.
  let probe = full;
  while (!fs.existsSync(probe) && probe !== ws) probe = path.dirname(probe);
  const real = fs.realpathSync(probe); const realWs = fs.realpathSync(ws);
  if (real !== realWs && !real.startsWith(realWs + path.sep)) throw bad('Caminho fora da pasta de trabalho');
  return full;
}

/* ---------- proteção contra acesso à rede interna ---------- */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = ip.toLowerCase();
  if (s.startsWith('::ffff:')) return isPrivateIp(s.slice(7));
  return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80');
}
async function assertPublicUrl(u) {
  const url = new URL(u);
  if (!/^https?:$/.test(url.protocol)) throw new Error('Só http e https são permitidos');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || (!cfg.allowPrivateUrls && addrs.some((a) => isPrivateIp(a.address)))) throw new Error('Endereço bloqueado (rede interna)');
  return url;
}
const stripHtml = (h) => h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n) + `\n... (cortado, ${s.length - n} caracteres a mais)` : s);

async function httpRequest({ url, method = 'GET', headers = {}, body }, signal) {
  let cur = url;
  for (let i = 0; i < 5; i++) {
    const u = await assertPublicUrl(cur);
    const r = await fetch(u, {
      method, redirect: 'manual', signal,
      headers: { 'User-Agent': 'ORVEX/1.0', ...headers },
      body: body && !/^(GET|HEAD)$/i.test(method) ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { cur = new URL(r.headers.get('location'), u).href; continue; }
    const buf = Buffer.from(await r.arrayBuffer()).subarray(0, 1_000_000);
    const ct = r.headers.get('content-type') || '';
    let text = buf.toString('utf8');
    if (/html/i.test(ct)) text = stripHtml(text);
    return { status: r.status, type: ct, text };
  }
  throw new Error('Redirecionamentos demais');
}

/* ---------- terminal ---------- */
function runCommand(ctx, command, timeoutMs) {
  return new Promise((resolve) => {
    if (cfg.exec === 'off') return resolve('ERRO: o terminal está desativado neste servidor (EXEC_MODE=off).');
    const name = 'orvex-' + crypto.randomBytes(5).toString('hex');
    let child;
    if (cfg.exec === 'docker') {
      child = spawn('docker', ['run', '--rm', '-i', '--name', name, '--network', cfg.execNetwork, '--memory', '1g', '--cpus', '1', '--pids-limit', '256',
        '-v', `${ctx.ws}:/work`, '-w', '/work', cfg.dockerImage, 'sh', '-c', command], { detached: true });
    } else {
      child = spawn('sh', ['-c', command], { cwd: ctx.ws, detached: true, env: { PATH: process.env.PATH, HOME: ctx.ws, LANG: 'C.UTF-8', TERM: 'dumb' } });
    }
    let out = ''; let done = false; let timedOut = false;
    const add = (d) => { if (out.length < 40000) out += d.toString('utf8'); };
    child.stdout.on('data', add); child.stderr.on('data', add);
    const kill = () => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
      if (cfg.exec === 'docker') spawnSync('docker', ['kill', name], { timeout: 5000 });
    };
    const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    const onAbort = () => kill();
    ctx.signal.addEventListener('abort', onAbort, { once: true });
    const finish = (code) => {
      if (done) return; done = true; clearTimeout(timer); ctx.signal.removeEventListener('abort', onAbort);
      const tail = timedOut ? `\n[tempo esgotado depois de ${Math.round(timeoutMs / 1000)}s]` : `\n[código de saída: ${code}]`;
      resolve(clip(out, 12000) + tail);
    };
    child.on('error', (e) => finish('erro: ' + e.message));
    child.on('close', (code) => finish(code));
  });
}

/* ---------- navegador (captura de tela) ---------- */
function findChrome() {
  if (cfg.chromeBin) return cfg.chromeBin;
  for (const b of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    const r = spawnSync('sh', ['-c', `command -v ${b}`], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return '';
}
function chromeRun(bin, args, timeout) {
  return new Promise((resolve) => {
    const c = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let out = '';
    c.stdout.on('data', (d) => { if (out.length < 3_000_000) out += d; });
    const t = setTimeout(() => c.kill('SIGKILL'), timeout);
    c.on('close', () => { clearTimeout(t); resolve(out); });
    c.on('error', () => { clearTimeout(t); resolve(''); });
  });
}

/* ---------- definição das ferramentas ---------- */
const DEFS = {
  run_command: { description: 'Executa um comando no terminal, dentro da pasta de trabalho. Use para instalar, rodar, testar e compilar.', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
  write_file: { description: 'Cria ou sobrescreve um arquivo (cria as pastas que faltarem). Caminho relativo à pasta de trabalho.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  read_file: { description: 'Lê um arquivo de texto da pasta de trabalho.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  list_files: { description: 'Lista arquivos e pastas da pasta de trabalho.', parameters: { type: 'object', properties: { path: { type: 'string' } } } },
  present: { description: 'Mostra ao usuário um arquivo ou pasta pronto, como um cartão com botão de instalar e de ver arquivos. Chame no final para entregar o que foi criado.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  web_search: { description: 'Pesquisa na internet e devolve títulos, links e trechos.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  fetch_url: { description: 'Acessa um site ou API (GET, POST, etc.) e devolve o texto da resposta. Serve para conectar em sites e serviços.', parameters: { type: 'object', properties: { url: { type: 'string' }, method: { type: 'string' }, headers: { type: 'object' }, body: { type: 'string' } }, required: ['url'] } },
  browse: { description: 'Abre uma página no navegador, tira uma captura de tela que o usuário vê no chat e devolve o texto da página.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  generate_image: { description: 'Cria uma imagem a partir de uma descrição e mostra ao usuário. Tem limite diário por pessoa. Escreva o prompt em inglês, bem detalhado.', parameters: { type: 'object', properties: { prompt: { type: 'string' }, negative: { type: 'string' }, size: { type: 'number' } }, required: ['prompt'] } },
  connector: { description: 'Usa um conector que o usuário ligou (GitHub, Railway, Netlify, Discord, MCP...). Veja no prompt do sistema quais estão ligados e as ações permitidas.', parameters: { type: 'object', properties: { connector: { type: 'string' }, action: { type: 'string' }, params: { type: 'object' } }, required: ['connector', 'action'] } },
  remember: { description: 'Guarda uma informação útil sobre o usuário ou o trabalho dele para lembrar em conversas futuras.', parameters: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] } },
  recall: { description: 'Busca em conversas passadas e nas anotações guardadas do usuário.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
};
const SETS = {
  fast: ['write_file', 'present', 'web_search', 'generate_image', 'remember', 'recall'],
  mid: ['run_command', 'write_file', 'read_file', 'list_files', 'present', 'web_search', 'fetch_url', 'generate_image', 'connector', 'remember', 'recall'],
  slow: Object.keys(DEFS),
};
function toolList(speed) {
  return (SETS[speed] || SETS.mid).map((n) => ({ type: 'function', function: { name: n, ...DEFS[n] } }));
}

/* ---------- execução ---------- */
async function execTool(name, args, ctx) {
  const timeout = ctx.speed === 'slow' ? 180000 : 90000;
  try {
    switch (name) {
      case 'run_command': {
        ctx.emit({ type: 'status', key: 'run' });
        return await runCommand(ctx, String(args.command || ''), timeout);
      }
      case 'write_file': {
        const full = safePath(ctx.ws, args.path);
        const rel = path.relative(ctx.ws, full);
        if (!rel || rel.startsWith('..')) throw new Error('Caminho inválido');
        const content = String(args.content ?? '');
        if (content.length > 5_000_000) throw new Error('Arquivo grande demais');
        ctx.emit({ type: 'status', key: 'make', arg: rel.split(path.sep)[0] });
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
        return `Arquivo ${rel} salvo (${content.length} caracteres).`;
      }
      case 'read_file': {
        const full = safePath(ctx.ws, args.path);
        if (!fs.statSync(full).isFile()) throw new Error('Não é um arquivo');
        return clip(fs.readFileSync(full, 'utf8'), 20000);
      }
      case 'list_files': {
        const full = safePath(ctx.ws, args.path || '.');
        const lines = [];
        (function walk(d, depth) {
          for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            if (e.name === 'node_modules' || e.name === '.git' || lines.length > 300) continue;
            const f = path.join(d, e.name); lines.push(path.relative(ctx.ws, f) + (e.isDirectory() ? '/' : ''));
            if (e.isDirectory() && depth < 4 && !e.isSymbolicLink()) walk(f, depth + 1);
          }
        })(full, 0);
        return lines.join('\n') || '(vazio)';
      }
      case 'present': {
        const full = safePath(ctx.ws, args.path);
        if (!fs.existsSync(full)) throw new Error('Não existe: ' + args.path);
        const rel = path.relative(ctx.ws, full) || '.';
        ctx.present(rel);
        return 'Entregue ao usuário: ' + rel;
      }
      case 'web_search': {
        ctx.emit({ type: 'status', key: 'work' });
        const r = await fetch('https://html.duckduckgo.com/html/', {
          method: 'POST', signal: ctx.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 ORVEX' },
          body: 'q=' + encodeURIComponent(String(args.query || '')),
        });
        const html = await r.text(); const out = [];
        const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
        let m;
        while ((m = re.exec(html)) && out.length < 6) {
          let href = m[1].replace(/&amp;/g, '&'); const u = href.match(/uddg=([^&]+)/); if (u) href = decodeURIComponent(u[1]);
          out.push(`${stripHtml(m[2])}\n${href}\n${stripHtml(m[3] || '')}`);
        }
        return out.length ? out.join('\n\n') : 'Nenhum resultado.';
      }
      case 'fetch_url': {
        ctx.emit({ type: 'status', key: 'work' });
        const r = await httpRequest({ url: String(args.url), method: String(args.method || 'GET').toUpperCase(), headers: args.headers || {}, body: args.body }, ctx.signal);
        return `HTTP ${r.status} (${r.type})\n` + clip(r.text, 12000);
      }
      case 'browse': {
        ctx.emit({ type: 'status', key: 'work' });
        const bin = findChrome();
        if (!bin) return 'ERRO: não há navegador instalado neste servidor (instale chromium ou defina CHROME_BIN).';
        const url = (await assertPublicUrl(String(args.url))).href;
        const dir = path.join(ctx.ws, 'screens'); fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'tela-' + Date.now() + '.png');
        const base = ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars'];
        await chromeRun(bin, [...base, '--window-size=1280,1600', '--screenshot=' + file, url], 40000);
        const dom = await chromeRun(bin, [...base, '--dump-dom', url], 40000);
        if (fs.existsSync(file)) ctx.present(path.relative(ctx.ws, file), { screenshot: true });
        return clip(stripHtml(dom) || '(sem texto)', 8000);
      }
      case 'generate_image': return await require('./images').generate(ctx, args);
      case 'connector': return await require('./connectors').execute(ctx, args.connector, args.action, args.params);
      case 'remember': {
        const note = String(args.note || '').trim().slice(0, 300);
        if (!note) throw new Error('Nota vazia');
        if (!q.one('SELECT 1 x FROM memory WHERE user_id=? AND note=?', ctx.user.id, note)) {
          q.run('INSERT INTO memory(user_id,note,ts) VALUES(?,?,?)', ctx.user.id, note, Date.now());
          q.run('DELETE FROM memory WHERE user_id=? AND id NOT IN (SELECT id FROM memory WHERE user_id=? ORDER BY id DESC LIMIT 100)', ctx.user.id, ctx.user.id);
        }
        return 'Guardado.';
      }
      case 'recall': {
        const like = '%' + String(args.query || '').replace(/[%_]/g, ' ').trim() + '%';
        const notes = q.all('SELECT note FROM memory WHERE user_id=? AND note LIKE ? ORDER BY id DESC LIMIT 10', ctx.user.id, like).map((r) => '- ' + r.note);
        const msgs = q.all(`SELECT c.title, m.role, m.text, m.ts FROM messages m JOIN chats c ON c.id=m.chat_id
          WHERE c.user_id=? AND m.text LIKE ? ORDER BY m.id DESC LIMIT 8`, ctx.user.id, like)
          .map((r) => `[${new Date(r.ts).toISOString().slice(0, 10)} · ${r.title}] ${r.role === 'user' ? 'Usuário' : 'ORVEX'}: ${clip(r.text.replace(/\s+/g, ' '), 300)}`);
        return [notes.length ? 'Anotações:\n' + notes.join('\n') : '', msgs.length ? 'Conversas:\n' + msgs.join('\n') : ''].filter(Boolean).join('\n\n') || 'Nada encontrado.';
      }
      default: return 'ERRO: ferramenta desconhecida: ' + name;
    }
  } catch (e) {
    return 'ERRO: ' + (e && e.message ? e.message : String(e));
  }
}

module.exports = { wsDir, safePath, toolList, execTool, httpRequest, assertPublicUrl };
