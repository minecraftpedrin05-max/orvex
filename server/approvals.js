'use strict';
// Pedidos de permissão no meio da conversa: a IA quer fazer algo marcado como "Perguntar" e espera o usuário tocar em Permitir ou Negar.
const crypto = require('crypto');
const pending = new Map(); // chatId -> Map(id -> resolve)

function ask(chatId, info, emit, signal) {
  return new Promise((resolve) => {
    const id = crypto.randomBytes(6).toString('hex');
    const m = pending.get(chatId) || new Map(); pending.set(chatId, m);
    const done = (a) => { clearTimeout(t); m.delete(id); if (!m.size) pending.delete(chatId); if (signal) signal.removeEventListener('abort', onAbort); resolve(a); };
    const onAbort = () => done('deny');
    const t = setTimeout(() => done('deny'), 5 * 60e3);
    m.set(id, { done, info: { id, ...info } }); if (signal) signal.addEventListener('abort', onAbort, { once: true });
    emit({ type: 'ask', id, ...info });
  });
}
function answer(chatId, id, a) {
  const m = pending.get(chatId); const f = m && m.get(String(id)); if (!f) return false;
  f.done(a === 'allow' || a === 'always' ? a : 'deny'); return true;
}
const pendingFor = (chatId) => [...(pending.get(chatId) || new Map()).values()].map((x) => x.info);
module.exports = { ask, answer, pendingFor };
