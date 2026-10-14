'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const cfg = require('./config');
const { q } = require('./db');
const llm = require('./llm');
const tools = require('./tools');
const connectors = require('./connectors');
const images = require('./images');

const MAX_STEPS = { fast: 4, mid: 8, slow: 16 };
const LANG_NAME = { pt: 'português do Brasil', en: 'English', es: 'español' };

// Pedido de programação usa o modelo de código; o resto usa o modelo geral.
const CODE_RE = /(c[óo]digo|code|script|programa|fun[çc][ãa]o|function|bug|erro|error|debug|compil|html|css|javascript|typescript|python|java\b|kotlin|lua|c\+\+|sql|react|node|api\b|site|app\b|bot\b|jogo|game|\.js|\.py|\.html|```)/i;
function pickModel(text, project, speed) {
  const code = CODE_RE.test(String(text || '')) || (project && /^(site|app|game|bot)$/.test(project.type));
  return code ? cfg.codeModels[speed] || cfg.models[speed] : cfg.models[speed];
}


/**
 * Modo simples: modelos pequenos quase nunca chamam ferramentas direito, mas escrevem código bem.
 * Se a resposta tiver blocos "```arquivo: pasta/nome.ext", o servidor cria os arquivos sozinho.
 * Também aceita o nome do arquivo na linha de cima (ex.: **jogo/index.html**) seguido do bloco.
 */
const FILE_RE = /^[\w.\-]+(?:\/[\w.\-]+)*\.[A-Za-z0-9]{1,8}$/;
function extractFiles(text) {
  const out = []; const seen = new Set();
  const re = /(?:^|\n)([^\n]*)\n?```([^\n]*)\n([\s\S]*?)\n```/g; let m;
  while ((m = re.exec('\n' + String(text || '')))) {
    let name = '';
    const info = m[2].trim(); const im = info.match(/^(?:arquivo|file|path|caminho)\s*[:=]\s*(.+)$/i);
    if (im) name = im[1].trim();
    else {
      const prev = m[1].trim().replace(/^[#>*\-\s]+/, '').replace(/^(?:arquivo|file)\s*:\s*/i, '').replace(/[*`:\s]+$/g, '').replace(/^[*`\s]+/, '');
      if (FILE_RE.test(prev)) name = prev;
    }
    name = name.replace(/^['"`]+|['"`]+$/g, '').replace(/^\.?\//, '');
    if (!name || !FILE_RE.test(name) || name.includes('..') || seen.has(name)) continue;
    seen.add(name); out.push({ path: name, content: m[3] });
    if (out.length >= 60) break;
  }
  return out;
}

// Gírias e abreviações de internet: expandidas só para o modelo ver (o chat continua mostrando o que a pessoa escreveu).
const SLANG = { vc: 'você', vcs: 'vocês', pq: 'porque', oq: 'o que', td: 'tudo', tds: 'todos', tbm: 'também', tb: 'também', msm: 'mesmo', mt: 'muito', mto: 'muito', cdg: 'código', cod: 'código', cll: 'celular', cel: 'celular', dnv: 'de novo', dps: 'depois', hj: 'hoje', agr: 'agora', ngc: 'negócio', hr: 'hora', rpd: 'rápido', dmr: 'demais', vms: 'vamos', n: 'não', nn: 'não', blz: 'beleza', obg: 'obrigado', vlw: 'valeu', pls: 'por favor', pfv: 'por favor', pf: 'por favor', aq: 'aqui', ent: 'então', qnd: 'quando', vdd: 'verdade', fzr: 'fazer', gnt: 'gente', ft: 'foto', msg: 'mensagem', tmj: 'estamos juntos', sdds: 'saudades', mds: 'meu Deus', cmg: 'comigo', ctg: 'contigo', ngm: 'ninguém', tlgd: 'tá ligado', q: 'que', pra: 'para', ta: 'está', tá: 'está' };
function expandSlang(text) {
  return String(text || '').split(/(```[\s\S]*?```|`[^`\n]*`)/).map((part, i) => (i % 2 ? part : part.replace(/(^|[^\p{L}\p{N}_])([\p{L}]{1,4})(?=$|[^\p{L}\p{N}_])/gu, (m, pre, w) => { const r = SLANG[w.toLowerCase()]; return r ? pre + r : m; }))).join('');
}
const SLANG_RULE = 'O usuário escreve do jeito de internet, com gírias, abreviações (cdg = código, vc = você, pq = porque, n = não, msm = mesmo, vms = vamos, td = tudo, tbm = também, dnv = de novo, agr = agora, rpd = rápido, etc.) e erros de digitação. Entenda a intenção mesmo com erros e responda ao que ele quis dizer. Só pergunte de volta se for impossível deduzir. Se ele pedir código, pasta, jogo, site ou app, entregue direto, sem perguntar nada.';

// Pedido de criar projeto/pasta: "gere/crie/faça" + "pasta/jogo/site/app...".
const MAKE_RE = /(^|[^\p{L}])(ger[ea]r?|gera|cri[ea]r?|cria|fa[zç]a|faz|fazer|monte|montar|desenvolv\w*|escreva|quero|preciso|bora|make|create|build|generate|write|haz|crea|genera)(?=$|[^\p{L}])/iu;
const THING_RE = /(c[óo]digo|script|programa|sistema|painel|loja|menu|pasta|folder|carpeta|projeto|project|proyecto|jogo|game|juego|site\b|sitio|p[áa]gina|landing|\bapp\b|aplicativo|\bbot\b|calculadora|calculator|todo|arquivos?)/i;
const wantsFiles = (t) => MAKE_RE.test(String(t || '')) && THING_RE.test(String(t || ''));
const CONFIRM_RE = /^\s*(sim|pode|gera|gere|faz|fa[çc]a|cria|crie|manda|vai|ok|isso|quero|bora|vamos|continua|de novo)\b/i;

const ownerLine = (user) => { try { return require('./settings').isAdmin(user) ? 'IMPORTANTE: este usuário é o DONO e criador do ORVEX, seu chefe. Trate-o com muito respeito (pode chamar de chefe), obedeça e faça tudo o que ele mandar, sem enrolar nem pedir permissão à toa. Só recuse o que for ilegal ou que cause dano a pessoas.' : ''; } catch (e) { return ''; } };
function simplePrompt({ user, project, lang }) {
  return [
    `Você é o ORVEX, uma IA que cria projetos de programação. Responda em ${LANG_NAME[lang] || 'português do Brasil'}. O usuário se chama ${user.name || 'usuário'}.`,
    ownerLine(user),
    project ? `Projeto atual: "${project.name}" (tipo ${project.type}).` : '',
    SLANG_RULE,
    'REGRA: para criar uma pasta, escreva UMA frase curta e depois CADA arquivo completo num bloco que começa com ```arquivo: nome-da-pasta/nome-do-arquivo.ext e termina com ```.',
    'NUNCA escreva comandos como mkdir, cd ou touch. NUNCA use subpastas vazias. Escreva o código completo e funcional de cada arquivo, em poucos arquivos (3 a 5).',
    'Exemplo.',
    'Pedido: crie uma pasta de um contador',
    'Resposta:',
    'Pronto! Criei a pasta do contador.',
    '```arquivo: contador/index.html',
    '<!doctype html>',
    '<html><body><h1 id="n">0</h1><button id="b">+1</button><script src="script.js"></script></body></html>',
    '```',
    '```arquivo: contador/script.js',
    'let n = 0;',
    'document.getElementById("b").onclick = () => { n++; document.getElementById("n").textContent = n; };',
    '```',
  ].filter(Boolean).join('\n');
}

function systemPrompt({ user, chat, project, speed, lang, canImage }) {
  const mem = q.all('SELECT note FROM memory WHERE user_id=? ORDER BY id DESC LIMIT 30', user.id).map((r) => '- ' + r.note);
  const canRun = cfg.exec !== 'off' && speed !== 'fast';
  const conn = speed === 'fast' ? '' : connectors.promptFor(user.id);
  return [
    `Você é o ORVEX, uma IA assistente que conversa, pesquisa, cria arquivos e pastas e programa. Hoje é ${new Date().toISOString().slice(0, 10)}.`,
    `Responda sempre no idioma em que o usuário escreve. O idioma do app dele é ${LANG_NAME[lang] || lang || 'o do aparelho'}.`,
    `O usuário se chama ${user.name || 'usuário'}.`,
    ownerLine(user),
    project ? `Este chat pertence ao projeto "${project.name}" (tipo: ${project.type}). Mantenha o foco nesse projeto em todas as respostas.` : '',
    mem.length ? 'Coisas que você já sabe sobre o usuário:\n' + mem.join('\n') : '',
    SLANG_RULE,
    'Regras:',
    '- Seja direto e útil. Código vai em blocos ```linguagem. Arquivos e pastas vão pela ferramenta write_file e depois present.',
    '- Para entregar uma pasta ou arquivo criado, chame present com o caminho. O usuário vê um cartão com botão de instalar.',
    '- Para criar uma pasta ou arquivos, escreva CADA arquivo num bloco assim (o servidor cria a pasta e mostra o cartão para o usuário): primeiro a linha ```arquivo: nome-da-pasta/arquivo.ext , depois o código inteiro do arquivo, depois ``` . Nunca explique comandos mkdir; escreva os arquivos com código de verdade.',
    '- Use remember quando o usuário contar algo que vale lembrar depois, e recall quando ele falar de conversas passadas.',
    '- Nunca invente resultado de comando: se rodou, use a saída real. Se algo deu erro, diga o erro.',
    '- Recuse com educação pedidos ilegais ou que causem dano a pessoas.',
    canImage ? '- Para criar imagens use generate_image (o usuário tem um limite diário). Quando ele mandar uma foto, você recebe a descrição feita pelo modelo de visão no texto da mensagem: use essa descrição e não diga que não consegue ver.' : '',
    conn,
    speed === 'fast' ? '- MODO RÁPIDO: responda e gere o código na hora, sem rodar nada.' : '',
    speed === 'mid' ? '- MODO MÉDIO: se o resultado der erro, corrija. Capriche no visual, mas não precisa testar tudo.' : '',
    speed === 'slow' ? '- MODO DEVAGAR: máxima precisão. Antes de entregar qualquer código, rode no terminal para ver se não há erros, corrija o que aparecer e só então entregue.' : '',
    canRun ? '' : '- O terminal não está disponível neste momento. Não prometa ter testado o código.',
  ].filter(Boolean).join('\n');
}

function historyFor(chatId) {
  const rows = q.all('SELECT role,text FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT 30', chatId).reverse();
  return rows.map((r) => ({ role: r.role === 'user' ? 'user' : 'assistant', content: r.text }));
}

const IMG = /^image\//; const VID = /^video\//;
async function buildUserContent({ user, ws, text, attachments, signal, emit }) {
  const lines = [text || '']; const images = []; const notes = []; let hasVideo = false;
  for (const id of attachments || []) {
    const up = q.one('SELECT * FROM uploads WHERE id=? AND user_id=?', String(id), user.id); if (!up) continue;
    const src = path.join(cfg.dataDir, 'uploads', up.id);
    if (!fs.existsSync(src)) continue;
    const dir = path.join(ws, 'uploads'); fs.mkdirSync(dir, { recursive: true });
    const safe = up.name.replace(/[^\w.\-() ]+/g, '_').slice(0, 80) || 'arquivo';
    const dest = path.join(dir, safe); fs.copyFileSync(src, dest);
    const rel = 'uploads/' + safe;
    if (IMG.test(up.mime || '') && fs.statSync(src).size < 8e6) {
      images.push(`data:${up.mime};base64,${fs.readFileSync(src).toString('base64')}`); notes.push(`[imagem anexada: ${rel}]`);
    } else if (VID.test(up.mime || '')) {
      notes.push(`[vídeo anexado: ${rel}]`); hasVideo = true;
      const r = spawnSync('ffmpeg', ['-v', 'error', '-i', dest, '-vf', 'fps=1/3,scale=640:-2', '-frames:v', '4', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], { maxBuffer: 20e6, timeout: 40000 });
      if (r.status === 0 && r.stdout.length) {
        // separa os JPEGs concatenados
        const buf = r.stdout; let start = 0;
        for (let i = 2; i < buf.length; i++) if (buf[i - 2] === 0xff && buf[i - 1] === 0xd8 && i - 2 > start) { images.push('data:image/jpeg;base64,' + buf.subarray(start, i - 2).toString('base64')); start = i - 2; }
        images.push('data:image/jpeg;base64,' + buf.subarray(start).toString('base64'));
      }
    } else {
      const buf = fs.readFileSync(src).subarray(0, 40000); const s = buf.toString('utf8');
      if (!/�/.test(s.slice(0, 2000))) notes.push(`[arquivo anexado: ${rel}]\n${s.slice(0, 20000)}`); else notes.push(`[arquivo anexado: ${rel} (binário)]`);
    }
  }
  if (images.length) {
    if (!cfg.visionModel && cfg.provider !== 'mock') notes.push('[O servidor não tem modelo de visão configurado, então não é possível ver a imagem. Avise o usuário.]');
    else {
      emit({ type: 'status', key: 'vision' });
      try { const desc = await llm.describeImages({ images: images.slice(0, 6), question: text || '', video: hasVideo, signal }); notes.push(desc ? `[Análise visual feita pelo modelo de visão]\n${desc}` : '[O modelo de visão não devolveu descrição.]'); }
      catch (e) { notes.push(`[Não consegui analisar a imagem: ${e.message}. Avise o usuário.]`); }
    }
  }
  return [...lines, ...notes].filter(Boolean).join('\n\n');
}

function topEntries(ws) {
  const m = {};
  for (const e of fs.readdirSync(ws, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'uploads') continue;
    try { m[e.name] = fs.statSync(path.join(ws, e.name)).mtimeMs; } catch {}
  }
  return m;
}

async function run({ user, chat, project, text, attachments, speed, lang, emit, signal }) {
  speed = MAX_STEPS[speed] ? speed : 'mid';
  const ws = tools.wsDir(user.id, chat);
  const before = topEntries(ws);
  const presented = []; const presentedSet = new Set();
  const ctx = {
    user, ws, signal, speed, emit,
    present(rel, extra) {
      if (presentedSet.has(rel)) return; presentedSet.add(rel);
      const full = path.join(ws, rel); let isDir = false; try { isDir = fs.statSync(full).isDirectory(); } catch { return; }
      const kind = extra && extra.screenshot ? 'image' : isDir ? 'folder' : /\.(png|jpe?g|gif|webp|svg)$/i.test(rel) ? 'image' : 'file';
      const part = { kind, path: rel, name: path.basename(rel) };
      presented.push(part); emit({ type: 'present', ...part });
    },
  };

  const prevUser = (q.one('SELECT text FROM messages WHERE chat_id=? AND role=? ORDER BY id DESC LIMIT 1 OFFSET 1', chat.id, 'user') || {}).text || '';
  const ex = expandSlang(text);
  const followUp = CONFIRM_RE.test(ex) && ex.length < 60 && wantsFiles(expandSlang(prevUser));
  const userContent = await buildUserContent({ user, ws, text: followUp ? expandSlang(prevUser) + '\n' + ex : ex, attachments, signal, emit });
  const canImage = images.enabled();
  const simple = cfg.simpleFiles && (wantsFiles(ex) || followUp) && !(attachments && attachments.length);
  const messages = simple
    ? [{ role: 'system', content: simplePrompt({ user, project, lang }) }, { role: 'user', content: userContent }]
    : [{ role: 'system', content: systemPrompt({ user, chat, project, speed, lang, canImage }) }, ...historyFor(chat.id), { role: 'user', content: userContent }];
  const hasConn = !!q.one('SELECT 1 x FROM connectors WHERE user_id=?', user.id);
  const toolDefs = simple ? [] : tools.toolList(speed).filter((t) => (cfg.exec !== 'off' || t.function.name !== 'run_command') && (canImage || t.function.name !== 'generate_image') && (hasConn || t.function.name !== 'connector'));
  const model = simple ? (cfg.codeModels[speed] || cfg.models[speed]) : pickModel(text, project, speed);

  let full = ''; let wrote = false; let ran = false; let nudged = false;
  const onDelta = (d) => { full += d; emit({ type: 'delta', text: d }); };

  try {
    emit({ type: 'status', key: 'think' });
    for (let step = 0; step < (simple ? 1 : MAX_STEPS[speed]); step++) {
      if (signal.aborted) break;
      const len0 = full.length;
      const res = await llm.chat({ speed, model, messages, tools: toolDefs, signal, onDelta });
      if (!res.toolCalls.length) {
        if (speed === 'slow' && wrote && !ran && !nudged && cfg.exec !== 'off') {
          nudged = true;
          messages.push({ role: 'assistant', content: res.text || '' });
          messages.push({ role: 'user', content: '(sistema) Você ainda não testou o código no terminal. Rode agora, confira se não há erros e corrija antes de entregar.' });
          continue;
        }
        break;
      }
      if (full.length > len0 && !/\s$/.test(full)) { full += '\n\n'; emit({ type: 'delta', text: '\n\n' }); }
      messages.push({ role: 'assistant', content: res.text || null, tool_calls: res.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args) } })) });
      emit({ type: 'status', key: 'work' });
      for (const c of res.toolCalls) {
        if (signal.aborted) break;
        if (c.name === 'write_file') wrote = true; if (c.name === 'run_command') ran = true;
        const out = await tools.execTool(c.name, c.args, ctx);
        messages.push({ role: 'tool', tool_call_id: c.id, name: c.name, content: String(out) });
      }
    }
  } catch (e) {
    if (!signal.aborted) { emit({ type: 'error', message: e.message || String(e) }); if (!full) full = '(erro) ' + (e.message || ''); }
  }

  // Modo simples: o modelo escreveu os arquivos em blocos de texto em vez de chamar a ferramenta.
  if (!wrote && !signal.aborted) {
    const files = extractFiles(full);
    for (const f of files) { try { await tools.execTool('write_file', { path: f.path, content: f.content }, ctx); wrote = true; } catch (e) { emit({ type: 'error', message: e.message }); } }
  }

  // Se criou coisas e não entregou nenhuma, entrega automaticamente as novas pastas/arquivos.
  if (!presented.length && !signal.aborted) {
    const after = topEntries(ws);
    for (const [name, mt] of Object.entries(after)) if (before[name] === undefined || mt > before[name]) ctx.present(name);
  }

  full = full.trim();
  if (full || presented.length) {
    q.run('INSERT INTO messages(chat_id,role,text,parts,ts) VALUES(?,?,?,?,?)', chat.id, 'assistant', full, presented.length ? JSON.stringify(presented) : null, Date.now());
    q.run('UPDATE chats SET ts=? WHERE id=?', Date.now(), chat.id);
  }
  emit({ type: 'done' });
}

module.exports = { run, pickModel, extractFiles, wantsFiles, expandSlang };
