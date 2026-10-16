'use strict';
const cfg = require('./config');

const TEMP = { fast: 0.7, mid: 0.5, slow: 0.2 };

/** Remove "<tool_call>...</tool_call>" do texto (alguns modelos escrevem a chamada no texto). */
function parseTextToolCalls(text) {
  const calls = []; const re = /<tool_call>\s*([\s\S]*?)\s*(?:<\/tool_call>|$)/g; let m;
  while ((m = re.exec(text))) {
    try { const j = JSON.parse(m[1]); if (j && j.name) calls.push({ id: 'tc' + calls.length + Date.now().toString(36), name: j.name, args: j.arguments || j.parameters || {} }); } catch {}
  }
  return calls;
}

/**
 * Uma volta com o modelo. Chama onDelta(texto) conforme o texto chega.
 * Devolve { text, toolCalls: [{id,name,args}] }.
 */
async function chat({ speed, model, messages, tools, signal, onDelta }) {
  if (cfg.provider === 'mock') return mockChat({ speed, model, messages, tools, onDelta });
  const body = {
    model: model || cfg.models[speed] || cfg.models.mid, messages, stream: true, temperature: TEMP[speed] ?? 0.5,
  };
  if (tools && tools.length) body.tools = tools;
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.modelKey) headers.Authorization = 'Bearer ' + cfg.modelKey;
  let r;
  try { r = await fetch(cfg.modelBase.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers, body: JSON.stringify(body), signal }); }
  catch (e) { if (signal && signal.aborted) throw e; throw offline('Não consegui falar com o modelo (' + cfg.modelBase + '). Ele está ligado?'); }
  if (!r.ok) { const t = await r.text().catch(() => ''); if (r.status === 401 || r.status === 403 || r.status === 502 || r.status === 503 || r.status === 504) throw offline(`Modelo respondeu ${r.status}: ${t.slice(0, 200)}`); throw new Error(`Modelo respondeu ${r.status}: ${t.slice(0, 200)}`); }

  let text = ''; let emitted = 0; const calls = {}; let buf = '';
  const flush = (final) => {
    const tag = text.indexOf('<tool_call');
    const safe = tag >= 0 ? tag : final ? text.length : Math.max(emitted, text.length - 11);
    if (safe > emitted) { onDelta(text.slice(emitted, safe)); emitted = safe; }
  };
  const dec = new TextDecoder();
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const d = line.slice(5).trim(); if (d === '[DONE]') continue;
      let j; try { j = JSON.parse(d); } catch { continue; }
      const delta = j.choices && j.choices[0] && j.choices[0].delta; if (!delta) continue;
      if (delta.content) { text += delta.content; flush(false); }
      for (const tc of delta.tool_calls || []) {
        const k = tc.index ?? 0; const c = (calls[k] = calls[k] || { id: tc.id || 'call' + k, name: '', args: '' });
        if (tc.id) c.id = tc.id;
        if (tc.function) { if (tc.function.name) c.name += tc.function.name; if (tc.function.arguments) c.args += tc.function.arguments; }
      }
    }
  }
  flush(true);
  let toolCalls = Object.values(calls).filter((c) => c.name).map((c) => {
    let a = {}; try { a = c.args ? JSON.parse(c.args) : {}; } catch { a = {}; } return { id: c.id, name: c.name, args: a };
  });
  if (!toolCalls.length) toolCalls = parseTextToolCalls(text);
  const clean = text.replace(/<tool_call>[\s\S]*$/m, '').trimEnd();
  return { text: clean, toolCalls };
}

/** Pergunta algo ao modelo de visão sobre imagens (data: URLs). Devolve o texto da resposta. */
async function visionAsk({ images, prompt, signal, maxTokens }) {
  const content = [{ type: 'text', text: prompt }];
  for (const url of images) content.push({ type: 'image_url', image_url: { url } });
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.modelKey) headers.Authorization = 'Bearer ' + cfg.modelKey;
  const body = { model: cfg.visionModel, messages: [{ role: 'user', content }], stream: false, temperature: 0.2 };
  if (maxTokens) body.max_tokens = maxTokens;
  let r;
  try { r = await fetch(cfg.modelBase.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers, signal, body: JSON.stringify(body) }); }
  catch (e) { if (signal && signal.aborted) throw e; throw new Error('não consegui falar com o modelo de visão'); }
  if (!r.ok) throw new Error(r.status === 404 ? `modelo de visão "${cfg.visionModel}" não está instalado` : 'modelo de visão respondeu ' + r.status);
  const j = await r.json();
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
}

/** Descreve fotos (ou quadros de vídeo) para a IA principal. Devolve texto, ou lança erro com o motivo. */
async function describeImages({ images, question, video, signal }) {
  if (cfg.provider === 'mock') return 'imagem de teste (' + images.length + (video ? ' quadros de vídeo)' : ' arquivo(s))');
  if (!cfg.visionModel) return '';
  const what = video ? 'These are frames sampled in order from a video. Describe what happens, the scene, people, objects and any readable text.' : 'Describe in detail what appears in the image(s), including any readable text, numbers, UI elements or code.';
  return visionAsk({ images, signal, prompt: what + ' User request about it: ' + (question || '(none)') });
}

/* ---------- modelo de mentira, só para testar o sistema sem baixar um modelo ---------- */
async function mockChat({ speed, model, messages, tools, onDelta }) {
  const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
  const lu = messages[lastUserIdx]; const ut = typeof lu.content === 'string' ? lu.content : (lu.content.find((p) => p.type === 'text') || {}).text || '';
  const after = messages.slice(lastUserIdx + 1).filter((m) => m.role === 'tool');
  const has = (n) => tools && tools.some((t) => t.function.name === n);
  const say = async (t) => { for (const w of t.split(/(\s+)/)) { if (w) { onDelta(w); await new Promise((r) => setTimeout(r, 4)); } } };
  const call = (name, args) => ({ id: 'm' + Math.random().toString(36).slice(2, 8), name, args });
  if (/\b(desenhe|draw)\b/i.test(ut) && has('generate_image')) {
    if (after.length === 0) return { text: '', toolCalls: [call('generate_image', { prompt: ut.slice(0, 200) })] };
    const r = 'Imagem: ' + after[0].content.slice(0, 120); await say(r); return { text: r, toolCalls: [] };
  }
  if (/\bgithub\b/i.test(ut) && has('connector')) {
    if (after.length === 0) return { text: '', toolCalls: [call('connector', { connector: 'github', action: /escreva/i.test(ut) ? 'write_file' : 'list_repos', params: { repo: 'ana/site', path: 'a.txt', content: 'oi' } })] };
    const r = 'Conector: ' + after[0].content.slice(0, 300); await say(r); return { text: r, toolCalls: [] };
  }
  if (/\bnetlify\b/i.test(ut) && has('connector')) {
    if (after.length === 0) return { text: '', toolCalls: [call('write_file', { path: 'site-net/index.html', content: '<h1>oi</h1>' })] };
    if (after.length === 1) return { text: '', toolCalls: [call('connector', { connector: 'netlify', action: 'deploy_folder', params: { folder: 'site-net', name: 'meu-site' } })] };
    const r = 'Conector: ' + after[1].content.slice(0, 300); await say(r); return { text: r, toolCalls: [] };
  }
  if (/\bcobrinha\b/i.test(ut)) {
    const t = 'Aqui está o jogo:\n\n```arquivo: jogo-cobrinha/index.html\n<!doctype html><title>Cobrinha</title><canvas id="c"></canvas><script src="jogo.js"></script>\n```\n\n**jogo-cobrinha/jogo.js**\n```javascript\nconsole.log("cobrinha");\n```\n\n```arquivo: ../fora.txt\nnao\n```';
    await say(t); return { text: t, toolCalls: [] };
  }
  if (/\b(pasta|folder|site)\b/i.test(ut)) {
    if (after.length === 0) {
      await say('Vou criar a pasta do site. ');
      return { text: 'Vou criar a pasta do site. ', toolCalls: [
        call('write_file', { path: 'meu-site/index.html', content: '<!doctype html><title>Meu site</title><h1>Olá do ORVEX</h1>' }),
        call('write_file', { path: 'meu-site/script.js', content: 'console.log("ok");\n' }),
      ] };
    }
    if (after.length === 2 && has('run_command') && speed !== 'fast') return { text: '', toolCalls: [call('run_command', { command: 'node meu-site/script.js' })] };
    if (!messages.some((m) => m.role === 'tool' && /Entregue/.test(m.content || ''))) return { text: '', toolCalls: [call('present', { path: 'meu-site' })] };
    await say('Pronto! A pasta está aí em cima, é só instalar.'); return { text: 'Pronto! A pasta está aí em cima, é só instalar.', toolCalls: [] };
  }
  const vi = ut.indexOf('[Análise visual'); const t = `Resposta de teste (${speed}, modelo ${model || '-'}). Você disse: ${ut.slice(0, 120)}${vi >= 0 ? ' ' + ut.slice(vi, vi + 160) : ''}\n\n\`\`\`python\nprint("ola")\n\`\`\``;
  await say(t); return { text: t, toolCalls: [] };
}

const offline = (m) => Object.assign(new Error(m), { code: 'offline' });
let onlineCache = { at: 0, ok: true };
/** A IA está no ar? Confere o servidor de modelos (guarda a resposta por 15 s). */
async function online() {
  if (cfg.provider === 'mock') return true;
  if (Date.now() - onlineCache.at < 15e3) return onlineCache.ok;
  let ok = false;
  try {
    const h = {}; if (cfg.modelKey) h.Authorization = 'Bearer ' + cfg.modelKey;
    const r = await fetch(cfg.modelBase.replace(/\/$/, '') + '/models', { headers: h, signal: AbortSignal.timeout(4000) });
    ok = r.ok;
  } catch { ok = false; }
  onlineCache = { at: Date.now(), ok }; return ok;
}

module.exports = { chat, describeImages, visionAsk, online };
