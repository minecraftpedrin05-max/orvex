'use strict';
const crypto = require('crypto');
const cfg = require('./config');
const { q } = require('./db');

const sha = (s) => crypto.createHash('sha256').update(s + '|' + cfg.secret).digest('hex');
const now = () => Date.now();
const MAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const normMail = (e) => String(e || '').trim().toLowerCase();

const fail = (status, message, code) => Object.assign(new Error(message), { status, code });

// Limite simples por chave, em memória.
const buckets = new Map();
function limit(key, max, windowMs) {
  const t = now(); const b = (buckets.get(key) || []).filter((x) => t - x < windowMs);
  if (b.length >= max) { buckets.set(key, b); throw fail(429, 'Muitas tentativas. Espere um pouco.', 'rate'); }
  b.push(t); buckets.set(key, b);
}
setInterval(() => { const t = now(); for (const [k, v] of buckets) if (!v.some((x) => t - x < 3600e3)) buckets.delete(k); }, 600e3).unref();

async function sendMail(to, code) {
  if (cfg.smtpUser && cfg.smtpPass) {
    try {
      await require('./smtp').send({ host: cfg.smtpHost, port: cfg.smtpPort, secure: cfg.smtpSecure, user: cfg.smtpUser, pass: cfg.smtpPass,
        from: 'ORVEX <' + cfg.smtpUser + '>', to, subject: `ORVEX: seu código é ${code}`,
        text: `Seu código do ORVEX é ${code}.\nEle vale por 10 minutos. Se não foi você, ignore este e-mail.` });
    } catch (e) { console.error('[login] falha ao enviar e-mail (SMTP):', e.message); throw fail(502, 'Não consegui enviar o e-mail agora.', 'mail'); }
    return;
  }
  if (!cfg.resendApiKey) { console.log(`[login] código para ${to}: ${code}  (configure RESEND_API_KEY para enviar por e-mail)`); return; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.resendApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: cfg.mailFrom, to: [to], subject: `ORVEX: seu código é ${code}`,
      text: `Seu código do ORVEX é ${code}.\nEle vale por 10 minutos. Se não foi você, ignore este e-mail.`,
    }),
  });
  if (!r.ok) { console.error('[login] falha ao enviar e-mail', r.status, await r.text().catch(() => '')); throw fail(502, 'Não consegui enviar o e-mail agora.', 'mail'); }
}

async function requestCode(emailRaw, ip) {
  const email = normMail(emailRaw);
  if (!MAIL_RE.test(email)) throw fail(400, 'E-mail inválido', 'email');
  limit('ip:' + ip, 20, 3600e3); limit('mail:' + email, 5, 3600e3);
  const prev = q.one('SELECT sent_at FROM login_codes WHERE email=?', email);
  if (prev && now() - prev.sent_at < 30e3) throw fail(429, 'Espere 30 segundos para pedir outro código.', 'rate');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  q.run('INSERT INTO login_codes(email,hash,expires,attempts,sent_at) VALUES(?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash,expires=excluded.expires,attempts=0,sent_at=excluded.sent_at',
    email, sha(email + code), now() + 10 * 60e3, now());
  await sendMail(email, code);
  return cfg.devCodes ? { devCode: code } : {};
}

function newSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  q.run('INSERT INTO sessions(hash,user_id,expires) VALUES(?,?,?)', sha(token), userId, now() + 30 * 86400e3);
  return token;
}

function userView(u) { return { id: u.id, email: u.email, name: u.name || '', complete: !!(u.name && u.birth), admin: require('./settings').isAdmin(u) }; }

function verifyCode(emailRaw, codeRaw, ip) {
  const email = normMail(emailRaw); const code = String(codeRaw || '').replace(/\D/g, '');
  limit('ipv:' + ip, 40, 3600e3);
  const row = q.one('SELECT * FROM login_codes WHERE email=?', email);
  if (!row || row.expires < now()) throw fail(400, 'Código expirado. Peça outro.', 'expired');
  if (row.attempts >= 5) throw fail(429, 'Muitas tentativas. Peça outro código.', 'rate');
  q.run('UPDATE login_codes SET attempts=attempts+1 WHERE email=?', email);
  const a = Buffer.from(sha(email + code)); const b = Buffer.from(row.hash);
  if (code.length !== 6 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw fail(400, 'Código errado.', 'wrong');
  q.run('DELETE FROM login_codes WHERE email=?', email);
  return finishLogin(email);
}

function finishLogin(email) {
  let u = q.one('SELECT * FROM users WHERE email=?', email);
  const isNew = !u || !u.name;
  if (!u) { q.run('INSERT INTO users(email,created) VALUES(?,?)', email, now()); u = q.one('SELECT * FROM users WHERE email=?', email); }
  return { token: newSession(u.id), user: userView(u), isNew };
}

async function googleLogin(idToken) {
  if (!cfg.googleClientId) throw fail(501, 'Login com Google ainda não está configurado neste servidor.', 'google_off');
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(idToken || '')));
  if (!r.ok) throw fail(401, 'Conta Google inválida.', 'google');
  const j = await r.json();
  if (j.aud !== cfg.googleClientId || !(j.email_verified === 'true' || j.email_verified === true) || Number(j.exp) * 1000 < now())
    throw fail(401, 'Conta Google inválida.', 'google');
  return finishLogin(normMail(j.email));
}

function setProfile(user, { name, birth, lang }) {
  name = String(name || '').trim().slice(0, 60);
  if (!name) throw fail(400, 'Digite seu nome.', 'name');
  const d = new Date(birth);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birth)) || isNaN(d) || d > new Date() || d.getFullYear() < 1900) throw fail(400, 'Data de nascimento inválida.', 'birth');
  const age = (Date.now() - d.getTime()) / (365.25 * 86400e3);
  if (age < cfg.minAge) throw fail(403, `É preciso ter pelo menos ${cfg.minAge} anos para usar o ORVEX.`, 'age');
  q.run('UPDATE users SET name=?, birth=?, lang=? WHERE id=?', name, birth, String(lang || '').slice(0, 5), user.id);
  return userView(q.one('SELECT * FROM users WHERE id=?', user.id));
}

function authenticate(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  const s = q.one('SELECT user_id, expires FROM sessions WHERE hash=?', sha(token));
  if (!s || s.expires < now()) return null;
  return q.one('SELECT * FROM users WHERE id=?', s.user_id) || null;
}

function logout(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) q.run('DELETE FROM sessions WHERE hash=?', sha(h.slice(7)));
}

// Links de download assinados (para <img>, "instalar" e abrir arquivos sem mandar o token na URL).
function signLink(payload, ttlMs = 15 * 60e3) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now() + ttlMs })).toString('base64url');
  const sig = crypto.createHmac('sha256', cfg.secret).update(body).digest('base64url');
  return body + '.' + sig;
}
function readLink(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', cfg.secret).update(body).digest('base64url');
  const a = Buffer.from(sig); const b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > now() ? p : null; } catch { return null; }
}

module.exports = { finishLogin, normMail, newSession, requestCode, verifyCode, googleLogin, setProfile, authenticate, logout, signLink, readLink, userView, fail, limit };
