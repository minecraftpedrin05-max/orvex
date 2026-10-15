'use strict';
// Gerador de imagens: chama um servidor de imagem (stable-diffusion.cpp, AUTOMATIC1111/Forge ou API estilo OpenAI),
// limita por pessoa por dia e passa a imagem por uma segunda revisão (modelo de visão) antes de mostrar.
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { q } = require('./db');
const llm = require('./llm');

const PNG_MOCK = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const enabled = () => !!cfg.image.baseUrl || cfg.provider === 'mock';

async function render({ prompt, negative, size, signal }) {
  if (!cfg.image.baseUrl) return PNG_MOCK;
  const ic = cfg.image; const base = ic.baseUrl.replace(/\/$/, ''); const sig = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(5 * 60e3)]);
  let r;
  try {
    if (ic.api === 'openai') {
      r = await fetch(base + '/v1/images/generations', { method: 'POST', signal: sig, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: ic.model || undefined, prompt, n: 1, size: `${size}x${size}`, response_format: 'b64_json' }) });
    } else {
      r = await fetch(base + '/sdapi/v1/txt2img', { method: 'POST', signal: sig, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, negative_prompt: negative || '', width: size, height: size, steps: ic.steps, cfg_scale: ic.cfg, batch_size: 1 }) });
    }
  } catch (e) { if (signal && signal.aborted) throw e; throw new Error('não consegui falar com o servidor de imagens (' + base + ')'); }
  if (!r.ok) throw new Error('o servidor de imagens respondeu ' + r.status);
  const j = await r.json();
  const b64 = ic.api === 'openai' ? j.data && j.data[0] && j.data[0].b64_json : j.images && j.images[0];
  if (!b64) throw new Error('o servidor de imagens não devolveu imagem');
  return String(b64).replace(/^data:image\/\w+;base64,/, '');
}

/** Segunda revisão. Devolve { ok, reason }. Sem modelo de visão configurado, não há revisão. */
async function review(prompt, b64, signal) {
  if (cfg.provider === 'mock' || !cfg.visionModel) return { ok: true, reason: '' };
  let out;
  try {
    out = await llm.visionAsk({ images: ['data:image/png;base64,' + b64], signal, maxTokens: 120, prompt:
      `You review images generated for a user who asked: "${prompt.slice(0, 300)}". Reply with ONLY JSON like {"ok":true,"reason":"short reason"}. ` +
      'Set ok=false if the image has nudity or sexual content, graphic gore, anything sexual involving minors, hate symbols, a deceptive likeness of a real person, or if it is blank, broken noise, or clearly unrelated to the request.' });
  } catch (e) { return { ok: false, reason: 'a revisão da imagem não está disponível agora (' + e.message + ')' }; }
  const m = /\{[\s\S]*\}/.exec(out || ''); if (!m) return { ok: false, reason: 'a revisão não respondeu direito' };
  try { const j = JSON.parse(m[0]); return { ok: j.ok === true, reason: String(j.reason || '').slice(0, 200) }; } catch { return { ok: false, reason: 'a revisão não respondeu direito' }; }
}

async function generate(ctx, args) {
  const prompt = String(args.prompt || '').trim().slice(0, 1000);
  if (!prompt) throw new Error('falta o parâmetro "prompt"');
  if (!enabled()) return 'ERRO: o gerador de imagens não está configurado neste servidor (IMAGE_BASE_URL).';
  const limit = cfg.image.dailyLimit; const day = new Date().toISOString().slice(0, 10); const uid = ctx.user.id;
  const used = (q.one('SELECT n FROM image_usage WHERE user_id=? AND day=?', uid, day) || { n: 0 }).n;
  if (used >= limit) return `LIMITE: o usuário já gerou ${limit} imagens hoje. Avise que o limite volta amanhã. Não tente de novo.`;
  q.run('INSERT INTO image_usage(user_id,day,n) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET n=n+1', uid, day);
  let refund = true;
  try {
    ctx.emit({ type: 'status', key: 'image' });
    const size = Math.max(256, Math.min(1024, Math.round((Number(args.size) || cfg.image.size) / 64) * 64));
    const b64 = await render({ prompt, negative: args.negative && String(args.negative).slice(0, 300), size, signal: ctx.signal });
    refund = false; // gastou o servidor de imagens: a partir daqui conta no limite
    const rv = await review(prompt, b64, ctx.signal);
    if (!rv.ok) return `RECUSADA pela revisão${rv.reason ? ': ' + rv.reason : ''}. A imagem NÃO foi mostrada. Explique ao usuário e ofereça um pedido diferente.`;
    const dir = path.join(ctx.ws, 'imagens'); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'imagem-' + Date.now() + '.png'); fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    ctx.present(path.relative(ctx.ws, file));
    return `Imagem gerada e já mostrada ao usuário. Ainda restam ${limit - used - 1} hoje. Não repita a imagem em texto.`;
  } finally {
    if (refund) q.run('UPDATE image_usage SET n=MAX(n-1,0) WHERE user_id=? AND day=?', uid, day);
  }
}

/** Edita uma imagem que já existe (img2img). Só funciona com servidor estilo AUTOMATIC1111/Forge/sd-server. Devolve base64. */
async function edit({ b64, prompt, strength, signal }) {
  if (cfg.provider === 'mock' && !cfg.image.baseUrl) return PNG_MOCK;
  if (!cfg.image.baseUrl) throw new Error('o gerador de imagens não está configurado neste servidor');
  if (cfg.image.api === 'openai') throw new Error('editar foto precisa de um servidor de imagem estilo AUTOMATIC1111 (IMAGE_API=a1111)');
  const base = cfg.image.baseUrl.replace(/\/$/, ''); const sig = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(5 * 60e3)]);
  let r;
  try {
    r = await fetch(base + '/sdapi/v1/img2img', { method: 'POST', signal: sig, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_images: [b64], prompt, denoising_strength: Math.max(0.2, Math.min(0.95, Number(strength) || 0.55)), steps: cfg.image.steps, cfg_scale: cfg.image.cfg, width: cfg.image.size, height: cfg.image.size }) });
  } catch (e) { throw new Error('não consegui falar com o servidor de imagens'); }
  if (!r.ok) throw new Error('o servidor de imagens respondeu ' + r.status);
  const j = await r.json(); if (!j.images || !j.images[0]) throw new Error('o servidor de imagens não devolveu imagem');
  return String(j.images[0]).replace(/^data:image\/\w+;base64,/, '');
}

module.exports = { generate, enabled, edit, review };
