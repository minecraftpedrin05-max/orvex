'use strict';
// Cliente SMTP mínimo (sem dependências): conexão TLS direta (porta 465), AUTH LOGIN, uma mensagem de texto.
const net = require('net');
const tls = require('tls');

function send({ host, port, secure = true, user, pass, from, to, subject, text, timeout = 20000 }) {
  const clean = (s) => String(s).replace(/[\r\n]+/g, ' ');
  const addr = (s) => { const m = String(s).match(/<([^<>\s]+)>/); return clean(m ? m[1] : s).trim(); };
  return new Promise((resolve, reject) => {
    const sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    let buf = ''; let waiting = null; let done = false;
    const end = (err) => { if (done) return; done = true; clearTimeout(tm); try { sock.destroy(); } catch (e) {} err ? reject(err) : resolve(); };
    const tm = setTimeout(() => end(new Error('smtp timeout')), timeout);
    sock.setEncoding('utf8');
    sock.on('error', end); sock.on('close', () => end(new Error('smtp fechou')));
    sock.on('data', (d) => {
      buf += d; let m;
      while ((m = buf.match(/^(?:\d{3}-.*\r?\n)*\d{3} .*\r?\n/))) {
        const block = m[0]; buf = buf.slice(block.length);
        const w = waiting; waiting = null; if (w) w(parseInt(block.trimEnd().split(/\r?\n/).pop().slice(0, 3), 10), block);
      }
    });
    const expect = () => new Promise((r) => { waiting = r; });
    const cmd = async (line, ok) => { sock.write(line + '\r\n'); const code = await expect().then((c) => c); if (!ok.includes(code)) throw new Error('smtp ' + code + ' em ' + line.split(' ')[0]); };
    (async () => {
      const first = await expect(); if (first !== 220) throw new Error('smtp saudação ' + first);
      await cmd('EHLO orvex.local', [250]);
      await cmd('AUTH LOGIN', [334]);
      await cmd(Buffer.from(user).toString('base64'), [334]);
      await cmd(Buffer.from(pass).toString('base64'), [235]);
      await cmd('MAIL FROM:<' + addr(from) + '>', [250]);
      await cmd('RCPT TO:<' + addr(to) + '>', [250, 251]);
      await cmd('DATA', [354]);
      const body = String(text).replace(/\r?\n/g, '\r\n');
      const msg = 'From: ' + clean(from) + '\r\nTo: ' + addr(to) + '\r\nSubject: =?UTF-8?B?' + Buffer.from(clean(subject)).toString('base64') + '?=\r\n' +
        'MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' +
        Buffer.from(body).toString('base64').replace(/(.{76})/g, '$1\r\n');
      await cmd(msg + '\r\n.', [250]);
      sock.write('QUIT\r\n'); end();
    })().catch(end);
  });
}
module.exports = { send };
