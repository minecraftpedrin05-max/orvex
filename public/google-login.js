(function () {
  var pt = /^pt/i.test(navigator.language || '');
  var T = pt ? { h: 'Entrar com o Google', s: 'Escolha sua conta. Depois você volta para o app.', back: 'Voltar para o ORVEX', off: 'O login com Google não está configurado neste servidor.', fail: 'Não consegui entrar. Tente de novo.' }
              : { h: 'Sign in with Google', s: 'Choose your account. Then you go back to the app.', back: 'Back to ORVEX', off: 'Google sign-in is not set up on this server.', fail: 'Could not sign in. Try again.' };
  var $ = function (i) { return document.getElementById(i); };
  $('t1').textContent = T.h; $('t2').textContent = T.s;
  function post(path, body, token) {
    var h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
    return fetch(path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'erro'); return j; }); });
  }
  fetch('/api/config').then(function (r) { return r.json(); }).then(function (c) {
    if (!c.googleClientId) { $('err').textContent = T.off; return; }
    var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = function () {
      google.accounts.id.initialize({ client_id: c.googleClientId, ux_mode: 'redirect', login_uri: location.origin + '/api/auth/google-redirect' });
      google.accounts.id.renderButton($('gbtn'), { type: 'standard', size: 'large', width: 300 });
    };
    document.head.appendChild(s);
  }).catch(function () { $('err').textContent = T.fail; });
})();
