'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./config');
const { q } = require('./db');
const H = require('./http');
const auth = require('./auth');
const tools = require('./tools');
const agent = require('./agent');
const { zipFolder } = require('./zip');
const connectors = require('./connectors');
const settings = require('./settings');

const uid = () => crypto.randomBytes(6).toString('hex');
const ID_RE = /^[a-z0-9]{6,32}$/;
const TYPES = ['site', 'app', 'game', 'bot', 'other'];
const active = new Map(); // chatId -> AbortController

const route = (method, re, fn, opts = {}) => ({ method, re, fn, auth: opts.auth !== false });
const routes = [];
const on = (m, p, fn, o) => routes.push(route(m, new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, o));

function ownChat(user, id) {
  const c = q.one('SELECT * FROM chats WHERE id=? AND user_id=?', String(id), user.id);
  if (!c) throw auth.fail(404, 'Chat não encontrado');
  return c;
}

/* ---------- config e login ---------- */
on('GET', '/api/config', (ctx) => H.json(ctx.res, 200, { googleClientId: cfg.googleClientId || null, githubEnabled: !!(cfg.githubClientId && cfg.githubClientSecret), minAge: cfg.minAge }), { auth: false });

on('POST', '/api/auth/request', async (ctx) => {
  const b = await H.readJson(ctx.req); const r = await auth.requestCode(b.email, ctx.ip);
  H.json(ctx.res, 200, { ok: true, ...r });
}, { auth: false });

on('POST', '/api/auth/verify', async (ctx) => {
  const b = await H.readJson(ctx.req); H.json(ctx.res, 200, auth.verifyCode(b.email, b.code, ctx.ip));
}, { auth: false });

on('POST', '/api/auth/google', async (ctx) => {
  auth.limit('g:' + ctx.ip, 30, 3600e3);
  const b = await H.readJson(ctx.req); H.json(ctx.res, 200, await auth.googleLogin(b.credential));
}, { auth: false });

on('POST', '/api/auth/profile', async (ctx) => {
  const b = await H.readJson(ctx.req); H.json(ctx.res, 200, { user: auth.setProfile(ctx.user, b) });
});
on('GET', '/api/me', (ctx) => H.json(ctx.res, 200, { user: auth.userView(ctx.user) }));
on('POST', '/api/auth/logout', (ctx) => { auth.logout(ctx.req); H.json(ctx.res, 200, { ok: true }); });

/* ---------- chats ---------- */
on('GET', '/api/chats', (ctx) => H.json(ctx.res, 200, { chats: q.all('SELECT id,title,project_id,ts FROM chats WHERE user_id=? ORDER BY ts DESC LIMIT 500', ctx.user.id) }));

on('GET', '/api/chats/:id', (ctx) => {
  const chat = ownChat(ctx.user, ctx.params.id);
  const messages = q.all('SELECT id,role,text,parts,ts FROM messages WHERE chat_id=? ORDER BY id', chat.id)
    .map((m) => ({ ...m, parts: m.parts ? JSON.parse(m.parts) : [] }));
  H.json(ctx.res, 200, { chat, messages, running: active.has(chat.id) });
});

on('POST', '/api/chats/:id/stop', (ctx) => {
  const chat = ownChat(ctx.user, ctx.params.id); const ac = active.get(chat.id); if (ac) ac.abort(); H.json(ctx.res, 200, { ok: true, was: !!ac });
});

on('DELETE', '/api/chats/:id', (ctx) => {
  const chat = ownChat(ctx.user, ctx.params.id); const ac = active.get(chat.id); if (ac) ac.abort();
  q.run('DELETE FROM chats WHERE id=?', chat.id); H.json(ctx.res, 200, { ok: true });
});

on('POST', '/api/chats/:id/send', async (ctx) => {
  const { req, res, user, params } = ctx;
  const b = await H.readJson(req, 2 << 20);
  const text = String(b.text || '').slice(0, 20000);
  const attachments = Array.isArray(b.attachments) ? b.attachments.slice(0, 6).map(String) : [];
  if (!text.trim() && !attachments.length) throw auth.fail(400, 'Mensagem vazia');
  if (!ID_RE.test(params.id)) throw auth.fail(400, 'Id inválido');

  let chat = q.one('SELECT * FROM chats WHERE id=?', params.id);
  if (chat && chat.user_id !== user.id) throw auth.fail(404, 'Chat não encontrado');
  if (active.has(params.id)) throw auth.fail(409, 'A IA ainda está respondendo neste chat.');

  const day = new Date().toISOString().slice(0, 10);
  const used = (q.one('SELECT n FROM usage WHERE user_id=? AND day=?', user.id, day) || { n: 0 }).n;
  if (used >= cfg.dailyLimit) throw auth.fail(429, 'Você chegou no limite de mensagens de hoje.', 'limit');

  let project = null;
  if (!chat) {
    if (b.project_id) { project = q.one('SELECT * FROM projects WHERE id=? AND user_id=?', String(b.project_id), user.id); if (!project) throw auth.fail(404, 'Projeto não encontrado'); }
    q.run('INSERT INTO chats(id,user_id,project_id,title,ts) VALUES(?,?,?,?,?)', params.id, user.id, project ? project.id : null, (text.trim() || attachments.length + ' anexo(s)').slice(0, 40), Date.now());
    chat = q.one('SELECT * FROM chats WHERE id=?', params.id);
  } else if (chat.project_id) project = q.one('SELECT * FROM projects WHERE id=?', chat.project_id);

  q.run('INSERT INTO usage(user_id,day,n) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET n=n+1', user.id, day);
  q.run('INSERT INTO messages(chat_id,role,text,parts,ts) VALUES(?,?,?,?,?)', chat.id, 'user', text, attachments.length ? JSON.stringify(attachments.map((id) => {
    const u = q.one('SELECT id,name,mime FROM uploads WHERE id=? AND user_id=?', id, user.id); return u ? { kind: 'attachment', id: u.id, name: u.name, mime: u.mime } : null;
  }).filter(Boolean)) : null, Date.now());

  const emit = H.sse(res);
  const ac = new AbortController(); active.set(chat.id, ac);
  // A resposta continua mesmo se a pessoa sair do app (a tela volta e busca o resultado). Só o botão parar ou o limite de tempo cancelam.
  const maxTimer = setTimeout(() => ac.abort(), 15 * 60e3);
  try {
    await agent.run({ user, chat, project, text, attachments, speed: b.speed, lang: String(b.lang || user.lang || '').slice(0, 5), emit, signal: ac.signal });
  } catch (e) {
    console.error('[chat]', e); emit({ type: 'error', message: e.message || 'erro' });
  } finally {
    clearTimeout(maxTimer); active.delete(chat.id); try { res.end(); } catch {}
  }
});

/* ---------- projetos ---------- */
on('GET', '/api/projects', (ctx) => H.json(ctx.res, 200, { projects: q.all('SELECT id,name,type,ts FROM projects WHERE user_id=? ORDER BY ts DESC', ctx.user.id) }));
on('POST', '/api/projects', async (ctx) => {
  const b = await H.readJson(ctx.req); const name = String(b.name || '').trim().slice(0, 50);
  if (!name) throw auth.fail(400, 'Digite o nome do projeto.');
  const type = TYPES.includes(b.type) ? b.type : 'other'; const id = uid();
  q.run('INSERT INTO projects(id,user_id,name,type,ts) VALUES(?,?,?,?,?)', id, ctx.user.id, name, type, Date.now());
  H.json(ctx.res, 200, { project: { id, name, type, ts: Date.now() } });
});
on('DELETE', '/api/projects/:id', (ctx) => {
  q.run('DELETE FROM projects WHERE id=? AND user_id=?', ctx.params.id, ctx.user.id); H.json(ctx.res, 200, { ok: true });
});

/* ---------- códigos salvos ---------- */
on('GET', '/api/codes', (ctx) => H.json(ctx.res, 200, { codes: q.all('SELECT id,name,lang,code,ts FROM codes WHERE user_id=? ORDER BY ts DESC LIMIT 1000', ctx.user.id) }));
on('POST', '/api/codes', async (ctx) => {
  const b = await H.readJson(ctx.req, 2 << 20); const name = String(b.name || '').trim().slice(0, 40); const code = String(b.code || '');
  if (!name || !code) throw auth.fail(400, 'Nome e código são obrigatórios.');
  const id = uid(); q.run('INSERT INTO codes(id,user_id,name,lang,code,ts) VALUES(?,?,?,?,?,?)', id, ctx.user.id, name, String(b.lang || 'code').slice(0, 20), code.slice(0, 500000), Date.now());
  H.json(ctx.res, 200, { code: { id, name, lang: b.lang || 'code', code, ts: Date.now() } });
});
on('DELETE', '/api/codes/:id', (ctx) => { q.run('DELETE FROM codes WHERE id=? AND user_id=?', ctx.params.id, ctx.user.id); H.json(ctx.res, 200, { ok: true }); });

/* ---------- conectores ---------- */
on('GET', '/api/connectors', (ctx) => H.json(ctx.res, 200, { connectors: connectors.list(ctx.user.id) }));
on('POST', '/api/connectors/:kind/connect', async (ctx) => {
  auth.limit('conn:' + ctx.user.id, 20, 3600e3);
  const b = await H.readJson(ctx.req); H.json(ctx.res, 200, { connector: await connectors.connect(ctx.user.id, ctx.params.kind, b.fields) });
});
on('POST', '/api/connectors/:kind/perms', async (ctx) => {
  const b = await H.readJson(ctx.req); H.json(ctx.res, 200, { connector: connectors.setPerms(ctx.user.id, ctx.params.kind, b.perms) });
});
/* ---------- login do Google no APK: o navegador entrega um código de uso único para o app ---------- */
const handoffs = new Map(); // codigo -> { userId, exp }
on('POST', '/api/auth/handoff', (ctx) => {
  for (const [k, v] of handoffs) if (v.exp < Date.now()) handoffs.delete(k);
  if (handoffs.size > 500) throw auth.fail(429, 'Muitos pedidos. Tente de novo em instantes.');
  const code = crypto.randomBytes(18).toString('hex'); handoffs.set(code, { userId: ctx.user.id, exp: Date.now() + 120e3 });
  H.json(ctx.res, 200, { code });
});
on('POST', '/api/auth/exchange', async (ctx) => {
  auth.limit('ex:' + ctx.ip, 30, 3600e3);
  const b = await H.readJson(ctx.req); const code = String(b.code || ''); const h = handoffs.get(code); handoffs.delete(code);
  if (!h || h.exp < Date.now()) throw auth.fail(400, 'Código expirado. Entre de novo.', 'expired');
  const user = q.one('SELECT * FROM users WHERE id=?', h.userId); if (!user) throw auth.fail(400, 'Conta não encontrada.');
  H.json(ctx.res, 200, { token: auth.newSession(user.id), user: auth.userView(user), isNew: !(user.name && user.birth) });
}, { auth: false });

/* ---------- login com GitHub ---------- */
const ghStates = new Map(); // state -> { app, base, exp }
const ghBase = (req) => cfg.publicUrl || ('http://' + String(req.headers.host || 'localhost:' + cfg.port).replace(/^127\.0\.0\.1/, 'localhost'));
const ghPage = (res, body) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ORVEX</title><body style="background:#000;color:#fff;font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">' + body); };
on('GET', '/api/auth/github/start', (ctx) => {
  if (!(cfg.githubClientId && cfg.githubClientSecret)) throw auth.fail(501, 'Login com GitHub ainda não está configurado neste servidor.', 'github_off');
  auth.limit('gh:' + ctx.ip, 60, 3600e3);
  for (const [k, v] of ghStates) if (v.exp < Date.now()) ghStates.delete(k);
  if (ghStates.size > 500) throw auth.fail(429, 'Muitos pedidos. Tente de novo em instantes.');
  const state = crypto.randomBytes(18).toString('hex'); const base = ghBase(ctx.req);
  ghStates.set(state, { app: ctx.query.get('app') === '1', base, exp: Date.now() + 600e3 });
  const u = new URL('https://github.com/login/oauth/authorize');
  u.searchParams.set('client_id', cfg.githubClientId); u.searchParams.set('scope', 'user:email'); u.searchParams.set('state', state);
  u.searchParams.set('redirect_uri', base + '/api/auth/github/callback');
  ctx.res.writeHead(302, { Location: u.toString(), 'Cache-Control': 'no-store' }); ctx.res.end();
}, { auth: false });
on('GET', '/api/auth/github/callback', async (ctx) => {
  const st = ghStates.get(String(ctx.query.get('state') || '')); ghStates.delete(String(ctx.query.get('state') || ''));
  const code = String(ctx.query.get('code') || '');
  if (!st || st.exp < Date.now() || !code) return ghPage(ctx.res, '<p>Login expirado ou cancelado. Volte ao ORVEX e tente de novo.</p>');
  try {
    const tr = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: cfg.githubClientId, client_secret: cfg.githubClientSecret, code, redirect_uri: st.base + '/api/auth/github/callback' }) });
    const tj = await tr.json(); if (!tj.access_token) throw new Error('token');
    const er = await fetch('https://api.github.com/user/emails', { headers: { Authorization: 'Bearer ' + tj.access_token, Accept: 'application/vnd.github+json', 'User-Agent': 'orvex' } });
    if (!er.ok) throw new Error('emails'); const list = await er.json();
    const pick = (Array.isArray(list) ? list : []).find((e) => e.primary && e.verified) || (Array.isArray(list) ? list : []).find((e) => e.verified);
    if (!pick) return ghPage(ctx.res, '<p>Sua conta do GitHub não tem e-mail verificado.</p>');
    const r = auth.finishLogin(auth.normMail(pick.email));
    if (st.app) {
      const c = crypto.randomBytes(18).toString('hex'); handoffs.set(c, { userId: r.user.id, exp: Date.now() + 120e3 });
      const link = 'orvex://auth?code=' + c;
      return ghPage(ctx.res, '<div><p>Pronto! Voltando para o ORVEX…</p><p><a href="' + link + '" style="color:#000;background:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Abrir o ORVEX</a></p></div><script>location.href=' + JSON.stringify(link) + '</script>');
    }
    const j = (x) => JSON.stringify(x).replace(/</g, '\\u003c');
    return ghPage(ctx.res, '<p>Entrando…</p><script>try{localStorage.setItem("orvex:token",' + j(r.token) + ');localStorage.setItem("orvex:user",' + j(JSON.stringify(r.user)) + ')}catch(e){}location.replace("/")</script>');
  } catch (e) { return ghPage(ctx.res, '<p>Não foi possível entrar com o GitHub. Volte ao ORVEX e tente de novo.</p>'); }
}, { auth: false });

/* Google no APK: o Google devolve o login por POST (modo redirect), pois o navegador do app perde a janela popup. */
on('POST', '/api/auth/google-redirect', async (ctx) => {
  auth.limit('gr:' + ctx.ip, 30, 3600e3);
  const form = new URLSearchParams((await H.readBody(ctx.req, 1 << 16)).toString('utf8'));
  const ck = String(ctx.req.headers.cookie || '').match(/(?:^|;\s*)g_csrf_token=([^;]+)/);
  if (!ck || ck[1] !== form.get('g_csrf_token')) return ghPage(ctx.res, '<p>Pedido inválido. Volte ao ORVEX e tente de novo.</p>');
  try {
    const r = await auth.googleLogin(form.get('credential'));
    const c = crypto.randomBytes(18).toString('hex'); handoffs.set(c, { userId: r.user.id, exp: Date.now() + 120e3 });
    const link = 'orvex://auth?code=' + c;
    ghPage(ctx.res, '<div><p>Pronto! Voltando para o ORVEX…</p><p><a href="' + link + '" style="color:#000;background:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Abrir o ORVEX</a></p></div><script>location.href=' + JSON.stringify(link) + '</script>');
  } catch (e) { ghPage(ctx.res, '<p>Não consegui entrar com o Google. Volte ao ORVEX e tente de novo.</p>'); }
}, { auth: false });

/* ---------- configurações da IA (só o dono do servidor) ---------- */
const adminOnly = (ctx) => { if (!settings.isAdmin(ctx.user)) throw auth.fail(403, 'Só o dono do servidor mexe nisso.'); };
on('GET', '/api/admin/settings', (ctx) => { adminOnly(ctx); H.json(ctx.res, 200, { fields: settings.view() }); });
on('POST', '/api/admin/settings', async (ctx) => { adminOnly(ctx); H.json(ctx.res, 200, { fields: settings.save(await H.readJson(ctx.req)) }); });
on('POST', '/api/admin/settings/reset', (ctx) => { adminOnly(ctx); H.json(ctx.res, 200, { fields: settings.reset() }); });
on('GET', '/api/admin/models', async (ctx) => { adminOnly(ctx); H.json(ctx.res, 200, { models: await settings.listModels() }); });

on('DELETE', '/api/connectors/:kind', (ctx) => { connectors.disconnect(ctx.user.id, ctx.params.kind); H.json(ctx.res, 200, { ok: true }); });

/* ---------- anexos ---------- */
const putUpload = async (ctx) => {
  const max = cfg.maxUploadMB * 1024 * 1024;
  const body = await H.readBody(ctx.req, max);
  if (!body.length) throw auth.fail(400, 'Arquivo vazio');
  let name = 'arquivo'; try { name = decodeURIComponent(String(ctx.req.headers['x-file-name'] || 'arquivo')); } catch {}
  name = name.replace(/[\\/]/g, '_').slice(0, 120);
  const mime = String(ctx.req.headers['content-type'] || 'application/octet-stream').split(';')[0].slice(0, 100);
  const id = uid() + uid();
  fs.writeFileSync(path.join(cfg.dataDir, 'uploads', id), body);
  q.run('INSERT INTO uploads(id,user_id,name,mime,size,ts) VALUES(?,?,?,?,?,?)', id, ctx.user.id, name, mime, body.length, Date.now());
  H.json(ctx.res, 200, { id, name, mime, size: body.length });
};
on('PUT', '/api/upload', putUpload); on('POST', '/api/upload', putUpload);

/* ---------- arquivos gerados ---------- */
function resolveFile(user, chatId, rel) {
  const chat = ownChat(user, chatId); const ws = tools.wsDir(user.id, chat);
  const full = tools.safePath(ws, rel || '.');
  if (!fs.existsSync(full)) throw auth.fail(404, 'Não encontrado');
  return { ws, full, chat };
}

on('GET', '/api/files/tree', (ctx) => {
  const { ws, full } = resolveFile(ctx.user, ctx.query.get('chat'), ctx.query.get('path'));
  const items = [];
  (function walk(d, depth) {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name))) {
      if (e.name === 'node_modules' || e.name === '.git' || items.length >= 500 || e.isSymbolicLink()) continue;
      const f = path.join(d, e.name); const st = fs.statSync(f);
      items.push({ path: path.relative(ws, f), name: e.name, dir: e.isDirectory(), size: st.size, depth });
      if (e.isDirectory() && depth < 6) walk(f, depth + 1);
    }
  })(fs.statSync(full).isDirectory() ? full : path.dirname(full), 0);
  H.json(ctx.res, 200, { items, root: path.relative(ws, full) || '.' });
});

on('GET', '/api/files/view', (ctx) => {
  const { full } = resolveFile(ctx.user, ctx.query.get('chat'), ctx.query.get('path'));
  const st = fs.statSync(full); if (!st.isFile()) throw auth.fail(400, 'Isso é uma pasta');
  if (/\.(png|jpe?g|gif|webp)$/i.test(full)) return H.json(ctx.res, 200, { kind: 'image', size: st.size });
  const buf = fs.readFileSync(full).subarray(0, 200000); const s = buf.toString('utf8');
  if (/\u0000/.test(s.slice(0, 4000))) return H.json(ctx.res, 200, { kind: 'binary', size: st.size });
  H.json(ctx.res, 200, { kind: 'text', text: s, size: st.size, truncated: st.size > 200000 });
});

on('POST', '/api/files/link', async (ctx) => {
  const b = await H.readJson(ctx.req); const { full, chat } = resolveFile(ctx.user, b.chat, b.path);
  const token = auth.signLink({ u: ctx.user.id, c: chat.id, p: path.relative(tools.wsDir(ctx.user.id, chat), full) || '.', d: !!b.download });
  H.json(ctx.res, 200, { url: '/dl/' + token });
});

function serveLink(ctx) {
  const p = auth.readLink(ctx.params.token); if (!p) throw auth.fail(403, 'Link expirado');
  const chat = q.one('SELECT * FROM chats WHERE id=? AND user_id=?', p.c, p.u); if (!chat) throw auth.fail(404, 'Não encontrado');
  const ws = tools.wsDir(p.u, chat); const full = tools.safePath(ws, p.p);
  if (!fs.existsSync(full)) throw auth.fail(404, 'Não encontrado');
  const st = fs.statSync(full);
  const safeHdr = { 'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:", 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' };
  const ascii = (s) => encodeURIComponent(s);
  if (st.isDirectory()) {
    const buf = zipFolder(full); const name = (path.basename(full) === '.' || full === ws ? 'projeto' : path.basename(full)) + '.zip';
    ctx.res.writeHead(200, { ...safeHdr, 'Content-Type': 'application/zip', 'Content-Length': buf.length, 'Content-Disposition': `attachment; filename*=UTF-8''${ascii(name)}` });
    return ctx.res.end(buf);
  }
  const inlineOk = !p.d && /\.(png|jpe?g|gif|webp)$/i.test(full);
  ctx.res.writeHead(200, { ...safeHdr, 'Content-Type': inlineOk ? H.mimeOf(full) : H.mimeOf(full) === 'application/vnd.android.package-archive' ? H.mimeOf(full) : 'application/octet-stream',
    'Content-Length': st.size, 'Content-Disposition': `${inlineOk ? 'inline' : 'attachment'}; filename*=UTF-8''${ascii(path.basename(full))}` });
  fs.createReadStream(full).pipe(ctx.res);
}
on('GET', '/dl/:token', serveLink, { auth: false });

/* ---------- servidor ---------- */
const CSP = "default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
  "font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'";

const server = http.createServer(async (req, res) => {
  H.cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x'); const ip = req.socket.remoteAddress || '';
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/dl/')) {
    res.setHeader('Content-Security-Policy', CSP); res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return H.serveStatic(req, res, url.pathname);
  }
  try {
    for (const r of routes) {
      if (r.method !== req.method) continue; const m = r.re.exec(url.pathname); if (!m) continue;
      const ctx = { req, res, ip, query: url.searchParams, params: m.groups || {}, user: null };
      if (r.auth) { ctx.user = auth.authenticate(req); if (!ctx.user) return H.json(res, 401, { error: 'Entre na sua conta.', code: 'auth' }); }
      return await r.fn(ctx);
    }
    H.json(res, 404, { error: 'Rota não encontrada' });
  } catch (e) {
    const status = e.status || 500; if (status >= 500) console.error('[erro]', e);
    if (res.headersSent) return res.end();
    H.json(res, status, { error: status >= 500 ? 'Erro interno' : e.message, code: e.code });
  }
});
server.requestTimeout = 0; server.headersTimeout = 30000;

if (require.main === module) {
  server.listen(cfg.port, cfg.host, () => {
    console.log(`ORVEX no ar em http://localhost:${cfg.port}`);
    console.log(`  modelo: ${cfg.provider === 'mock' ? 'TESTE (mock)' : cfg.modelBase + ' (' + cfg.models.mid + ')'} · terminal: ${cfg.exec} · google: ${cfg.googleClientId ? 'ligado' : 'desligado'} · github: ${cfg.githubClientId ? 'ligado' : 'desligado'} · e-mail: ${cfg.smtpUser ? 'gmail' : cfg.resendApiKey ? 'resend' : 'console'}`);
  });
}
module.exports = { server };
