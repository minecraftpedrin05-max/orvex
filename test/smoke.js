'use strict';
// Teste de fumaça: sobe o servidor com o modelo de mentira e passa por login, chat, pastas, projetos e códigos.
const os = require('os'); const fs = require('fs'); const path = require('path'); const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'orvex-'));
process.env.MODEL_PROVIDER = 'mock'; process.env.ALLOW_PRIVATE_URLS = '1'; process.env.IMAGE_DAILY_LIMIT = '2'; process.env.ALLOW_DEV_CODES = '1'; process.env.EXEC_MODE = 'local';
const { server } = require('../server/index.js');

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port; let token = '';
  const api = async (m, p, body, raw) => {
    const r = await fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (raw) return r; const j = await r.json().catch(() => ({})); return { status: r.status, ...j };
  };
  const ok = (n) => console.log('  ok  ' + n);

  assert.equal((await api('GET', '/api/chats')).status, 401); ok('rotas exigem login');
  let r = await api('POST', '/api/auth/request', { email: 'teste@exemplo.com' }); assert(r.devCode); ok('código por e-mail');
  assert.equal((await api('POST', '/api/auth/verify', { email: 'teste@exemplo.com', code: '000000' })).status, 400); ok('código errado é recusado');
  r = await api('POST', '/api/auth/verify', { email: 'teste@exemplo.com', code: r.devCode }); assert(r.token && r.isNew); token = r.token; ok('login por código');
  assert.equal((await api('POST', '/api/auth/profile', { name: 'Ana', birth: '2020-01-01' })).status, 403); ok('menor de 13 é recusado');
  r = await api('POST', '/api/auth/profile', { name: 'Ana', birth: '2000-05-10', lang: 'pt' }); assert(r.user.complete); ok('nome e nascimento');

  const send = async (id, body) => {
    const res = await fetch(base + '/api/chats/' + id + '/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
    assert.equal(res.status, 200); const text = await res.text();
    return text.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  };
  let ev = await send('chat0001', { text: 'oi, tudo bem?', speed: 'fast', lang: 'pt' });
  assert(ev.some((e) => e.type === 'delta') && ev.at(-1).type === 'done'); ok('chat responde em streaming');

  ev = await send('chat0002', { text: 'crie uma pasta com um site', speed: 'slow', lang: 'pt' });
  const keys = ev.filter((e) => e.type === 'status').map((e) => e.key); assert(keys.includes('make') && keys.includes('run')); ok('modo devagar escreve e roda no terminal');
  const pres = ev.find((e) => e.type === 'present'); assert(pres && pres.kind === 'folder' && pres.name === 'meu-site'); ok('pasta entregue como cartão');
  ev = await send('chat0003', { text: 'crie uma pasta com um site', speed: 'fast' });
  assert(!ev.some((e) => e.type === 'status' && e.key === 'run')); ok('modo rápido não usa o terminal');

  const tree = await api('GET', '/api/files/tree?chat=chat0002&path=meu-site'); assert(tree.items.some((i) => i.name === 'index.html')); ok('lista de arquivos da pasta');
  const view = await api('GET', '/api/files/view?chat=chat0002&path=meu-site/index.html'); assert(/ORVEX/.test(view.text)); ok('ver conteúdo do arquivo (olho)');
  const trav = await api('GET', '/api/files/view?chat=chat0002&path=../../../etc/passwd'); assert(trav.status === 400 && !trav.text); ok('não deixa sair da pasta');
  const link = await api('POST', '/api/files/link', { chat: 'chat0002', path: 'meu-site', download: true });
  const z = await fetch(base + link.url); assert.equal(z.headers.get('content-type'), 'application/zip');
  const zb = Buffer.from(await z.arrayBuffer()); assert.equal(zb.readUInt32LE(0), 0x04034b50); fs.writeFileSync(path.join(process.env.DATA_DIR, 't.zip'), zb);
  const un = require('child_process').spawnSync('unzip', ['-t', path.join(process.env.DATA_DIR, 't.zip')], { encoding: 'utf8' }); assert(/No errors/.test(un.stdout), un.stdout); ok('botão instalar gera .zip válido');
  assert.equal((await fetch(base + '/dl/xxx.yyy')).status, 403); ok('link inválido é recusado');

  const hist = await api('GET', '/api/chats/chat0002'); assert(hist.messages.length === 2 && hist.messages[1].parts[0].kind === 'folder'); ok('histórico guarda mensagens e pasta');
  assert((await api('GET', '/api/chats')).chats.length === 3); ok('lista de chats');

  r = await api('POST', '/api/projects', { name: 'Loja', type: 'site' }); const pid = r.project.id;
  ev = await send('chat0004', { text: 'oi', project_id: pid, speed: 'fast' });
  assert((await api('GET', '/api/chats')).chats.find((c) => c.id === 'chat0004').project_id === pid); ok('chat dentro de projeto');
  r = await api('POST', '/api/codes', { name: 'ola', lang: 'python', code: 'print(1)' }); assert((await api('GET', '/api/codes')).codes.length === 1); ok('salvar e listar códigos');

  const up = await fetch(base + '/api/upload', { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'X-File-Name': 'nota.txt', 'Content-Type': 'text/plain' }, body: 'conteudo do anexo' }).then((x) => x.json());
  ev = await send('chat0005', { text: 'leia', attachments: [up.id], speed: 'fast' }); assert(ev.at(-1).type === 'done'); ok('anexos');

  const other = await (await fetch(base + '/api/auth/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'outro@exemplo.com' }) })).json();
  const o = await (await fetch(base + '/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'outro@exemplo.com', code: other.devCode }) })).json();
  const forbidden = await fetch(base + '/api/chats/chat0002', { headers: { Authorization: 'Bearer ' + o.token } }); assert.equal(forbidden.status, 404); ok('um usuário não vê chats de outro');


  /* ---------- visão automática, modelo de código, imagem ---------- */
  const agentMod = require('../server/agent');
  const cfgMod = require('../server/config');
  assert.equal(agentMod.pickModel('crie um site em html', null, 'mid'), cfgMod.codeModels.mid);
  assert.equal(agentMod.pickModel('qual a capital da França?', null, 'mid'), cfgMod.models.mid);
  assert.equal(agentMod.pickModel('oi', { type: 'game' }, 'fast'), cfgMod.codeModels.fast); ok('pedido de código usa o modelo de código');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const upi = await fetch(base + '/api/upload', { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'X-File-Name': 'foto.png', 'Content-Type': 'image/png' }, body: png }).then((x) => x.json());
  ev = await send('chat0006', { text: 'o que tem na foto?', attachments: [upi.id], speed: 'fast' });
  assert(ev.some((e) => e.type === 'status' && e.key === 'vision')); assert(ev.filter((e) => e.type === 'delta').map((e) => e.text).join('').includes('imagem de teste')); ok('foto liga o modelo de visão e a descrição chega na IA');
  ev = await send('chat0007', { text: 'oi sem foto', speed: 'fast' }); assert(!ev.some((e) => e.key === 'vision')); ok('sem foto, a visão não liga');
  const img1 = await send('chat0008', { text: 'desenhe uma imagem de um gato', speed: 'fast' });
  assert(img1.some((e) => e.type === 'present' && e.kind === 'image')); ok('gerar imagem mostra a imagem no chat');
  await send('chat0009', { text: 'desenhe uma imagem de um cachorro', speed: 'fast' });
  const img3 = await send('chat0010', { text: 'desenhe uma imagem de um pato', speed: 'fast' });
  assert(!img3.some((e) => e.type === 'present') && img3.filter((e) => e.type === 'delta').map((e) => e.text).join('').includes('LIMITE')); ok('limite diário de imagens (2) bloqueia a terceira');

  /* ---------- conectores ---------- */
  const list = (await api('GET', '/api/connectors')).connectors;
  for (const id of ['github', 'railway', 'netlify', 'vercel', 'huggingface', 'discord', 'telegram', 'slack', 'notion', 'mcp', 'custom']) assert(list.find((c) => c.id === id), id);
  const rw = list.find((c) => c.id === 'railway'); assert.deepEqual(rw.perms.map((p) => p.id), ['read', 'deploy', 'delete']); assert(rw.perms.find((p) => p.id === 'deploy').actions.includes('deploy_from_github')); ok('catálogo: opções mudam conforme o site (Railway tem hospedar)');
  assert.deepEqual(list.find((c) => c.id === 'discord').perms.map((p) => p.id), ['read', 'send']);

  // site falso que imita GitHub, Netlify e uma API qualquer
  const realFetch = globalThis.fetch; const seen = [];
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    if (url.startsWith('https://api.github.com') || url.startsWith('https://api.netlify.com')) {
      seen.push({ url, method: o.method || 'GET', headers: o.headers, body: o.body });
      const J = (d, st = 200) => new Response(JSON.stringify(d), { status: st, headers: { 'content-type': 'application/json' } });
      if (!/Bearer tok-ok/.test(o.headers.Authorization)) return J({ message: 'Bad credentials' }, 401);
      if (url.endsWith('/user') && url.includes('github')) return J({ login: 'ana' });
      if (url.includes('/user/repos')) return J([{ full_name: 'ana/site', private: true, description: 'meu site', pushed_at: '2026-01-01' }]);
      if (url.includes('/contents/')) return (o.method === 'PUT') ? J({ content: { html_url: 'https://github.com/ana/site/blob/main/a.txt' } }) : J({ message: 'Not Found' }, 404);
      if (url.endsWith('/user') && url.includes('netlify')) return J({ email: 'ana@exemplo.com' });
      if (url.endsWith('/sites') && o.method === 'POST') return J({ id: 'site1', ssl_url: 'https://meu-site.netlify.app' });
      if (url.includes('/sites/site1/deploys')) return J({ state: 'uploading', ssl_url: 'https://meu-site.netlify.app' });
    }
    return realFetch(u, o);
  };
  let bad = await api('POST', '/api/connectors/github/connect', { fields: { token: 'tok-ruim' } }); assert.equal(bad.status, 400); assert(/Não consegui conectar/.test(bad.error) && !bad.error.includes('tok-ruim')); ok('token errado é recusado sem vazar o token');
  let con = await api('POST', '/api/connectors/github/connect', { fields: { token: 'tok-ok' } }); assert.equal(con.connector.label, '@ana');
  assert.deepEqual(con.connector.perms.map((p) => [p.id, p.on]), [['read', true], ['write', false]]); ok('conectar GitHub: ler ligado, escrever desligado por padrão');
  const dbx = require('../server/db'); const raw = dbx.q.one("SELECT secret FROM connectors WHERE kind='github'").secret; assert(!raw.includes('tok-ok') && !Buffer.from(raw, 'base64').toString('latin1').includes('tok-ok')); ok('token fica criptografado no banco');
  assert(!JSON.stringify(await api('GET', '/api/connectors')).includes('tok-ok')); ok('token nunca volta para o app');

  ev = await send('chat0011', { text: 'liste meus repositorios do github', speed: 'mid' });
  let txt = ev.filter((e) => e.type === 'delta').map((e) => e.text).join(''); assert(txt.includes('ana/site')); ok('IA lista repositórios pelo conector');
  ev = await send('chat0012', { text: 'escreva um arquivo no github', speed: 'mid' });
  txt = ev.filter((e) => e.type === 'delta').map((e) => e.text).join(''); assert(txt.includes('BLOQUEADO') && txt.includes('Menu > Conectores')); ok('ação bloqueada: IA é avisada e manda o usuário liberar nas configurações');
  await api('POST', '/api/connectors/github/perms', { perms: { write: true } });
  ev = await send('chat0013', { text: 'escreva um arquivo no github', speed: 'mid' });
  txt = ev.filter((e) => e.type === 'delta').map((e) => e.text).join(''); assert(txt.includes('"ok": true') || txt.includes('blob/main/a.txt'), txt); ok('depois de liberar nas configurações, a ação funciona');
  assert(seen.some((x) => x.method === 'PUT' && JSON.parse(x.body).content === Buffer.from('oi').toString('base64'))); 

  await api('POST', '/api/connectors/netlify/connect', { fields: { token: 'tok-ok' } });
  ev = await send('chat0014', { text: 'hospede no netlify', speed: 'mid' });
  txt = ev.filter((e) => e.type === 'delta').map((e) => e.text).join(''); assert(txt.includes('BLOQUEADO') && txt.includes('hospedar')); assert(!ev.some((e) => e.key === 'host')); ok('hospedar vem bloqueado até o usuário permitir');
  await api('POST', '/api/connectors/netlify/perms', { perms: { deploy: true } });
  ev = await send('chat0015', { text: 'hospede no netlify', speed: 'mid' });
  txt = ev.filter((e) => e.type === 'delta').map((e) => e.text).join(''); assert(txt.includes('meu-site.netlify.app'), txt); assert(ev.some((e) => e.type === 'status' && e.key === 'host' && e.arg === 'Netlify')); ok('hospedar no Netlify (zip da pasta) com status "Hospedando"');
  const dep = seen.find((x) => x.url.includes('/deploys')); assert.equal(dep.headers['Content-Type'], 'application/zip'); assert.equal(Buffer.from(dep.body).readUInt32LE(0), 0x04034b50);
  fs.writeFileSync(path.join(process.env.DATA_DIR, 'n.zip'), Buffer.from(dep.body)); const lz = require('child_process').spawnSync('unzip', ['-l', path.join(process.env.DATA_DIR, 'n.zip')], { encoding: 'utf8' }); assert(/\bindex\.html\b/.test(lz.stdout) && !/site-net\/index/.test(lz.stdout)); ok('o zip enviado tem index.html na raiz');
  globalThis.fetch = realFetch;

  // API personalizada e servidor MCP de verdade (sobem aqui mesmo)
  const http2 = require('http'); const hits = [];
  const fake = http2.createServer((rq, rs) => {
    let b = ''; rq.on('data', (d) => (b += d)); rq.on('end', () => {
      hits.push({ m: rq.method, u: rq.url, a: rq.headers.authorization, b });
      if (rq.url === '/mcp') {
        const j = JSON.parse(b || '{}'); const out = (r) => { rs.writeHead(200, { 'content-type': 'text/event-stream', 'mcp-session-id': 's1' }); rs.end('event: message\ndata: ' + JSON.stringify({ jsonrpc: '2.0', id: j.id, result: r }) + '\n\n'); };
        if (j.method === 'initialize') return out({ protocolVersion: '2025-06-18', capabilities: {} });
        if (j.method === 'notifications/initialized') { rs.writeHead(202); return rs.end(); }
        if (j.method === 'tools/list') return out({ tools: [{ name: 'clima', description: 'Clima da cidade', annotations: { readOnlyHint: true }, inputSchema: { properties: { cidade: {} } } }, { name: 'apagar_tudo', description: 'Apaga', inputSchema: { properties: {} } }] });
        if (j.method === 'tools/call') return out({ content: [{ type: 'text', text: 'Sol em ' + j.params.arguments.cidade }] });
      }
      rs.writeHead(200, { 'content-type': 'application/json' }); rs.end('{"ok":true}');
    });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r)); const fb = 'http://127.0.0.1:' + fake.address().port;
  con = await api('POST', '/api/connectors/custom/connect', { fields: { url: fb, token: 'segredo123' } }); assert(con.connector.connected);
  const cx = { user: { id: dbx.q.one("SELECT id FROM users WHERE email='teste@exemplo.com'").id }, emit() {}, signal: new AbortController().signal, ws: process.env.DATA_DIR };
  const conns = require('../server/connectors');
  let r1 = await conns.execute(cx, 'custom', 'request', { method: 'GET', path: '/dados' }); assert(r1.includes('"ok": true')); assert(hits.at(-1).a === 'Bearer segredo123'); ok('API personalizada: GET liberado e token enviado como Bearer');
  r1 = await conns.execute(cx, 'custom', 'request', { method: 'POST', path: '/dados', body: { a: 1 } }); assert(r1.startsWith('BLOQUEADO')); ok('API personalizada: POST bloqueado até permitir');
  await api('POST', '/api/connectors/custom/perms', { perms: { write: true } }); r1 = await conns.execute(cx, 'custom', 'request', { method: 'POST', path: '/dados', body: { a: 1 } }); assert(r1.includes('"status": 200'));
  con = await api('POST', '/api/connectors/mcp/connect', { fields: { url: fb + '/mcp' } }); assert(con.connector.label.includes('2 ferramentas')); assert.deepEqual(con.connector.perms.map((p) => p.actions), [['clima'], ['apagar_tudo']]); ok('MCP: descobre as ferramentas e separa leitura de escrita');
  r1 = await conns.execute(cx, 'mcp', 'clima', { cidade: 'Recife' }); assert.equal(r1, 'Sol em Recife'); ok('MCP: chama ferramenta de leitura');
  r1 = await conns.execute(cx, 'mcp', 'apagar_tudo', {}); assert(r1.startsWith('BLOQUEADO')); ok('MCP: ferramenta que altera dados vem bloqueada');
  assert(/Bloqueado pelo usuário: criar e alterar/.test(conns.promptFor(cx.user.id))); ok('prompt da IA lista o que está liberado e o que está bloqueado');
  r1 = await conns.execute(cx, 'custom', 'request', { method: 'GET', path: '/x' }); fake.close();
  globalThis.fetch = async () => { throw new TypeError('x'); }; const cfgPrev = cfgMod.allowPrivateUrls; cfgMod.allowPrivateUrls = false;
  r1 = await conns.execute(cx, 'custom', 'request', { method: 'GET', path: '/x' }); assert(/bloqueado|Endereço/i.test(r1), r1); cfgMod.allowPrivateUrls = cfgPrev; globalThis.fetch = realFetch; ok('endereço da rede interna é bloqueado quando ALLOW_PRIVATE_URLS está desligado');
  await api('DELETE', '/api/connectors/custom'); assert(!(await api('GET', '/api/connectors')).connectors.find((c) => c.id === 'custom').connected); ok('desconectar apaga o token');
  const o2 = await (await fetch(base + '/api/connectors', { headers: { Authorization: 'Bearer ' + o.token } })).json(); assert(o2.connectors.every((c) => !c.connected)); ok('conectores de um usuário não aparecem para outro');

  // configurações da IA (só o dono)
  const od = await fetch(base + '/api/admin/settings', { headers: { Authorization: 'Bearer ' + o.token } }); assert.equal(od.status, 403); ok('quem não é dono não vê as configurações da IA');
  const execPrev = cfgMod.exec; const st = await api('GET', '/api/admin/settings'); assert(st.fields.find((f) => f.id === 'm_mid')); ok('dono vê as configurações da IA');
  let sv = await api('POST', '/api/admin/settings', { m_mid: 'qwen2.5:14b', modelKey: 'segredo123', exec: 'docker', i_size: 640 });
  assert.equal(cfgMod.models.mid, 'qwen2.5:14b'); assert.equal(cfgMod.exec, 'docker'); assert.equal(cfgMod.modelKey, 'segredo123'); assert.equal(sv.fields.find((f) => f.id === 'modelKey').value, '••••••••'); assert(!JSON.stringify(sv).includes('segredo123')); ok('salvar muda a IA na hora e esconde a chave');
  sv = await api('POST', '/api/admin/settings', { modelKey: '••••••••' }); assert.equal(cfgMod.modelKey, 'segredo123'); ok('chave escondida não sobrescreve a chave real');
  assert.equal((await api('POST', '/api/admin/settings', { exec: 'rm -rf' })).status, 400); assert.equal((await api('POST', '/api/admin/settings', { m_fast: 'a b' })).status, 400); assert.equal((await api('POST', '/api/admin/settings', { i_url: 'file:///etc' })).status, 400); assert.equal((await api('POST', '/api/admin/settings', { i_size: 99999 })).status, 400); ok('valores inválidos são recusados');
  await api('POST', '/api/admin/settings/reset', {}); assert.equal(cfgMod.exec, execPrev); assert.equal(cfgMod.modelKey, ''); ok('voltar ao padrão');

  assert((await fetch(base + '/')).status === 200);
  console.log('\nTudo certo.'); server.close(); process.exit(0);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
