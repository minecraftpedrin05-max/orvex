'use strict';
// Conectores: lugares onde a IA pode se conectar (GitHub, Railway, Netlify, Discord, servidores MCP...).
// Cada usuário liga os seus, com o seu token, e escolhe o que a IA pode fazer em cada um.
// O token fica criptografado no banco e nunca volta para o app nem vai para o modelo.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { q } = require('./db');
const tools = require('./tools');
const { zipFolder } = require('./zip');

const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const clip = (s, n) => (s.length > n ? s.slice(0, n) + `\n... (cortado, ${s.length - n} caracteres a mais)` : s);

/* ---------- criptografia do token ---------- */
const KEY = crypto.createHash('sha256').update('orvex-connectors|' + cfg.secret).digest();
function enc(text) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const body = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
}
function dec(s) {
  const b = Buffer.from(s, 'base64'); const d = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

/* ---------- HTTP dos conectores ---------- */
function redact(msg, c) { let m = String(msg); for (const v of Object.values(c || {})) if (typeof v === 'string' && v.length > 5) m = m.split(v).join('***'); return m; }

async function http(conn, c, method, p, opt = {}) {
  const base = typeof conn.base === 'function' ? conn.base(c) : conn.base;
  let url = base.replace(/\/$/, '') + p;
  if (opt.query) { const qs = new URLSearchParams(Object.entries(opt.query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString(); if (qs) url += (url.includes('?') ? '&' : '?') + qs; }
  const headers = { 'User-Agent': 'ORVEX/1.0', Accept: 'application/json', ...(conn.headers ? conn.headers(c) : {}), ...(opt.headers || {}) };
  let body;
  if (opt.body !== undefined && !/^(GET|HEAD)$/i.test(method)) {
    if (Buffer.isBuffer(opt.body) || typeof opt.body === 'string') body = opt.body;
    else { body = JSON.stringify(opt.body); if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'; }
  }
  const origin = new URL(url).origin;
  for (let hop = 0; hop < 4; hop++) {
    if (conn.dynamic) await tools.assertPublicUrl(url);
    let r;
    try { r = await fetch(url, { method, headers, body, redirect: 'manual', signal: opt.signal }); }
    catch (e) { if (opt.signal && opt.signal.aborted) throw e; throw new Error(redact('não consegui acessar ' + new URL(url).host + ' (' + (e.cause && e.cause.code || e.message) + ')', c)); }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      const next = new URL(r.headers.get('location'), url).href;
      if (!conn.dynamic && new URL(next).origin !== origin) throw new Error('redirecionamento para outro site bloqueado');
      url = next; continue;
    }
    const buf = Buffer.from(await r.arrayBuffer()).subarray(0, 2_000_000); const text = buf.toString('utf8');
    let data = text; try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok && !opt.anyStatus) {
      const detail = data && typeof data === 'object' ? (data.message || data.error || data.errors && JSON.stringify(data.errors) || text) : text;
      throw new Error(redact(`HTTP ${r.status}${r.status === 401 || r.status === 403 ? ' (token inválido ou sem permissão no site)' : ''}: ${String(detail).slice(0, 300)}`, c));
    }
    return { status: r.status, data };
  }
  throw new Error('redirecionamentos demais');
}

const need = (p, ...keys) => { for (const k of keys) if (p[k] === undefined || p[k] === null || p[k] === '') throw new Error(`falta o parâmetro "${k}"`); };
const repoOk = (r) => { if (!/^[\w.-]+\/[\w.-]+$/.test(String(r || ''))) throw new Error('"repo" precisa ser no formato dono/nome'); return r; };
const encPath = (p) => String(p).split('/').map(encodeURIComponent).join('/');
const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');

/** Lista os arquivos de uma pasta do espaço de trabalho (para subir em sites de hospedagem). */
function folderFiles(ctx, folder, { maxFiles = 100, maxBytes = 8 * 1024 * 1024 } = {}) {
  const dir = tools.safePath(ctx.ws, folder || '.');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('pasta não encontrada: ' + folder);
  const out = []; let total = 0;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.isSymbolicLink()) continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!e.isFile()) continue;
      const data = fs.readFileSync(f); total += data.length;
      if (out.length >= maxFiles || total > maxBytes) throw new Error(`pasta grande demais (limite ${maxFiles} arquivos e ${Math.round(maxBytes / 1048576)} MB)`);
      out.push({ rel: path.relative(dir, f).split(path.sep).join('/'), data });
    }
  })(dir);
  if (!out.length) throw new Error('a pasta está vazia');
  return { dir, files: out };
}

const A = (id, perm, desc, params, run) => ({ id, perm, desc, params, run });
const TOKEN = [{ k: 'token', type: 'password', label: 'f_token' }];

/* ---------- catálogo ---------- */
const CATALOG = [
  /* ===== Hospedagem ===== */
  {
    id: 'railway', name: 'Railway', cat: 'host', fields: TOKEN, help: 'https://railway.com/account/tokens', perms: ['read', 'deploy', 'delete'],
    base: 'https://backboard.railway.com/graphql/v2', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    gql: async (h, query, variables) => { const r = await h('POST', '', { body: { query, variables } }); if (r.data && r.data.errors) throw new Error(r.data.errors.map((e) => e.message).join('; ')); return r.data.data; },
    check: async (h, conn) => { const d = await conn.gql(h, '{ projects { edges { node { id } } } }'); return 'Railway (' + d.projects.edges.length + ' projetos)'; },
    actions: (conn) => [
      A('list_projects', 'read', 'Lista os projetos', {}, (h) => conn.gql(h, '{ projects { edges { node { id name createdAt } } } }')),
      A('get_project', 'read', 'Serviços e ambientes de um projeto', { project_id: 'id do projeto' }, (h, p) => { need(p, 'project_id'); return conn.gql(h, 'query($id:String!){ project(id:$id){ id name services{edges{node{id name}}} environments{edges{node{id name}}} } }', { id: p.project_id }); }),
      A('create_project', 'deploy', 'Cria um projeto', { name: 'nome' }, (h, p) => { need(p, 'name'); return conn.gql(h, 'mutation($i:ProjectCreateInput!){ projectCreate(input:$i){ id name environments{edges{node{id name}}} } }', { i: { name: String(p.name).slice(0, 60) } }); }),
      A('deploy_from_github', 'deploy', 'Hospeda um repositório do GitHub como serviço (precisa do app do Railway instalado no GitHub)', { project_id: 'id do projeto', repo: 'dono/nome', name: 'nome do serviço (opcional)' }, (h, p) => { need(p, 'project_id', 'repo'); repoOk(p.repo); return conn.gql(h, 'mutation($i:ServiceCreateInput!){ serviceCreate(input:$i){ id name } }', { i: { projectId: p.project_id, name: p.name || p.repo.split('/')[1], source: { repo: p.repo } } }); }),
      A('create_domain', 'deploy', 'Gera um endereço público para o serviço', { service_id: 'id do serviço', environment_id: 'id do ambiente' }, (h, p) => { need(p, 'service_id', 'environment_id'); return conn.gql(h, 'mutation($i:ServiceDomainCreateInput!){ serviceDomainCreate(input:$i){ domain } }', { i: { serviceId: p.service_id, environmentId: p.environment_id } }); }),
      A('set_variables', 'deploy', 'Define variáveis de ambiente de um serviço', { project_id: '', environment_id: '', service_id: '', variables: 'objeto {NOME: valor}' }, (h, p) => { need(p, 'project_id', 'environment_id', 'service_id', 'variables'); return conn.gql(h, 'mutation($i:VariableCollectionUpsertInput!){ variableCollectionUpsert(input:$i) }', { i: { projectId: p.project_id, environmentId: p.environment_id, serviceId: p.service_id, variables: p.variables } }); }),
      A('delete_project', 'delete', 'Apaga um projeto', { project_id: 'id do projeto' }, (h, p) => { need(p, 'project_id'); return conn.gql(h, 'mutation($id:String!){ projectDelete(id:$id) }', { id: p.project_id }); }),
    ],
  },
  {
    id: 'netlify', name: 'Netlify', cat: 'host', fields: TOKEN, help: 'https://app.netlify.com/user/applications#personal-access-tokens', perms: ['read', 'deploy', 'delete'],
    base: 'https://api.netlify.com/api/v1', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    check: async (h) => { const r = await h('GET', '/user'); return r.data.email || r.data.full_name || 'Netlify'; },
    actions: () => [
      A('list_sites', 'read', 'Lista os sites', {}, async (h) => (await h('GET', '/sites', { query: { per_page: 30 } })).data.map((s) => ({ id: s.id, name: s.name, url: s.ssl_url || s.url }))),
      A('deploy_folder', 'deploy', 'Publica uma pasta do espaço de trabalho como site (cria o site se não passar site_id)', { folder: 'pasta com index.html', site_id: 'opcional', name: 'nome do site novo (opcional)' }, async (h, p, ctx) => {
        const { dir } = folderFiles(ctx, p.folder);
        let id = p.site_id; let site = null;
        if (!id) { site = (await h('POST', '/sites', { body: p.name ? { name: String(p.name).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50) } : {} })).data; id = site.id; }
        const d = (await h('POST', `/sites/${encodeURIComponent(id)}/deploys`, { body: zipFolder(dir, 50 * 1048576, 2000, true), headers: { 'Content-Type': 'application/zip' } })).data;
        return { site_id: id, url: (site && (site.ssl_url || site.url)) || d.ssl_url || d.url, deploy_url: d.deploy_ssl_url || d.deploy_url, state: d.state };
      }),
      A('delete_site', 'delete', 'Apaga um site', { site_id: 'id do site' }, async (h, p) => { need(p, 'site_id'); await h('DELETE', `/sites/${encodeURIComponent(p.site_id)}`); return { ok: true }; }),
    ],
  },
  {
    id: 'vercel', name: 'Vercel', cat: 'host', fields: TOKEN, help: 'https://vercel.com/account/tokens', perms: ['read', 'deploy', 'delete'],
    base: 'https://api.vercel.com', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    check: async (h) => { const r = await h('GET', '/v2/user'); return (r.data.user && (r.data.user.email || r.data.user.username)) || 'Vercel'; },
    actions: () => [
      A('list_projects', 'read', 'Lista os projetos', {}, async (h) => (await h('GET', '/v9/projects', { query: { limit: 30 } })).data.projects.map((x) => ({ id: x.id, name: x.name }))),
      A('deploy_folder', 'deploy', 'Publica uma pasta do espaço de trabalho como site', { folder: 'pasta com index.html', name: 'nome do projeto' }, async (h, p, ctx) => {
        const { files } = folderFiles(ctx, p.folder);
        const name = String(p.name || 'orvex-site').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
        const d = (await h('POST', '/v13/deployments', { query: { skipAutoDetectionConfirmation: 1 }, body: { name, target: 'production', projectSettings: { framework: null }, files: files.map((f) => ({ file: f.rel, data: f.data.toString('base64'), encoding: 'base64' })) } })).data;
        return { id: d.id, url: d.url ? 'https://' + d.url : undefined, state: d.readyState };
      }),
      A('delete_project', 'delete', 'Apaga um projeto', { project_id: 'id ou nome' }, async (h, p) => { need(p, 'project_id'); await h('DELETE', `/v9/projects/${encodeURIComponent(p.project_id)}`); return { ok: true }; }),
    ],
  },
  {
    id: 'huggingface', name: 'Hugging Face', cat: 'host', fields: TOKEN, help: 'https://huggingface.co/settings/tokens', perms: ['read', 'deploy'],
    base: 'https://huggingface.co/api', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    check: async (h) => { const r = await h('GET', '/whoami-v2'); return r.data.name || 'Hugging Face'; },
    actions: () => [
      A('search_models', 'read', 'Procura modelos', { query: 'texto' }, async (h, p) => { need(p, 'query'); return (await h('GET', '/models', { query: { search: p.query, limit: 10 } })).data.map((m) => ({ id: m.id, downloads: m.downloads, likes: m.likes })); }),
      A('deploy_folder', 'deploy', 'Publica uma pasta estática como Space (site) no Hugging Face', { folder: 'pasta com index.html', name: 'nome do space' }, async (h, p, ctx) => {
        need(p, 'name'); const { files } = folderFiles(ctx, p.folder);
        const me = (await h('GET', '/whoami-v2')).data.name; const name = String(p.name).replace(/[^\w.-]/g, '-').slice(0, 60);
        try { await h('POST', '/repos/create', { body: { type: 'space', name, sdk: 'static', private: false } }); } catch (e) { if (!/409|already/i.test(e.message)) throw e; }
        const lines = [JSON.stringify({ key: 'header', value: { summary: 'Publicado pelo ORVEX' } }), ...files.map((f) => JSON.stringify({ key: 'file', value: { content: f.data.toString('base64'), path: f.rel, encoding: 'base64' } }))].join('\n');
        await h('POST', `/spaces/${me}/${name}/commit/main`, { body: lines, headers: { 'Content-Type': 'application/x-ndjson' } });
        return { url: `https://huggingface.co/spaces/${me}/${name}` };
      }),
    ],
  },

  /* ===== Código ===== */
  {
    id: 'github', name: 'GitHub', cat: 'code', fields: TOKEN, help: 'https://github.com/settings/personal-access-tokens', perms: ['read', 'write', 'issues', 'pulls', 'delete'],
    base: 'https://api.github.com', headers: (c) => ({ Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }),
    check: async (h) => { const r = await h('GET', '/user'); return '@' + r.data.login; },
    actions: () => {
      const put = async (h, repo, filePath, content, message, branch) => {
        let sha; try { const cur = await h('GET', `/repos/${repo}/contents/${encPath(filePath)}`, { query: { ref: branch } }); sha = cur.data.sha; } catch {}
        return (await h('PUT', `/repos/${repo}/contents/${encPath(filePath)}`, { body: { message: message || 'Atualizado pelo ORVEX', content: Buffer.isBuffer(content) ? content.toString('base64') : b64(content), branch: branch || undefined, sha } })).data;
      };
      return [
        A('list_repos', 'read', 'Lista os repositórios do usuário', {}, async (h) => (await h('GET', '/user/repos', { query: { per_page: 30, sort: 'updated' } })).data.map((r) => ({ repo: r.full_name, private: r.private, description: r.description, updated: r.pushed_at }))),
        A('list_files', 'read', 'Lista os arquivos de um repositório', { repo: 'dono/nome', ref: 'branch (opcional)' }, async (h, p) => { repoOk(p.repo); const r = (await h('GET', `/repos/${p.repo}/git/trees/${encodeURIComponent(p.ref || 'HEAD')}`, { query: { recursive: 1 } })).data; return r.tree.filter((t) => t.type === 'blob').slice(0, 300).map((t) => t.path); }),
        A('read_file', 'read', 'Lê um arquivo de um repositório', { repo: 'dono/nome', path: 'caminho', ref: 'branch (opcional)' }, async (h, p) => { repoOk(p.repo); need(p, 'path'); const r = (await h('GET', `/repos/${p.repo}/contents/${encPath(p.path)}`, { query: { ref: p.ref } })).data; if (Array.isArray(r)) return r.map((x) => x.path); return Buffer.from(r.content || '', 'base64').toString('utf8'); }),
        A('search_code', 'read', 'Busca código no GitHub', { query: 'texto, ex.: "useState repo:dono/nome"' }, async (h, p) => { need(p, 'query'); return (await h('GET', '/search/code', { query: { q: p.query, per_page: 10 } })).data.items.map((i) => ({ repo: i.repository.full_name, path: i.path })); }),
        A('list_issues', 'read', 'Lista as issues abertas', { repo: 'dono/nome' }, async (h, p) => { repoOk(p.repo); return (await h('GET', `/repos/${p.repo}/issues`, { query: { state: 'open', per_page: 20 } })).data.map((i) => ({ number: i.number, title: i.title, url: i.html_url })); }),
        A('create_repo', 'write', 'Cria um repositório', { name: 'nome', description: 'opcional', private: 'true/false (padrão true)' }, async (h, p) => { need(p, 'name'); const r = (await h('POST', '/user/repos', { body: { name: p.name, description: p.description || '', private: p.private !== false && p.private !== 'false', auto_init: true } })).data; return { repo: r.full_name, url: r.html_url }; }),
        A('write_file', 'write', 'Cria ou altera um arquivo em um repositório', { repo: 'dono/nome', path: 'caminho', content: 'texto', message: 'mensagem do commit', branch: 'opcional' }, async (h, p) => { repoOk(p.repo); need(p, 'path', 'content'); const r = await put(h, p.repo, p.path, p.content, p.message, p.branch); return { ok: true, url: r.content && r.content.html_url }; }),
        A('upload_folder', 'write', 'Envia uma pasta do espaço de trabalho para um repositório (até 60 arquivos)', { repo: 'dono/nome', folder: 'pasta', branch: 'opcional', message: 'opcional' }, async (h, p, ctx) => {
          repoOk(p.repo); const { files } = folderFiles(ctx, p.folder, { maxFiles: 60, maxBytes: 6 * 1048576 });
          for (const f of files) await put(h, p.repo, f.rel, f.data, p.message || 'Enviado pelo ORVEX', p.branch);
          return { ok: true, files: files.length, url: 'https://github.com/' + p.repo };
        }),
        A('create_issue', 'issues', 'Abre uma issue', { repo: 'dono/nome', title: '', body: '' }, async (h, p) => { repoOk(p.repo); need(p, 'title'); const r = (await h('POST', `/repos/${p.repo}/issues`, { body: { title: p.title, body: p.body || '' } })).data; return { number: r.number, url: r.html_url }; }),
        A('list_branches', 'read', 'Lista os branches', { repo: 'dono/nome' }, async (h, p) => { repoOk(p.repo); return (await h('GET', `/repos/${p.repo}/branches`, { query: { per_page: 50 } })).data.map((b) => b.name); }),
        A('list_commits', 'read', 'Lista os últimos commits', { repo: 'dono/nome', branch: 'opcional' }, async (h, p) => { repoOk(p.repo); return (await h('GET', `/repos/${p.repo}/commits`, { query: { per_page: 15, sha: p.branch } })).data.map((c) => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0], author: c.commit.author.name, at: c.commit.author.date })); }),
        A('list_pulls', 'read', 'Lista os pull requests abertos', { repo: 'dono/nome' }, async (h, p) => { repoOk(p.repo); return (await h('GET', `/repos/${p.repo}/pulls`, { query: { state: 'open', per_page: 20 } })).data.map((x) => ({ number: x.number, title: x.title, from: x.head.ref, url: x.html_url })); }),
        A('get_issue', 'read', 'Lê uma issue com os comentários', { repo: 'dono/nome', number: 'número' }, async (h, p) => { repoOk(p.repo); need(p, 'number'); const i = (await h('GET', `/repos/${p.repo}/issues/${encodeURIComponent(p.number)}`)).data; const cm = (await h('GET', `/repos/${p.repo}/issues/${encodeURIComponent(p.number)}/comments`, { query: { per_page: 20 } })).data; return { title: i.title, state: i.state, body: i.body, comments: cm.map((c) => ({ user: c.user.login, text: c.body })) }; }),
        A('create_branch', 'write', 'Cria um branch a partir de outro', { repo: 'dono/nome', name: 'novo branch', from: 'branch de origem (padrão: o principal)' }, async (h, p) => { repoOk(p.repo); need(p, 'name'); const from = p.from || (await h('GET', `/repos/${p.repo}`)).data.default_branch; const sha = (await h('GET', `/repos/${p.repo}/git/ref/heads/${encPath(from)}`)).data.object.sha; await h('POST', `/repos/${p.repo}/git/refs`, { body: { ref: 'refs/heads/' + p.name, sha } }); return { ok: true, branch: p.name }; }),
        A('comment_issue', 'issues', 'Comenta em uma issue ou pull request', { repo: 'dono/nome', number: 'número', text: 'comentário' }, async (h, p) => { repoOk(p.repo); need(p, 'number', 'text'); const r = (await h('POST', `/repos/${p.repo}/issues/${encodeURIComponent(p.number)}/comments`, { body: { body: String(p.text).slice(0, 6000) } })).data; return { ok: true, url: r.html_url }; }),
        A('close_issue', 'issues', 'Fecha uma issue', { repo: 'dono/nome', number: 'número' }, async (h, p) => { repoOk(p.repo); need(p, 'number'); await h('PATCH', `/repos/${p.repo}/issues/${encodeURIComponent(p.number)}`, { body: { state: 'closed' } }); return { ok: true }; }),
        A('create_pull', 'pulls', 'Abre um pull request', { repo: 'dono/nome', title: '', head: 'branch com as mudanças', base: 'branch de destino (padrão: o principal)', body: 'opcional' }, async (h, p) => { repoOk(p.repo); need(p, 'title', 'head'); const base = p.base || (await h('GET', `/repos/${p.repo}`)).data.default_branch; const r = (await h('POST', `/repos/${p.repo}/pulls`, { body: { title: p.title, head: p.head, base, body: p.body || '' } })).data; return { number: r.number, url: r.html_url }; }),
        A('merge_pull', 'pulls', 'Junta (merge) um pull request', { repo: 'dono/nome', number: 'número' }, async (h, p) => { repoOk(p.repo); need(p, 'number'); const r = (await h('PUT', `/repos/${p.repo}/pulls/${encodeURIComponent(p.number)}/merge`, { body: {} })).data; return { merged: r.merged, message: r.message }; }),
        A('delete_file', 'delete', 'Apaga um arquivo de um repositório', { repo: 'dono/nome', path: 'caminho', branch: 'opcional' }, async (h, p) => { repoOk(p.repo); need(p, 'path'); const cur = (await h('GET', `/repos/${p.repo}/contents/${encPath(p.path)}`, { query: { ref: p.branch } })).data; await h('DELETE', `/repos/${p.repo}/contents/${encPath(p.path)}`, { body: { message: 'Apagado pelo ORVEX', sha: cur.sha, branch: p.branch || undefined } }); return { ok: true }; }),
        A('delete_repo', 'delete', 'Apaga um repositório inteiro (não dá para desfazer)', { repo: 'dono/nome' }, async (h, p) => { repoOk(p.repo); await h('DELETE', `/repos/${p.repo}`); return { ok: true }; }),
      ];
    },
  },

  /* ===== Mensagens ===== */
  {
    id: 'discord', name: 'Discord', cat: 'msg', fields: TOKEN, help: 'https://discord.com/developers/applications', perms: ['read', 'send'],
    base: 'https://discord.com/api/v10', headers: (c) => ({ Authorization: 'Bot ' + c.token }),
    check: async (h) => { const r = await h('GET', '/users/@me'); return r.data.username; },
    actions: () => [
      A('list_servers', 'read', 'Lista os servidores do bot', {}, async (h) => (await h('GET', '/users/@me/guilds')).data.map((g) => ({ id: g.id, name: g.name }))),
      A('list_channels', 'read', 'Lista os canais de um servidor', { guild_id: 'id do servidor' }, async (h, p) => { need(p, 'guild_id'); return (await h('GET', `/guilds/${encodeURIComponent(p.guild_id)}/channels`)).data.map((c) => ({ id: c.id, name: c.name, type: c.type })); }),
      A('read_messages', 'read', 'Lê as últimas mensagens de um canal', { channel_id: 'id do canal' }, async (h, p) => { need(p, 'channel_id'); return (await h('GET', `/channels/${encodeURIComponent(p.channel_id)}/messages`, { query: { limit: 20 } })).data.map((m) => ({ author: m.author.username, text: m.content, at: m.timestamp })); }),
      A('send_message', 'send', 'Envia uma mensagem em um canal', { channel_id: 'id do canal', text: 'mensagem' }, async (h, p) => { need(p, 'channel_id', 'text'); const r = (await h('POST', `/channels/${encodeURIComponent(p.channel_id)}/messages`, { body: { content: String(p.text).slice(0, 2000) } })).data; return { ok: true, id: r.id }; }),
    ],
  },
  {
    id: 'telegram', name: 'Telegram', cat: 'msg', fields: TOKEN, help: 'https://t.me/BotFather', perms: ['read', 'send'],
    base: (c) => 'https://api.telegram.org/bot' + c.token, headers: () => ({}),
    check: async (h) => { const r = await h('GET', '/getMe'); return '@' + r.data.result.username; },
    actions: () => [
      A('read_updates', 'read', 'Lê as mensagens recebidas pelo bot', {}, async (h) => (await h('GET', '/getUpdates', { query: { limit: 20 } })).data.result.map((u) => u.message && { chat_id: u.message.chat.id, from: u.message.from && u.message.from.first_name, text: u.message.text }).filter(Boolean)),
      A('send_message', 'send', 'Envia uma mensagem', { chat_id: 'id da conversa', text: 'mensagem' }, async (h, p) => { need(p, 'chat_id', 'text'); await h('POST', '/sendMessage', { body: { chat_id: p.chat_id, text: String(p.text).slice(0, 4000) } }); return { ok: true }; }),
    ],
  },
  {
    id: 'slack', name: 'Slack', cat: 'msg', fields: TOKEN, help: 'https://api.slack.com/apps', perms: ['read', 'send'],
    base: 'https://slack.com/api', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    call: async (h, method, body) => { const r = await h('POST', '/' + method, { body, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); if (!r.data || !r.data.ok) throw new Error((r.data && r.data.error) || 'erro do Slack'); return r.data; },
    check: async (h, conn) => { const d = await conn.call(h, 'auth.test', {}); return d.team || 'Slack'; },
    actions: (conn) => [
      A('list_channels', 'read', 'Lista os canais', {}, async (h) => (await conn.call(h, 'conversations.list', { limit: 100 })).channels.map((c) => ({ id: c.id, name: c.name }))),
      A('read_messages', 'read', 'Lê as últimas mensagens de um canal', { channel_id: 'id do canal' }, async (h, p) => { need(p, 'channel_id'); return (await conn.call(h, 'conversations.history', { channel: p.channel_id, limit: 20 })).messages.map((m) => ({ user: m.user, text: m.text })); }),
      A('send_message', 'send', 'Envia uma mensagem em um canal', { channel_id: 'id do canal', text: 'mensagem' }, async (h, p) => { need(p, 'channel_id', 'text'); await conn.call(h, 'chat.postMessage', { channel: p.channel_id, text: String(p.text).slice(0, 4000) }); return { ok: true }; }),
    ],
  },

  /* ===== Anotações ===== */
  {
    id: 'notion', name: 'Notion', cat: 'notes', fields: TOKEN, help: 'https://www.notion.so/profile/integrations', perms: ['read', 'write'],
    base: 'https://api.notion.com/v1', headers: (c) => ({ Authorization: 'Bearer ' + c.token, 'Notion-Version': '2022-06-28' }),
    check: async (h) => { const r = await h('GET', '/users/me'); return r.data.name || 'Notion'; },
    actions: () => [
      A('search', 'read', 'Procura páginas', { query: 'texto' }, async (h, p) => (await h('POST', '/search', { body: { query: p.query || '', page_size: 10 } })).data.results.map((x) => ({ id: x.id, type: x.object, title: x.properties && Object.values(x.properties).filter((v) => v.type === 'title').map((v) => v.title.map((t) => t.plain_text).join(''))[0] || x.title && x.title.map((t) => t.plain_text).join(''), url: x.url }))),
      A('read_page', 'read', 'Lê o conteúdo de uma página', { page_id: 'id' }, async (h, p) => { need(p, 'page_id'); return (await h('GET', `/blocks/${encodeURIComponent(p.page_id)}/children`, { query: { page_size: 100 } })).data.results.map((b) => b[b.type] && b[b.type].rich_text ? b[b.type].rich_text.map((t) => t.plain_text).join('') : '').filter(Boolean); }),
      A('create_page', 'write', 'Cria uma página dentro de outra página', { parent_page_id: 'id da página pai', title: 'título', text: 'conteúdo' }, async (h, p) => { need(p, 'parent_page_id', 'title'); const r = (await h('POST', '/pages', { body: { parent: { page_id: p.parent_page_id }, properties: { title: { title: [{ text: { content: String(p.title).slice(0, 200) } }] } }, children: String(p.text || '').split('\n').filter(Boolean).slice(0, 90).map((t) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: t.slice(0, 1900) } }] } })) } })).data; return { id: r.id, url: r.url }; }),
    ],
  },

  /* ===== Código (GitLab) ===== */
  {
    id: 'gitlab', name: 'GitLab', cat: 'code', fields: TOKEN, help: 'https://gitlab.com/-/user_settings/personal_access_tokens', perms: ['read', 'write', 'issues', 'pulls'],
    base: 'https://gitlab.com/api/v4', headers: (c) => ({ 'PRIVATE-TOKEN': c.token }),
    check: async (h) => '@' + (await h('GET', '/user')).data.username,
    actions: () => [
      A('list_projects', 'read', 'Lista os projetos', {}, async (h) => (await h('GET', '/projects', { query: { membership: true, per_page: 30, order_by: 'last_activity_at' } })).data.map((x) => ({ id: x.id, path: x.path_with_namespace, private: x.visibility !== 'public' }))),
      A('list_issues', 'read', 'Lista as issues abertas', { project: 'id ou dono/nome' }, async (h, p) => { need(p, 'project'); return (await h('GET', `/projects/${encodeURIComponent(p.project)}/issues`, { query: { state: 'opened', per_page: 20 } })).data.map((i) => ({ iid: i.iid, title: i.title, url: i.web_url })); }),
      A('read_file', 'read', 'Lê um arquivo de um projeto', { project: 'id ou dono/nome', path: 'caminho', ref: 'branch (padrão HEAD)' }, async (h, p) => { need(p, 'project', 'path'); const r = (await h('GET', `/projects/${encodeURIComponent(p.project)}/repository/files/${encodeURIComponent(p.path)}`, { query: { ref: p.ref || 'HEAD' } })).data; return Buffer.from(r.content, 'base64').toString('utf8'); }),
      A('write_file', 'write', 'Cria ou altera um arquivo', { project: 'id ou dono/nome', path: 'caminho', content: 'texto', branch: 'padrão main', message: 'commit' }, async (h, p) => {
        need(p, 'project', 'path', 'content'); const u = `/projects/${encodeURIComponent(p.project)}/repository/files/${encodeURIComponent(p.path)}`; const body = { branch: p.branch || 'main', content: String(p.content), commit_message: p.message || 'Atualizado pelo ORVEX' };
        try { await h('PUT', u, { body }); } catch { await h('POST', u, { body }); } return { ok: true };
      }),
      A('create_issue', 'issues', 'Abre uma issue', { project: 'id ou dono/nome', title: '', description: '' }, async (h, p) => { need(p, 'project', 'title'); const r = (await h('POST', `/projects/${encodeURIComponent(p.project)}/issues`, { body: { title: p.title, description: p.description || '' } })).data; return { iid: r.iid, url: r.web_url }; }),
      A('create_merge_request', 'pulls', 'Abre um merge request', { project: 'id ou dono/nome', source_branch: '', target_branch: 'padrão main', title: '' }, async (h, p) => { need(p, 'project', 'source_branch', 'title'); const r = (await h('POST', `/projects/${encodeURIComponent(p.project)}/merge_requests`, { body: { source_branch: p.source_branch, target_branch: p.target_branch || 'main', title: p.title } })).data; return { iid: r.iid, url: r.web_url }; }),
    ],
  },

  /* ===== Jogos (Roblox) ===== */
  {
    id: 'roblox', name: 'Roblox', cat: 'game', fields: [{ k: 'token', type: 'password', label: 'f_robloxkey' }, { k: 'universe_id', type: 'text', label: 'f_universe' }, { k: 'place_id', type: 'text', label: 'f_place', optional: true }],
    help: 'https://create.roblox.com/dashboard/credentials', perms: ['read', 'run', 'deploy'],
    base: 'https://apis.roblox.com', headers: (c) => ({ 'x-api-key': c.token }),
    check: async (h, conn, c) => { if (!/^\d+$/.test(c.universe_id || '')) throw new Error('o Universe ID é só números'); const r = await h('GET', `/cloud/v2/universes/${c.universe_id}`); return r.data.displayName || ('Universe ' + c.universe_id); },
    // O Roblox Studio em si não dá para controlar de fora. O Open Cloud deixa rodar scripts Luau num lugar do jogo e publicar o arquivo do lugar.
    actions: () => [
      A('get_universe', 'read', 'Mostra os dados do jogo (universe)', {}, async (h, p, ctx, c) => (await h('GET', `/cloud/v2/universes/${c.universe_id}`)).data),
      A('list_datastores', 'read', 'Lista os DataStores do jogo', {}, async (h, p, ctx, c) => (await h('GET', `/cloud/v2/universes/${c.universe_id}/data-stores`)).data),
      A('run_luau', 'run', 'Roda um script Luau dentro do lugar do jogo e devolve a saída (precisa do Place ID)', { script: 'código Luau', place_id: 'opcional se já foi salvo' }, async (h, p, ctx, c) => {
        need(p, 'script'); const place = p.place_id || c.place_id; if (!/^\d+$/.test(String(place || ''))) throw new Error('falta o Place ID (configure no conector)');
        const t = (await h('POST', `/cloud/v2/universes/${c.universe_id}/places/${place}/luau-execution-session-tasks`, { body: { script: String(p.script).slice(0, 60000), timeout: '30s' } })).data;
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 2000)); const g = (await h('GET', `/cloud/v2/${t.path}`)).data;
          if (g.state === 'COMPLETE') return { ok: true, output: g.output && g.output.results };
          if (g.state === 'FAILED' || g.state === 'CANCELLED') return { ok: false, error: g.error || g.state };
        }
        return { ok: false, error: 'demorou demais; veja o resultado depois' };
      }),
      A('publish_place', 'deploy', 'Publica um arquivo .rbxl ou .rbxlx do espaço de trabalho como nova versão do lugar', { file: 'caminho do arquivo .rbxl/.rbxlx', place_id: 'opcional', type: 'Saved ou Published (padrão Saved)' }, async (h, p, ctx, c) => {
        need(p, 'file'); const place = p.place_id || c.place_id; if (!/^\d+$/.test(String(place || ''))) throw new Error('falta o Place ID (configure no conector)');
        const full = tools.safePath(ctx.ws, p.file); if (!/\.rbxlx?$/i.test(full)) throw new Error('precisa ser .rbxl ou .rbxlx');
        const r = (await h('POST', `/universes/v1/${c.universe_id}/places/${place}/versions`, { query: { versionType: p.type === 'Published' ? 'Published' : 'Saved' }, body: fs.readFileSync(full), headers: { 'Content-Type': /x$/i.test(full) ? 'application/xml' : 'application/octet-stream' } })).data;
        return { ok: true, version: r.versionNumber };
      }),
    ],
  },

  /* ===== Tarefas e dados ===== */
  {
    id: 'linear', name: 'Linear', cat: 'tasks', fields: TOKEN, help: 'https://linear.app/settings/account/security', perms: ['read', 'write'],
    base: 'https://api.linear.app/graphql', headers: (c) => ({ Authorization: c.token }),
    gql: async (h, query, variables) => { const r = await h('POST', '', { body: { query, variables } }); if (r.data && r.data.errors) throw new Error(r.data.errors.map((e) => e.message).join('; ')); return r.data.data; },
    check: async (h, conn) => (await conn.gql(h, '{ viewer { name } }')).viewer.name || 'Linear',
    actions: (conn) => [
      A('list_teams', 'read', 'Lista os times', {}, async (h) => (await conn.gql(h, '{ teams { nodes { id name key } } }')).teams.nodes),
      A('list_issues', 'read', 'Lista as issues mais recentes', {}, async (h) => (await conn.gql(h, '{ issues(first: 25, orderBy: updatedAt) { nodes { id identifier title state { name } url } } }')).issues.nodes),
      A('create_issue', 'write', 'Cria uma issue', { team_id: 'id do time', title: '', description: '' }, async (h, p) => { need(p, 'team_id', 'title'); return (await conn.gql(h, 'mutation($i:IssueCreateInput!){ issueCreate(input:$i){ issue { identifier url } } }', { i: { teamId: p.team_id, title: p.title, description: p.description || '' } })).issueCreate.issue; }),
    ],
  },
  {
    id: 'todoist', name: 'Todoist', cat: 'tasks', fields: TOKEN, help: 'https://app.todoist.com/app/settings/integrations/developer', perms: ['read', 'write', 'delete'],
    base: 'https://api.todoist.com/rest/v2', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    check: async (h) => 'Todoist (' + (await h('GET', '/projects')).data.length + ' projetos)',
    actions: () => [
      A('list_projects', 'read', 'Lista os projetos', {}, async (h) => (await h('GET', '/projects')).data.map((x) => ({ id: x.id, name: x.name }))),
      A('list_tasks', 'read', 'Lista as tarefas abertas', { project_id: 'opcional' }, async (h, p) => (await h('GET', '/tasks', { query: { project_id: p.project_id } })).data.map((t) => ({ id: t.id, content: t.content, due: t.due && t.due.string }))),
      A('create_task', 'write', 'Cria uma tarefa', { content: 'texto', due_string: 'ex.: amanhã às 9h (opcional)', project_id: 'opcional' }, async (h, p) => { need(p, 'content'); const r = (await h('POST', '/tasks', { body: { content: p.content, due_string: p.due_string, due_lang: 'pt', project_id: p.project_id } })).data; return { id: r.id, url: r.url }; }),
      A('complete_task', 'write', 'Marca uma tarefa como feita', { task_id: 'id' }, async (h, p) => { need(p, 'task_id'); await h('POST', `/tasks/${encodeURIComponent(p.task_id)}/close`); return { ok: true }; }),
      A('delete_task', 'delete', 'Apaga uma tarefa', { task_id: 'id' }, async (h, p) => { need(p, 'task_id'); await h('DELETE', `/tasks/${encodeURIComponent(p.task_id)}`); return { ok: true }; }),
    ],
  },
  {
    id: 'trello', name: 'Trello', cat: 'tasks', fields: [{ k: 'key', type: 'password', label: 'f_key' }, { k: 'token', type: 'password', label: 'f_token' }], help: 'https://trello.com/power-ups/admin', perms: ['read', 'write'],
    base: 'https://api.trello.com/1', headers: () => ({}),
    check: async (h, conn, c) => '@' + (await h('GET', '/members/me', { query: { key: c.key, token: c.token } })).data.username,
    actions: () => [
      A('list_boards', 'read', 'Lista os quadros', {}, async (h, p, ctx, c) => (await h('GET', '/members/me/boards', { query: { key: c.key, token: c.token, fields: 'name,url' } })).data),
      A('list_cards', 'read', 'Lista os cartões de um quadro', { board_id: 'id do quadro' }, async (h, p, ctx, c) => { need(p, 'board_id'); return (await h('GET', `/boards/${encodeURIComponent(p.board_id)}/cards`, { query: { key: c.key, token: c.token, fields: 'name,idList,url' } })).data; }),
      A('list_lists', 'read', 'Lista as colunas de um quadro', { board_id: 'id do quadro' }, async (h, p, ctx, c) => { need(p, 'board_id'); return (await h('GET', `/boards/${encodeURIComponent(p.board_id)}/lists`, { query: { key: c.key, token: c.token, fields: 'name' } })).data; }),
      A('create_card', 'write', 'Cria um cartão numa coluna', { list_id: 'id da coluna', name: '', desc: '' }, async (h, p, ctx, c) => { need(p, 'list_id', 'name'); const r = (await h('POST', '/cards', { query: { key: c.key, token: c.token, idList: p.list_id, name: p.name, desc: p.desc || '' } })).data; return { id: r.id, url: r.url }; }),
    ],
  },
  {
    id: 'airtable', name: 'Airtable', cat: 'tasks', fields: TOKEN, help: 'https://airtable.com/create/tokens', perms: ['read', 'write', 'delete'],
    base: 'https://api.airtable.com/v0', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    check: async (h) => (await h('GET', '/meta/whoami')).data.email || 'Airtable',
    actions: () => [
      A('list_bases', 'read', 'Lista as bases', {}, async (h) => (await h('GET', '/meta/bases')).data.bases.map((b) => ({ id: b.id, name: b.name }))),
      A('list_records', 'read', 'Lista registros de uma tabela', { base_id: 'id da base', table: 'nome ou id da tabela' }, async (h, p) => { need(p, 'base_id', 'table'); return (await h('GET', `/${encodeURIComponent(p.base_id)}/${encodeURIComponent(p.table)}`, { query: { maxRecords: 25 } })).data.records; }),
      A('create_record', 'write', 'Cria um registro', { base_id: '', table: '', fields: 'objeto {coluna: valor}' }, async (h, p) => { need(p, 'base_id', 'table', 'fields'); return (await h('POST', `/${encodeURIComponent(p.base_id)}/${encodeURIComponent(p.table)}`, { body: { fields: p.fields } })).data; }),
      A('update_record', 'write', 'Altera um registro', { base_id: '', table: '', record_id: '', fields: 'objeto' }, async (h, p) => { need(p, 'base_id', 'table', 'record_id', 'fields'); return (await h('PATCH', `/${encodeURIComponent(p.base_id)}/${encodeURIComponent(p.table)}/${encodeURIComponent(p.record_id)}`, { body: { fields: p.fields } })).data; }),
      A('delete_record', 'delete', 'Apaga um registro', { base_id: '', table: '', record_id: '' }, async (h, p) => { need(p, 'base_id', 'table', 'record_id'); await h('DELETE', `/${encodeURIComponent(p.base_id)}/${encodeURIComponent(p.table)}/${encodeURIComponent(p.record_id)}`); return { ok: true }; }),
    ],
  },
  {
    id: 'cloudflare', name: 'Cloudflare', cat: 'host', fields: TOKEN, help: 'https://dash.cloudflare.com/profile/api-tokens', perms: ['read', 'write', 'delete'],
    base: 'https://api.cloudflare.com/client/v4', headers: (c) => ({ Authorization: 'Bearer ' + c.token }),
    check: async (h) => 'Cloudflare (' + (await h('GET', '/user/tokens/verify')).data.result.status + ')',
    actions: () => [
      A('list_zones', 'read', 'Lista os domínios', {}, async (h) => (await h('GET', '/zones', { query: { per_page: 30 } })).data.result.map((z) => ({ id: z.id, name: z.name, status: z.status }))),
      A('list_dns', 'read', 'Lista os registros DNS de um domínio', { zone_id: 'id do domínio' }, async (h, p) => { need(p, 'zone_id'); return (await h('GET', `/zones/${encodeURIComponent(p.zone_id)}/dns_records`, { query: { per_page: 50 } })).data.result.map((r) => ({ id: r.id, type: r.type, name: r.name, content: r.content })); }),
      A('create_dns', 'write', 'Cria um registro DNS', { zone_id: '', type: 'A, CNAME, TXT...', name: '', content: '', proxied: 'true/false' }, async (h, p) => { need(p, 'zone_id', 'type', 'name', 'content'); return (await h('POST', `/zones/${encodeURIComponent(p.zone_id)}/dns_records`, { body: { type: p.type, name: p.name, content: p.content, ttl: 1, proxied: p.proxied === true || p.proxied === 'true' } })).data.result; }),
      A('delete_dns', 'delete', 'Apaga um registro DNS', { zone_id: '', record_id: '' }, async (h, p) => { need(p, 'zone_id', 'record_id'); await h('DELETE', `/zones/${encodeURIComponent(p.zone_id)}/dns_records/${encodeURIComponent(p.record_id)}`); return { ok: true }; }),
    ],
  },

  /* ===== Qualquer lugar ===== */
  {
    id: 'mcp', name: 'Servidor MCP', cat: 'other', dynamic: true, perms: ['read', 'write'],
    fields: [{ k: 'url', type: 'url', label: 'f_url' }, { k: 'token', type: 'password', label: 'f_token_opt', optional: true }], help: 'https://modelcontextprotocol.io',
    // Qualquer servidor MCP remoto (Streamable HTTP). As ferramentas dele viram ferramentas da IA.
    rpc: async (c, method, params, session, id, signal) => {
      await tools.assertPublicUrl(c.url);
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-06-18', 'User-Agent': 'ORVEX/1.0' };
      if (c.token) headers.Authorization = 'Bearer ' + c.token; if (session) headers['Mcp-Session-Id'] = session;
      const r = await fetch(c.url, { method: 'POST', headers, redirect: 'error', signal, body: JSON.stringify(id === undefined ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id, method, params }) });
      const sid = r.headers.get('mcp-session-id') || session;
      if (!r.ok) throw new Error(redact(`HTTP ${r.status}${r.status === 401 || r.status === 403 ? ' (token inválido ou sem permissão)' : ''}`, c));
      if (id === undefined) return { sid };
      const text = Buffer.from(await r.arrayBuffer()).subarray(0, 4_000_000).toString('utf8'); let msg;
      if (/event-stream/.test(r.headers.get('content-type') || '')) {
        for (const block of text.split(/\n\n/)) { const d = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join(''); if (!d) continue; try { const j = JSON.parse(d); if (j.id === id) { msg = j; break; } } catch {} }
      } else { try { msg = JSON.parse(text); } catch {} }
      if (!msg) throw new Error('resposta MCP inválida'); if (msg.error) throw new Error(String(msg.error.message || 'erro do servidor MCP').slice(0, 300));
      return { sid, result: msg.result };
    },
    session: async (conn, c, signal, fn) => {
      const i = await conn.rpc(c, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ORVEX', version: '1.0' } }, null, 1, signal);
      await conn.rpc(c, 'notifications/initialized', {}, i.sid, undefined, signal);
      return fn(i.sid);
    },
    discover: async (conn, c, signal) => conn.session(conn, c, signal, async (sid) => {
      const r = (await conn.rpc(c, 'tools/list', {}, sid, 2, signal)).result;
      return (r.tools || []).slice(0, 60).map((t) => ({ name: t.name, description: String(t.description || '').slice(0, 200), readOnly: !!(t.annotations && t.annotations.readOnlyHint), schema: t.inputSchema && t.inputSchema.properties ? Object.keys(t.inputSchema.properties).join(', ') : '' }));
    }),
  },
  {
    id: 'custom', name: 'API personalizada', cat: 'other', dynamic: true, perms: ['read', 'write'],
    fields: [{ k: 'url', type: 'url', label: 'f_url' }, { k: 'header', type: 'text', label: 'f_header', optional: true }, { k: 'token', type: 'password', label: 'f_token_opt', optional: true }], help: '',
    base: (c) => c.url,
    headers: (c) => {
      if (!c.token) return {}; const h = (c.header || 'Authorization').trim();
      return { [h]: h.toLowerCase() === 'authorization' && !/^(Bearer|Basic|Token)\s/i.test(c.token) ? 'Bearer ' + c.token : c.token };
    },
    check: async (h) => { const r = await h('GET', '', { anyStatus: true }); if (r.status >= 500) throw new Error('o site respondeu HTTP ' + r.status); return 'HTTP ' + r.status; },
    permOf: (action, p) => (/^(GET|HEAD)$/i.test(String(p.method || 'GET')) ? 'read' : 'write'),
    actions: () => [
      A('request', 'read|write', 'Faz uma requisição HTTP para o site conectado. GET só lê; POST, PUT, PATCH e DELETE alteram dados.', { method: 'GET, POST...', path: 'ex.: /users', query: 'objeto (opcional)', body: 'objeto (opcional)' }, async (h, p) => {
        const m = String(p.method || 'GET').toUpperCase(); if (!/^(GET|HEAD|POST|PUT|PATCH|DELETE)$/.test(m)) throw new Error('método inválido');
        const pth = String(p.path || ''); if (pth && !pth.startsWith('/') && !pth.startsWith('?')) throw new Error('"path" precisa começar com /');
        const r = await h(m, pth, { query: p.query, body: p.body, anyStatus: true }); return { status: r.status, data: r.data };
      }),
    ],
  },
];
const BY_ID = Object.fromEntries(CATALOG.map((c) => [c.id, c]));
const DEFAULT_ON = { read: 'allow' };
const modeOf = (p, perm) => (p[perm] === true || p[perm] === 'allow' ? 'allow' : p[perm] === 'ask' ? 'ask' : 'off'); // true/false antigos continuam valendo

/* ---------- dados do usuário ---------- */
function row(userId, kind) { return q.one('SELECT * FROM connectors WHERE user_id=? AND kind=?', userId, kind); }
function readSecret(r) { try { return JSON.parse(dec(r.secret)); } catch { return null; } }
function permsOf(r) { try { return { ...DEFAULT_ON, ...JSON.parse(r.perms || '{}') }; } catch { return { ...DEFAULT_ON }; } }
function metaOf(r) { try { return JSON.parse(r.meta || 'null'); } catch { return null; } }
function actionsOf(conn, r) {
  if (conn.id === 'mcp') return (metaOf(r) || []).map((t) => ({ id: t.name, perm: t.readOnly ? 'read' : 'write', desc: t.description, params: t.schema }));
  return conn.actions(conn);
}

function view(userId, conn) {
  const r = row(userId, conn.id); const p = r ? permsOf(r) : null; const acts = r ? actionsOf(conn, r) : (conn.id === 'mcp' ? [] : conn.actions(conn));
  return {
    id: conn.id, name: conn.name, cat: conn.cat, help: conn.help || '', fields: conn.fields, connected: !!r, label: r ? r.label || '' : '',
    perms: conn.perms.map((id) => ({ id, on: !!(p && modeOf(p, id) !== 'off'), mode: p ? modeOf(p, id) : 'off', actions: acts.filter((a) => a.perm.split('|').includes(id)).map((a) => a.id) })),
  };
}
const list = (userId) => CATALOG.map((c) => view(userId, c));

async function connect(userId, kind, fields, signal) {
  const conn = BY_ID[kind]; if (!conn) throw fail(404, 'Conector não existe');
  const c = {}; for (const f of conn.fields) {
    const v = String((fields && fields[f.k]) || '').trim().slice(0, 2000);
    if (!v && !f.optional) throw fail(400, 'Preencha todos os campos.', 'fields'); if (v) c[f.k] = v;
  }
  if (c.url && !/^https?:\/\//i.test(c.url)) throw fail(400, 'O endereço precisa começar com https://', 'url');
  let label, meta = null;
  try {
    if (conn.id === 'mcp') { meta = await conn.discover(conn, c, signal); label = new URL(c.url).host + ' · ' + meta.length + ' ferramentas'; }
    else label = await conn.check((m, pth, o) => http(conn, c, m, pth, { ...o, signal }), conn, c);
    if (conn.id === 'custom') label = new URL(c.url).host;
  } catch (e) { throw fail(400, 'Não consegui conectar: ' + redact(e.message, c), 'connect'); }
  const old = row(userId, kind);
  q.run('INSERT INTO connectors(user_id,kind,secret,label,perms,meta,ts) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET secret=excluded.secret,label=excluded.label,meta=excluded.meta,ts=excluded.ts',
    userId, kind, enc(JSON.stringify(c)), String(label || conn.name).slice(0, 80), old ? old.perms : JSON.stringify(DEFAULT_ON), meta ? JSON.stringify(meta) : null, Date.now());
  return view(userId, conn);
}

function setPerms(userId, kind, perms) {
  const conn = BY_ID[kind]; const r = row(userId, kind); if (!conn || !r) throw fail(404, 'Conector não está ligado');
  const cur = permsOf(r); const MODES = ['allow', 'ask', 'off'];
  if (perms && MODES.includes(perms.all)) for (const id of conn.perms) cur[id] = perms.all; // "permitir tudo", "perguntar tudo" ou "bloquear tudo"
  else for (const id of conn.perms) { const v = perms && perms[id]; if (typeof v === 'boolean') cur[id] = v ? 'allow' : 'off'; else if (MODES.includes(v)) cur[id] = v; }
  q.run('UPDATE connectors SET perms=? WHERE user_id=? AND kind=?', JSON.stringify(cur), userId, kind);
  return view(userId, conn);
}
function disconnect(userId, kind) { q.run('DELETE FROM connectors WHERE user_id=? AND kind=?', userId, kind); }

/* ---------- uso pela IA ---------- */
const PERM_PT = { read: 'ler', write: 'criar e alterar', deploy: 'hospedar', delete: 'apagar', send: 'enviar mensagens', issues: 'abrir e comentar issues', pulls: 'criar e juntar pull requests', run: 'rodar código' };

/** Texto para o prompt da IA: o que está ligado e o que cada ação precisa. */
function promptFor(userId) {
  const lines = [];
  for (const r of q.all('SELECT * FROM connectors WHERE user_id=?', userId)) {
    const conn = BY_ID[r.kind]; if (!conn) continue; const p = permsOf(r); const acts = actionsOf(conn, r);
    const ok = acts.filter((a) => a.perm.split('|').some((x) => modeOf(p, x) !== 'off')); const blocked = conn.perms.filter((x) => modeOf(p, x) === 'off').map((x) => PERM_PT[x] || x);
    const fmt = (a) => `${a.id}(${typeof a.params === 'string' ? a.params : Object.keys(a.params || {}).join(', ')})`;
    lines.push(`- ${conn.id} (${conn.name}): ${ok.map(fmt).join('; ') || 'nenhuma ação liberada'}${blocked.length ? `. Bloqueado pelo usuário: ${blocked.join(', ')}` : ''}`);
  }
  return lines.length ? 'Conectores ligados (use a ferramenta connector com connector, action e params):\n' + lines.join('\n') + '\nSe uma ação estiver marcada para perguntar, o app pergunta ao usuário sozinho: apenas chame a ação. Se precisar de algo bloqueado, diga ao usuário para liberar em Menu > Conectores.' : '';
}

async function execute(ctx, kind, action, params) {
  const conn = BY_ID[String(kind || '').toLowerCase()];
  if (!conn) return 'ERRO: conector desconhecido. Disponíveis: ' + CATALOG.map((c) => c.id).join(', ');
  const r = row(ctx.user.id, conn.id);
  if (!r) return `ERRO: o conector ${conn.name} não está ligado. O usuário liga em Menu > Conectores > ${conn.name}.`;
  const c = readSecret(r); if (!c) return 'ERRO: não consegui abrir o token deste conector. O usuário precisa ligar de novo.';
  const p = params && typeof params === 'object' ? params : {};
  let a;
  if (conn.id === 'mcp') {
    const t = (metaOf(r) || []).find((x) => x.name === action);
    if (!t) return 'ERRO: ferramenta desconhecida. Disponíveis: ' + (metaOf(r) || []).map((x) => x.name).join(', ');
    a = { id: t.name, perm: t.readOnly ? 'read' : 'write' };
  } else {
    a = conn.actions(conn).find((x) => x.id === action);
    if (!a) return `ERRO: ação desconhecida. Disponíveis em ${conn.name}: ` + conn.actions(conn).map((x) => x.id).join(', ');
  }
  const perm = conn.permOf ? conn.permOf(a, p) : a.perm;
  const mode = modeOf(permsOf(r), perm);
  if (mode === 'ask' && ctx.ask) {
    const ans = await ctx.ask({ connector: conn.name, action: a.id, perm: PERM_PT[perm] || perm, detail: Object.entries(p).slice(0, 4).map(([k, v]) => k + ': ' + String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 80)).join(' · ') });
    if (ans === 'deny') return `NEGADO: o usuário não deixou fazer "${a.id}" no ${conn.name} agora. Não tente de novo, avise que não foi feito.`;
    if (ans === 'always') { try { setPerms(ctx.user.id, conn.id, { [perm]: 'allow' }); } catch {} }
  } else if (mode !== 'allow') return `BLOQUEADO: o usuário não permitiu "${PERM_PT[perm] || perm}" no ${conn.name}. Diga a ele para ativar em Menu > Conectores > ${conn.name} e tentar de novo. Não faça de outro jeito.`;
  ctx.emit({ type: 'status', key: perm === 'deploy' ? 'host' : 'useConn', arg: perm === 'deploy' ? conn.name : conn.name + ' · ' + a.id });
  try {
    let out;
    if (conn.id === 'mcp') {
      out = await conn.session(conn, c, ctx.signal, async (sid) => {
        const res = (await conn.rpc(c, 'tools/call', { name: a.id, arguments: p.arguments && typeof p.arguments === 'object' ? p.arguments : p }, sid, 3, ctx.signal)).result;
        const txt = (res.content || []).map((x) => (x.type === 'text' ? x.text : `[${x.type}]`)).join('\n');
        return res.isError ? Promise.reject(new Error(txt || 'erro da ferramenta')) : txt;
      });
    } else out = await a.run((m, pth, o) => http(conn, c, m, pth, { ...o, signal: ctx.signal }), p, ctx, c);
    return clip(typeof out === 'string' ? out : JSON.stringify(out, null, 1), 12000);
  } catch (e) { return 'ERRO: ' + redact(e.message || String(e), c); }
}

module.exports = { CATALOG, list, connect, setPerms, disconnect, promptFor, execute };
