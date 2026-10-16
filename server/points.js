'use strict';
// Pontos de uso: cada comando da IA (resposta, ferramenta, arquivo entregue) custa pontos.
// Ao chegar no total, a pessoa espera o tempo de espera (horas + minutos) e os pontos voltam.
const cfg = require('./config');
const { q } = require('./db');

const isOwner = (user) => { try { return require('./settings').isAdmin(user); } catch { return false; } };
const cooldownMs = () => Math.max(0, (cfg.cooldownHours * 60 + cfg.cooldownMinutes)) * 60e3;
const r2 = (n) => Math.round(n * 100) / 100;

function row(userId) {
  let r = q.one('SELECT used,locked_until FROM points WHERE user_id=?', userId);
  if (!r) { q.run('INSERT OR IGNORE INTO points(user_id,used,locked_until) VALUES(?,0,0)', userId); r = { used: 0, locked_until: 0 }; }
  // Tempo de espera acabou: pontos voltam ao total.
  if (r.locked_until && r.locked_until <= Date.now()) { q.run('UPDATE points SET used=0, locked_until=0 WHERE user_id=?', userId); r = { used: 0, locked_until: 0 }; }
  return r;
}

/** Estado para a tela: porcentagem usada, bloqueio e a hora em que volta. */
function state(user) {
  const total = cfg.pointsTotal;
  if (isOwner(user)) return { total, used: 0, left: total, pct: 0, locked: false, resetsAt: 0, cooldownMs: cooldownMs(), unlimited: true };
  const r = row(user.id); const locked = r.locked_until > Date.now();
  const used = Math.min(total, r.used);
  return { total, used: r2(used), left: r2(Math.max(0, total - used)), pct: Math.min(100, Math.floor((used / total) * 100)), locked, resetsAt: locked ? r.locked_until : 0, cooldownMs: cooldownMs(), unlimited: false };
}

/** Gasta pontos. Ao zerar, começa o tempo de espera. Devolve o novo estado. */
function charge(user, n = cfg.pointsCost) {
  if (isOwner(user)) return state(user);
  const r = row(user.id); if (r.locked_until > Date.now()) return state(user);
  const used = r.used + n;
  if (used >= cfg.pointsTotal) q.run('UPDATE points SET used=?, locked_until=? WHERE user_id=?', cfg.pointsTotal, Date.now() + Math.max(cooldownMs(), 60e3), user.id);
  else q.run('UPDATE points SET used=? WHERE user_id=?', used, user.id);
  return state(user);
}

const blocked = (user) => state(user).locked;

module.exports = { state, charge, blocked };
