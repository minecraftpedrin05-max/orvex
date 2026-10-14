(function () {
  'use strict';
  /* ================= idioma (pelo aparelho) ================= */
  var T = {
    pt: { 
      aiSet: 'Configurações da IA', aiHint: 'Só você, dono do servidor, vê isto. Vale na hora para todo mundo que usa este servidor.', g_model: 'Modelo de conversa', g_code: 'Modelo de código', g_vision: 'Modelo de visão', g_image: 'Gerar imagem', g_terminal: 'Terminal da IA', g_limits: 'Limites e rede', f_modelBase: 'Endereço do servidor de modelos', f_modelKey: 'Chave (só se o servidor pedir)', f_m_fast: 'Rápido', f_m_mid: 'Médio', f_m_slow: 'Devagar', f_c_fast: 'Rápido', f_c_mid: 'Médio', f_c_slow: 'Devagar', f_vision: 'Modelo de visão (vazio = desligado)', f_i_url: 'Endereço do servidor de imagem (vazio = desligado)', f_i_api: 'Tipo de API', f_i_model: 'Modelo', f_i_size: 'Tamanho da imagem (px)', f_i_steps: 'Passos', f_i_cfg: 'CFG', f_i_limit: 'Imagens por pessoa por dia', f_exec: 'Modo do terminal', f_dockerImage: 'Imagem do Docker', f_execNet: 'Rede do Docker', f_privUrls: 'IA pode acessar a rede interna (localhost)', f_dailyLimit: 'Mensagens por pessoa por dia', f_simple: 'Modo simples para criar pastas (modelos pequenos)', o_off: 'Desligado', o_docker: 'Docker (isolado)', o_local: 'Direto no servidor (sem isolamento)', execWarn: 'Direto no servidor: a IA lê e apaga o que o servidor consegue. Só para uso pessoal.', aiSave: 'Salvar', aiSaved: 'Salvo.', resetDef: 'Voltar ao padrão', modelsOk: '{n} modelos instalados no servidor. Toque num campo para escolher.', modelsErr: 'Não consegui listar os modelos: {e}', server: 'Servidor', serverTitle: 'Endereço do servidor', serverSub: 'Onde o ORVEX está rodando. Exemplos: http://localhost:3000 (Termux neste celular) ou https://seu-site.com', serverSave: 'Salvar e abrir', serverBad: 'Endereço inválido. Comece com http:// ou https://', serverCur: 'Atual: {a}',
      connectors: 'Conectores', cat_host: 'Hospedagem', cat_code: 'Código', cat_msg: 'Mensagens', cat_notes: 'Anotações', cat_other: 'Qualquer lugar',
      connected: 'Conectado', notConnected: 'Não conectado', connect: 'Conectar', disconnect: 'Desconectar', connecting: 'Conectando...', perms: 'O que a IA pode fazer', permsHint: 'Se a IA tentar algo que você desligou, ela não faz e avisa você.',
      p_read: 'Ver e ler', p_write: 'Criar e alterar', p_deploy: 'Hospedar (publicar sites e apps)', p_delete: 'Apagar', p_send: 'Enviar mensagens',
      f_token: 'Token de acesso', f_token_opt: 'Token de acesso (se precisar)', f_url: 'Endereço (começa com https://)', f_header: 'Nome do cabeçalho do token (padrão: Authorization)', howToken: 'Onde pego o token?', connectedAs: 'Conectado como {n}', noActions: 'Nenhuma ação',
      host: 'Hospedando {f}', image: 'Gerando imagem', vision: 'Olhando a imagem',
      welcome: 'Entre no ORVEX', welcomeSub: 'Escolha como quer entrar.', google: 'Continuar com Google', github: 'Entrar com o GitHub', or: 'ou', email: 'Continuar com e-mail', back: 'Voltar', continue: 'Continuar',
      mTitle: 'Seu e-mail', mSub: 'Vamos enviar um código para confirmar.', mLabel: 'E-mail', cTitle: 'Digite o código', cSub: 'Enviamos um código de 6 dígitos para', verify: 'Confirmar', resend: 'Enviar outro código', sent: 'Código enviado.',
      pTitle: 'Quase lá', pSub: 'Conte um pouco sobre você.', pName: 'Nome', pBirth: 'Data de nascimento', start: 'Começar',
      eMail: 'Digite um e-mail válido.', eCode: 'Digite os 6 dígitos.', eName: 'Digite seu nome.', eBirth: 'Digite uma data de nascimento válida.',
      eWrong: 'Código errado.', eExpired: 'Código expirado. Peça outro.', eRate: 'Muitas tentativas. Espere um pouco.', eLimit: 'Você chegou no limite de mensagens de hoje.', eAge: 'Você ainda não tem a idade mínima para usar o ORVEX.', googleOff: 'O login com Google ainda não está configurado neste servidor.', netErr: 'Não consegui falar com o servidor.',
      hello: 'Olá, {n}', ask: 'Como posso ajudar hoje?', placeholder: 'Escreva uma mensagem', slow: 'Devagar', mid: 'Médio', fast: 'Rápido',
      photo: 'Foto', video: 'Vídeo', file: 'Arquivo', camera: 'Câmera', newChat: 'Novo chat', projects: 'Projetos', codes: 'Códigos', settings: 'Configurações', logout: 'Sair da conta',
      chats: 'Chats', noChats: 'Nenhum chat ainda.', untitled: 'Novo chat',
      think: 'Pensando', work: 'Trabalhando', make: 'Fazendo {f}', run: 'Executando comando', waiting: 'Esperando o Wi-Fi voltar',
      copy: 'Copiar', share: 'Compartilhar', save: 'Salvar código', copied: 'Copiado', saved: 'Salvo',
      offline: 'Sem Wi-Fi. Vou responder quando a conexão voltar.', weak: 'Wi-Fi fraco. Vou responder mais devagar.',
      menu: 'Menu', attach: 'Anexar', mic: 'Falar', send: 'Enviar', stop: 'Parar', listening: 'Ouvindo...', back2: 'Voltar', remove: 'Remover', close: 'Fechar',
      projName: 'Nome do projeto', projType: 'Tipo do projeto', create: 'Criar projeto', newProject: 'Novo projeto', eProj: 'Digite o nome do projeto.', noProj: 'Nenhum projeto ainda. Toque no + para criar.', noProjChats: 'Nenhum chat neste projeto.',
      tSite: 'Site', tApp: 'App', tGame: 'Jogo', tBot: 'Bot', tOther: 'Outro',
      searchCode: 'Buscar pelo nome do código', noCodes: 'Nenhum código salvo ainda.', noMatch: 'Nenhum código com esse nome.', codeName: 'Nome do código',
      language: 'Idioma', theme: 'Tema', themeAuto: 'Segue o celular',
      install: 'Instalar', seeFiles: 'Ver arquivos', view: 'Ver o conteúdo', emptyFolder: 'Pasta vazia.', binary: 'Arquivo que não é texto. Use Instalar para baixar.', truncated: 'Mostrando só o começo do arquivo.',
      speechNo: 'A voz para texto não funciona neste aparelho.', attachFail: 'Não consegui enviar o anexo.', still: 'A IA ainda está respondendo este chat.', sessionEnd: 'Entre de novo na sua conta.' },
    en: { 
      aiSet: 'AI settings', aiHint: 'Only you, the server owner, see this. It applies right away to everyone using this server.', g_model: 'Chat model', g_code: 'Code model', g_vision: 'Vision model', g_image: 'Image generation', g_terminal: 'AI terminal', g_limits: 'Limits and network', f_modelBase: 'Model server address', f_modelKey: 'Key (only if the server asks)', f_m_fast: 'Fast', f_m_mid: 'Medium', f_m_slow: 'Slow', f_c_fast: 'Fast', f_c_mid: 'Medium', f_c_slow: 'Slow', f_vision: 'Vision model (empty = off)', f_i_url: 'Image server address (empty = off)', f_i_api: 'API type', f_i_model: 'Model', f_i_size: 'Image size (px)', f_i_steps: 'Steps', f_i_cfg: 'CFG', f_i_limit: 'Images per person per day', f_exec: 'Terminal mode', f_dockerImage: 'Docker image', f_execNet: 'Docker network', f_privUrls: 'AI can reach the internal network (localhost)', f_dailyLimit: 'Messages per person per day', f_simple: 'Simple mode for creating folders (small models)', o_off: 'Off', o_docker: 'Docker (isolated)', o_local: 'Directly on the server (no isolation)', execWarn: 'Directly on the server: the AI can read and delete whatever the server can. Personal use only.', aiSave: 'Save', aiSaved: 'Saved.', resetDef: 'Back to defaults', modelsOk: '{n} models installed on the server. Tap a field to pick one.', modelsErr: 'Could not list models: {e}', server: 'Server', serverTitle: 'Server address', serverSub: 'Where ORVEX is running. Examples: http://localhost:3000 (Termux on this phone) or https://your-site.com', serverSave: 'Save and open', serverBad: 'Invalid address. Start with http:// or https://', serverCur: 'Current: {a}',
      connectors: 'Connectors', cat_host: 'Hosting', cat_code: 'Code', cat_msg: 'Messages', cat_notes: 'Notes', cat_other: 'Anywhere',
      connected: 'Connected', notConnected: 'Not connected', connect: 'Connect', disconnect: 'Disconnect', connecting: 'Connecting...', perms: 'What the AI can do', permsHint: 'If the AI tries something you turned off, it will not do it and will tell you.',
      p_read: 'View and read', p_write: 'Create and change', p_deploy: 'Host (publish sites and apps)', p_delete: 'Delete', p_send: 'Send messages',
      f_token: 'Access token', f_token_opt: 'Access token (if needed)', f_url: 'Address (starts with https://)', f_header: 'Token header name (default: Authorization)', howToken: 'Where do I get the token?', connectedAs: 'Connected as {n}', noActions: 'No actions',
      host: 'Hosting {f}', image: 'Generating image', vision: 'Looking at the image',
      welcome: 'Sign in to ORVEX', welcomeSub: 'Choose how you want to sign in.', google: 'Continue with Google', github: 'Sign in with GitHub', or: 'or', email: 'Continue with email', back: 'Back', continue: 'Continue',
      mTitle: 'Your email', mSub: 'We will send a code to confirm it.', mLabel: 'Email', cTitle: 'Enter the code', cSub: 'We sent a 6-digit code to', verify: 'Confirm', resend: 'Send another code', sent: 'Code sent.',
      pTitle: 'Almost there', pSub: 'Tell us a little about you.', pName: 'Name', pBirth: 'Date of birth', start: 'Get started',
      eMail: 'Enter a valid email.', eCode: 'Enter all 6 digits.', eName: 'Enter your name.', eBirth: 'Enter a valid date of birth.',
      eWrong: 'Wrong code.', eExpired: 'Code expired. Ask for another.', eRate: 'Too many tries. Wait a moment.', eLimit: 'You reached today\'s message limit.', eAge: 'You are not old enough to use ORVEX yet.', googleOff: 'Google sign-in is not set up on this server yet.', netErr: 'I could not reach the server.',
      hello: 'Hi, {n}', ask: 'How can I help today?', placeholder: 'Write a message', slow: 'Slow', mid: 'Medium', fast: 'Fast',
      photo: 'Photo', video: 'Video', file: 'File', camera: 'Camera', newChat: 'New chat', projects: 'Projects', codes: 'Code', settings: 'Settings', logout: 'Sign out',
      chats: 'Chats', noChats: 'No chats yet.', untitled: 'New chat',
      think: 'Thinking', work: 'Working', make: 'Making {f}', run: 'Running command', waiting: 'Waiting for Wi-Fi to come back',
      copy: 'Copy', share: 'Share', save: 'Save code', copied: 'Copied', saved: 'Saved',
      offline: 'No Wi-Fi. I will reply when the connection is back.', weak: 'Weak Wi-Fi. I will reply more slowly.',
      menu: 'Menu', attach: 'Attach', mic: 'Speak', send: 'Send', stop: 'Stop', listening: 'Listening...', back2: 'Back', remove: 'Remove', close: 'Close',
      projName: 'Project name', projType: 'Project type', create: 'Create project', newProject: 'New project', eProj: 'Enter the project name.', noProj: 'No projects yet. Tap + to create one.', noProjChats: 'No chats in this project.',
      tSite: 'Website', tApp: 'App', tGame: 'Game', tBot: 'Bot', tOther: 'Other',
      searchCode: 'Search by code name', noCodes: 'No saved code yet.', noMatch: 'No code with that name.', codeName: 'Code name',
      language: 'Language', theme: 'Theme', themeAuto: 'Follows the phone',
      install: 'Install', seeFiles: 'See files', view: 'View contents', emptyFolder: 'Empty folder.', binary: 'Not a text file. Use Install to download it.', truncated: 'Showing only the start of the file.',
      speechNo: 'Voice to text does not work on this device.', attachFail: 'I could not upload the attachment.', still: 'The AI is still answering this chat.', sessionEnd: 'Please sign in again.' },
    es: { 
      aiSet: 'Ajustes de la IA', aiHint: 'Solo tú, dueño del servidor, ves esto. Vale al instante para todos los que usan este servidor.', g_model: 'Modelo de conversación', g_code: 'Modelo de código', g_vision: 'Modelo de visión', g_image: 'Generar imagen', g_terminal: 'Terminal de la IA', g_limits: 'Límites y red', f_modelBase: 'Dirección del servidor de modelos', f_modelKey: 'Clave (solo si el servidor la pide)', f_m_fast: 'Rápido', f_m_mid: 'Medio', f_m_slow: 'Lento', f_c_fast: 'Rápido', f_c_mid: 'Medio', f_c_slow: 'Lento', f_vision: 'Modelo de visión (vacío = apagado)', f_i_url: 'Dirección del servidor de imagen (vacío = apagado)', f_i_api: 'Tipo de API', f_i_model: 'Modelo', f_i_size: 'Tamaño de imagen (px)', f_i_steps: 'Pasos', f_i_cfg: 'CFG', f_i_limit: 'Imágenes por persona al día', f_exec: 'Modo del terminal', f_dockerImage: 'Imagen de Docker', f_execNet: 'Red de Docker', f_privUrls: 'La IA puede usar la red interna (localhost)', f_dailyLimit: 'Mensajes por persona al día', f_simple: 'Modo simple para crear carpetas (modelos pequeños)', o_off: 'Apagado', o_docker: 'Docker (aislado)', o_local: 'Directo en el servidor (sin aislamiento)', execWarn: 'Directo en el servidor: la IA puede leer y borrar lo que el servidor pueda. Solo uso personal.', aiSave: 'Guardar', aiSaved: 'Guardado.', resetDef: 'Volver al valor original', modelsOk: '{n} modelos instalados en el servidor. Toca un campo para elegir.', modelsErr: 'No pude listar los modelos: {e}', server: 'Servidor', serverTitle: 'Dirección del servidor', serverSub: 'Donde corre ORVEX. Ejemplos: http://localhost:3000 (Termux en este teléfono) o https://tu-sitio.com', serverSave: 'Guardar y abrir', serverBad: 'Dirección inválida. Empieza con http:// o https://', serverCur: 'Actual: {a}',
      connectors: 'Conectores', cat_host: 'Alojamiento', cat_code: 'Código', cat_msg: 'Mensajes', cat_notes: 'Notas', cat_other: 'Cualquier lugar',
      connected: 'Conectado', notConnected: 'No conectado', connect: 'Conectar', disconnect: 'Desconectar', connecting: 'Conectando...', perms: 'Qué puede hacer la IA', permsHint: 'Si la IA intenta algo que desactivaste, no lo hace y te avisa.',
      p_read: 'Ver y leer', p_write: 'Crear y cambiar', p_deploy: 'Alojar (publicar sitios y apps)', p_delete: 'Borrar', p_send: 'Enviar mensajes',
      f_token: 'Token de acceso', f_token_opt: 'Token de acceso (si hace falta)', f_url: 'Dirección (empieza con https://)', f_header: 'Nombre del encabezado del token (por defecto: Authorization)', howToken: '¿Dónde consigo el token?', connectedAs: 'Conectado como {n}', noActions: 'Sin acciones',
      host: 'Alojando {f}', image: 'Generando imagen', vision: 'Mirando la imagen',
      welcome: 'Entra a ORVEX', welcomeSub: 'Elige cómo quieres entrar.', google: 'Continuar con Google', github: 'Entrar con GitHub', or: 'o', email: 'Continuar con correo', back: 'Atrás', continue: 'Continuar',
      mTitle: 'Tu correo', mSub: 'Te enviaremos un código para confirmarlo.', mLabel: 'Correo', cTitle: 'Escribe el código', cSub: 'Enviamos un código de 6 dígitos a', verify: 'Confirmar', resend: 'Enviar otro código', sent: 'Código enviado.',
      pTitle: 'Casi listo', pSub: 'Cuéntanos un poco sobre ti.', pName: 'Nombre', pBirth: 'Fecha de nacimiento', start: 'Empezar',
      eMail: 'Escribe un correo válido.', eCode: 'Escribe los 6 dígitos.', eName: 'Escribe tu nombre.', eBirth: 'Escribe una fecha de nacimiento válida.',
      eWrong: 'Código incorrecto.', eExpired: 'Código vencido. Pide otro.', eRate: 'Demasiados intentos. Espera un poco.', eLimit: 'Llegaste al límite de mensajes de hoy.', eAge: 'Aún no tienes la edad mínima para usar ORVEX.', googleOff: 'El inicio de sesión con Google aún no está configurado en este servidor.', netErr: 'No pude hablar con el servidor.',
      hello: 'Hola, {n}', ask: '¿En qué puedo ayudarte hoy?', placeholder: 'Escribe un mensaje', slow: 'Lento', mid: 'Medio', fast: 'Rápido',
      photo: 'Foto', video: 'Video', file: 'Archivo', camera: 'Cámara', newChat: 'Nuevo chat', projects: 'Proyectos', codes: 'Código', settings: 'Configuración', logout: 'Cerrar sesión',
      chats: 'Chats', noChats: 'Aún no hay chats.', untitled: 'Nuevo chat',
      think: 'Pensando', work: 'Trabajando', make: 'Creando {f}', run: 'Ejecutando comando', waiting: 'Esperando que vuelva el Wi-Fi',
      copy: 'Copiar', share: 'Compartir', save: 'Guardar código', copied: 'Copiado', saved: 'Guardado',
      offline: 'Sin Wi-Fi. Responderé cuando vuelva la conexión.', weak: 'Wi-Fi débil. Responderé más despacio.',
      menu: 'Menú', attach: 'Adjuntar', mic: 'Hablar', send: 'Enviar', stop: 'Detener', listening: 'Escuchando...', back2: 'Atrás', remove: 'Quitar', close: 'Cerrar',
      projName: 'Nombre del proyecto', projType: 'Tipo de proyecto', create: 'Crear proyecto', newProject: 'Nuevo proyecto', eProj: 'Escribe el nombre del proyecto.', noProj: 'Aún no hay proyectos. Toca + para crear uno.', noProjChats: 'No hay chats en este proyecto.',
      tSite: 'Sitio web', tApp: 'App', tGame: 'Juego', tBot: 'Bot', tOther: 'Otro',
      searchCode: 'Buscar por nombre del código', noCodes: 'Aún no hay código guardado.', noMatch: 'Ningún código con ese nombre.', codeName: 'Nombre del código',
      language: 'Idioma', theme: 'Tema', themeAuto: 'Sigue al teléfono',
      install: 'Instalar', seeFiles: 'Ver archivos', view: 'Ver el contenido', emptyFolder: 'Carpeta vacía.', binary: 'No es un archivo de texto. Usa Instalar para descargarlo.', truncated: 'Mostrando solo el inicio del archivo.',
      speechNo: 'La voz a texto no funciona en este dispositivo.', attachFail: 'No pude subir el adjunto.', still: 'La IA aún está respondiendo este chat.', sessionEnd: 'Inicia sesión de nuevo.' },
  };
  var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  var L = 'en';
  for (var li = 0; li < langs.length; li++) { var c0 = String(langs[li]).slice(0, 2).toLowerCase(); if (T[c0]) { L = c0; break; } }
  var D = T[L]; document.documentElement.lang = L;
  function t(k, v) { var s = D[k] || k; if (v) for (var x in v) s = s.replace('{' + x + '}', v[x]); return s; }
  function applyI18n() {
    document.querySelectorAll('[data-t]').forEach(function (e) { e.textContent = t(e.getAttribute('data-t')); });
    document.querySelectorAll('[data-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.getAttribute('data-aria'))); });
    document.querySelectorAll('[data-ph]').forEach(function (e) { e.setAttribute('placeholder', t(e.getAttribute('data-ph'))); });
  }
  applyI18n();

  /* ================= utilidades ================= */
  var $ = function (id) { return document.getElementById(id); };
  var NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var API = String((function () { try { return localStorage.getItem('orvex:server'); } catch (e) { return null; } })() || window.ORVEX_API_BASE || '').replace(/\/$/, '');
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  var I = {
    copy: SV + '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>',
    check: SV + '<path d="M5 12l5 5 9-10"/></svg>',
    share: SV + '<path d="M12 16V4M7 9l5-5 5 5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"/></svg>',
    save: SV + '<path d="M6 4h12v16l-6-4-6 4z"/></svg>',
    arrow: SV + '<path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    eye: SV + '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    folder: SV + '<path d="M3 7h6l2 2h10v10H3z"/></svg>',
    doc: SV + '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>',
    x: SV + '<path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  var toastT;
  function toast(msg) { var n = $('toast'); n.textContent = msg; n.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { n.classList.remove('on'); }, 3200); }
  function fmt(ts) { try { return new Date(ts).toLocaleDateString(L, { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function rid() { var s = 'c'; var a = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < 11; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

  var ERR = { wrong: 'eWrong', expired: 'eExpired', rate: 'eRate', limit: 'eLimit', age: 'eAge', google_off: 'googleOff', email: 'eMail', name: 'eName', birth: 'eBirth' };
  function errText(e) { if (e && e.code && ERR[e.code]) return t(ERR[e.code]); if (e && e.net) return t('netErr'); return (e && e.message) || t('netErr'); }

  var token = lsGet('orvex:token'); var user = null; var srv = { googleClientId: null, githubEnabled: false };
  async function api(method, path, body) {
    var h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
    var r;
    try { r = await fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { var er = new Error(t('netErr')); er.net = true; throw er; }
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) {
      if (r.status === 401 && token) { doLogout(true); }
      var err = new Error(j.error || ('HTTP ' + r.status)); err.code = j.code; err.status = r.status; throw err;
    }
    return j;
  }

  /* ================= navegação ================= */
  function show(sec) { document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('on', s.id === sec); }); }
  function step(id) { document.querySelectorAll('.step').forEach(function (s) { s.classList.toggle('on', s.id === id); }); document.querySelectorAll('.err').forEach(function (e) { e.textContent = ''; }); }
  var okMail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };

  /* ================= login ================= */
  document.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { step(b.getAttribute('data-go')); }; });
  var mailVal = '';
  $('b-email').onclick = function () { step('st-mail'); $('m-mail').focus(); };

  $('m-next').onclick = async function () {
    var v = $('m-mail').value.trim(); if (!okMail(v)) { $('e-mail').textContent = t('eMail'); return; }
    var b = this; b.disabled = true;
    try { var r = await api('POST', '/api/auth/request', { email: v }); mailVal = v; $('c-to').textContent = v; step('st-code'); cin[0].focus(); if (r.devCode) toast('DEV: ' + r.devCode); }
    catch (e) { $('e-mail').textContent = errText(e); } finally { b.disabled = false; }
  };
  $('c-resend').onclick = async function () {
    try { var r = await api('POST', '/api/auth/request', { email: mailVal }); toast(t('sent')); if (r.devCode) toast('DEV: ' + r.devCode); } catch (e) { $('e-code').textContent = errText(e); }
  };
  var codes = $('codes'), cin = [];
  for (var k = 0; k < 6; k++) (function (k) {
    var e = document.createElement('input'); e.inputMode = 'numeric'; e.maxLength = 1; e.autocomplete = k === 0 ? 'one-time-code' : 'off'; e.setAttribute('aria-label', (k + 1) + '/6');
    e.oninput = function () { e.value = e.value.replace(/\D/g, ''); if (e.value && cin[k + 1]) cin[k + 1].focus(); };
    e.onkeydown = function (ev) { if (ev.key === 'Backspace' && !e.value && cin[k - 1]) cin[k - 1].focus(); };
    e.onpaste = function (ev) { var d = (ev.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!d) return; ev.preventDefault(); cin.forEach(function (x, j) { x.value = d[j] || ''; }); cin[Math.min(d.length, 5)].focus(); };
    cin.push(e); codes.appendChild(e);
  })(k);

  $('c-next').onclick = async function () {
    var v = cin.map(function (x) { return x.value; }).join(''); if (v.length < 6) { $('e-code').textContent = t('eCode'); return; }
    var b = this; b.disabled = true;
    try { var r = await api('POST', '/api/auth/verify', { email: mailVal, code: v }); afterLogin(r); }
    catch (e) { $('e-code').textContent = errText(e); } finally { b.disabled = false; }
  };

  function afterLogin(r) {
    token = r.token; lsSet('orvex:token', token); user = r.user; lsSet('orvex:user', JSON.stringify(user));
    if (user.complete) enter(); else { show('s-login'); step('st-profile'); $('p-name').focus(); }
  }

  $('p-birth').max = new Date().toISOString().slice(0, 10);
  $('p-next').onclick = async function () {
    var n = $('p-name').value.trim(), b = $('p-birth').value;
    if (!n) { $('e-profile').textContent = t('eName'); return; }
    var d = new Date(b); if (!b || isNaN(d) || d > new Date() || d.getFullYear() < 1900) { $('e-profile').textContent = t('eBirth'); return; }
    var btn = this; btn.disabled = true;
    try { var r = await api('POST', '/api/auth/profile', { name: n, birth: b, lang: L }); user = r.user; lsSet('orvex:user', JSON.stringify(user)); enter(); }
    catch (e) { $('e-profile').textContent = errText(e); } finally { btn.disabled = false; }
  };

  /* Google: o botão do Google fica invisível por cima do nosso botão preto. */
  function initGoogle() {
    if (!srv.googleClientId || NATIVE) return; // no APK o login do Google abre no Chrome (veja b-google)
    var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = function () {
      try {
        google.accounts.id.initialize({
          client_id: srv.googleClientId,
          callback: async function (resp) {
            try { afterLogin(await api('POST', '/api/auth/google', { credential: resp.credential })); } catch (e) { $('e-home').textContent = errText(e); }
          }
        });
        var w = $('g-over'); google.accounts.id.renderButton(w, { type: 'standard', size: 'large', width: Math.min(400, w.offsetWidth || 340) });
      } catch (e) {}
    };
    document.head.appendChild(s);
  }
  function loginButtons() {
    $('b-github').hidden = !srv.githubEnabled; $('gwrap').hidden = !srv.googleClientId;
    $('or-line').hidden = !srv.githubEnabled && !srv.googleClientId;
    if (NATIVE) $('g-over').style.display = 'none'; // no app o botão invisível do Google não pode ficar por cima do nosso
  }
  $('b-github').onclick = function () {
    if (!NATIVE) { location.href = (API || '') + '/api/auth/github/start'; return; }
    var u = new URL(API || location.origin); if (u.hostname === '127.0.0.1') u.hostname = 'localhost';
    var br = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
    var link = u.origin + '/api/auth/github/start?app=1';
    if (br) br.open({ url: link }); else window.open(link, '_blank');
  };
  $('b-google').onclick = function () {
    if (!srv.googleClientId) { $('e-home').textContent = t('googleOff'); return; }
    if (!NATIVE) return;
    // O Google não deixa entrar de dentro de um app: abre no navegador e volta pelo link orvex://auth?code=...
    var u = new URL(API || location.origin); if (u.hostname === '127.0.0.1') u.hostname = 'localhost';
    var br = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
    var link = u.origin + '/google-login.html';
    if (br) br.open({ url: link }); else window.open(link, '_blank');
  };
  (function () {
    var ap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!NATIVE || !ap || !ap.addListener) return;
    ap.addListener('appUrlOpen', async function (ev) {
      var m = String((ev && ev.url) || '').match(/^orvex:\/\/auth\?code=([a-f0-9]+)/); if (!m) return;
      try { var br = window.Capacitor.Plugins.Browser; if (br && br.close) br.close(); } catch (e) {}
      try { afterLogin(await api('POST', '/api/auth/exchange', { code: m[1] })); } catch (e) { toast(errText(e)); }
    });
  })();

  /* ================= estado do chat ================= */
  var data = { chats: [], projects: [], codes: [] };
  var cur = null; var curProject = null; var speed = lsGet('orvex:speed') || 'mid';
  if (!/^(slow|mid|fast)$/.test(speed)) speed = 'mid';
  var busy = false; var abortCtl = null; var queue = []; var pending = []; // pending = anexos já enviados
  var inp = $('inp'); var msgs = $('msgs');

  function enter() {
    $('hello').textContent = t('hello', { n: (user.name || '').split(' ')[0] });
    cur = null; curProject = null; renderEmpty(); show('s-chat'); net(); refreshLists();
  }
  async function refreshLists() {
    try { data.chats = (await api('GET', '/api/chats')).chats; data.projects = (await api('GET', '/api/projects')).projects; } catch (e) {}
  }
  function doLogout(silent) {
    try { if (token && !silent) api('POST', '/api/auth/logout'); } catch (e) {}
    if (abortCtl) abortCtl.abort();
    token = null; user = null; lsSet('orvex:token', null); lsSet('orvex:user', null);
    data = { chats: [], projects: [], codes: [] }; cur = null; curProject = null; queue = []; pending = [];
    ['m-mail', 'p-name', 'p-birth'].forEach(function (i) { $(i).value = ''; }); cin.forEach(function (x) { x.value = ''; });
    closeDrawer(); step('st-home'); show('s-login'); if (silent) toast(t('sessionEnd'));
  }

  /* ----- fala, velocidade, anexos ----- */
  function setSpeed(s) { speed = s; lsSet('orvex:speed', s); $('speed-lbl').textContent = t(s); document.querySelectorAll('[data-speed]').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-speed') === s); }); }
  setSpeed(speed);
  function closePops() { $('pop-plus').classList.remove('on'); $('pop-speed').classList.remove('on'); }
  $('b-plus').onclick = function (e) { e.stopPropagation(); var o = $('pop-plus').classList.contains('on'); closePops(); if (!o) $('pop-plus').classList.add('on'); };
  $('b-speed').onclick = function (e) { e.stopPropagation(); var o = $('pop-speed').classList.contains('on'); closePops(); if (!o) $('pop-speed').classList.add('on'); };
  document.addEventListener('click', closePops);
  document.querySelectorAll('[data-speed]').forEach(function (b) { b.onclick = function () { setSpeed(b.getAttribute('data-speed')); }; });
  document.querySelectorAll('[data-pick]').forEach(function (b) { b.onclick = function () { $('f-' + b.getAttribute('data-pick')).click(); }; });

  // miniatura de foto/vídeo: pelo arquivo local (antes de enviar) ou por um link assinado do servidor (conversa antiga)
  function thumb(x) {
    var isImg = /^image\//.test(x.mime || ''), isVid = /^video\//.test(x.mime || ''); if (!isImg && !isVid) return null;
    var m = el(isImg ? 'img' : 'video', 'thumb'); m.setAttribute('alt', x.name || '');
    if (isVid) { m.muted = true; m.playsInline = true; m.preload = 'metadata'; if (!x.local) m.controls = true; }
    if (x.local) m.src = x.local;
    else api('POST', '/api/upload/link', { id: x.id }).then(function (r) { m.src = API + r.url; }).catch(function () { m.remove(); });
    return m;
  }
  function renderChips() {
    var a = $('attached'); a.innerHTML = ''; a.hidden = !pending.length;
    pending.forEach(function (p, i) {
      var c = el('div', 'chip2'); var th = thumb(p); if (th) c.appendChild(th); c.appendChild(el('span', '', p.name));
      var x = el('button'); x.innerHTML = I.x; x.setAttribute('aria-label', t('remove')); x.onclick = function () { pending.splice(i, 1); renderChips(); upd(); }; c.appendChild(x); a.appendChild(c);
    });
  }
  ['photo', 'video', 'file', 'camera'].forEach(function (kk) {
    $('f-' + kk).onchange = async function () {
      var files = Array.prototype.slice.call(this.files || []); this.value = '';
      for (var i = 0; i < files.length && pending.length < 6; i++) {
        var f = files[i];
        try {
          var h = { 'Content-Type': f.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(f.name || 'arquivo'), Authorization: 'Bearer ' + token };
          var r = await fetch(API + '/api/upload', { method: 'PUT', headers: h, body: f }); var j = await r.json();
          if (!r.ok) throw new Error(j.error || '');
          pending.push({ id: j.id, name: j.name, mime: j.mime || f.type || '', local: /^(image|video)\//.test(f.type || '') ? URL.createObjectURL(f) : '' });
        } catch (e) { toast(t('attachFail') + (e.message ? ' ' + e.message : '')); }
      }
      renderChips(); upd();
    };
  });

  function upd() { $('b-send').disabled = !busy && !inp.value.trim() && !pending.length; }
  inp.oninput = function () { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 120) + 'px'; upd(); };
  inp.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); if (!busy) send(); } };

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition; var rec = null;
  $('b-mic').onclick = function () {
    var b = this;
    if (rec) { rec.stop(); return; }
    if (!SR) { toast(t('speechNo')); return; }
    rec = new SR(); rec.lang = navigator.language || 'pt-BR'; rec.interimResults = true; rec.continuous = false;
    var base = inp.value ? inp.value + ' ' : '';
    b.classList.add('rec'); inp.placeholder = t('listening');
    rec.onresult = function (ev) { var s = ''; for (var i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript; inp.value = base + s; inp.oninput(); };
    rec.onerror = function () { toast(t('speechNo')); };
    rec.onend = function () { b.classList.remove('rec'); inp.placeholder = t('placeholder'); rec = null; };
    try { rec.start(); } catch (e) { rec = null; b.classList.remove('rec'); toast(t('speechNo')); }
  };

  /* ================= mensagens ================= */
  function bottom() { msgs.scrollTop = msgs.scrollHeight; }
  function renderEmpty() { clearMsgs(); $('empty').hidden = false; $('ctitle').textContent = projName(curProject) || 'ORVEX'; }
  function clearMsgs() { Array.prototype.slice.call(msgs.children).forEach(function (c) { if (c.id !== 'empty') c.remove(); }); }
  function projName(id) { var p = data.projects.filter(function (x) { return x.id === id; })[0]; return p ? p.name : ''; }
  function typeLabel(ty) { return t('t' + ty.charAt(0).toUpperCase() + ty.slice(1)); }

  function inline(node, s) {
    var re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g; var last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) node.appendChild(document.createTextNode(s.slice(last, m.index)));
      var tok = m[0];
      if (tok[0] === '`') node.appendChild(el('code', '', tok.slice(1, -1)));
      else if (tok[0] === '*') node.appendChild(el('b', '', tok.slice(2, -2)));
      else { var mm = /^\[([^\]]+)\]\((.+)\)$/.exec(tok); var a = el('a', '', mm[1]); a.href = mm[2]; a.target = '_blank'; a.rel = 'noopener noreferrer'; node.appendChild(a); }
      last = re.lastIndex;
    }
    if (last < s.length) node.appendChild(document.createTextNode(s.slice(last)));
  }
  function parseBlocks(s) {
    var out = [], re = /```([\w+#.\-]*)[^\n]*\n([\s\S]*?)(```|$)/g, last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ k: 't', x: s.slice(last, m.index) });
      out.push({ k: 'c', l: m[1] || 'code', x: m[2].replace(/\n$/, '') }); last = re.lastIndex; if (m[3] === '') break;
    }
    if (last < s.length) out.push({ k: 't', x: s.slice(last) });
    return out;
  }
  function sel(node) { try { var r = document.createRange(); r.selectNodeContents(node); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }
  function copyText(text, btn, fallbackNode) {
    function ok() { if (btn) { btn.innerHTML = I.check; setTimeout(function () { btn.innerHTML = I.copy; }, 1200); } }
    try { navigator.clipboard.writeText(text).then(ok, function () { if (fallbackNode) sel(fallbackNode); }); } catch (e) { if (fallbackNode) sel(fallbackNode); }
  }
  function codeBox(code, lang, stream) {
    var box = el('div', 'codebox'), bar = el('div', 'codebar'); bar.appendChild(el('span', 'lang', lang || 'code'));
    var pre = el('pre', '', code);
    function mk(icon, label, fn) { var b = el('button'); b.innerHTML = icon; b.setAttribute('aria-label', label); b.title = label; b.onclick = function () { fn(b); }; bar.appendChild(b); }
    mk(I.copy, t('copy'), function (b) { copyText(code, b, pre); });
    mk(I.share, t('share'), function () { try { if (navigator.share) navigator.share({ text: code }); else sel(pre); } catch (e) {} });
    if (!stream) mk(I.save, t('save'), function () {
      bar.innerHTML = ''; var i = el('input'); i.placeholder = t('codeName'); i.maxLength = 40; i.setAttribute('aria-label', t('codeName'));
      var ok = el('button'); ok.innerHTML = I.check; ok.setAttribute('aria-label', t('save'));
      ok.onclick = async function () {
        var n = i.value.trim(); if (!n) { i.focus(); return; }
        try { await api('POST', '/api/codes', { name: n, lang: lang || 'code', code: code }); bar.innerHTML = ''; bar.appendChild(el('span', 'lang', t('saved') + ': ' + n)); } catch (e) { toast(errText(e)); }
      };
      i.onkeydown = function (e) { if (e.key === 'Enter') ok.click(); };
      bar.appendChild(i); bar.appendChild(ok); i.focus();
    });
    box.appendChild(bar); box.appendChild(pre); return box;
  }
  function fillText(am, text, stream) {
    am._t.innerHTML = '';
    parseBlocks(text).forEach(function (b, idx, arr) {
      if (b.k === 't') { if (!b.x.trim()) return; var d = el('div', 'bub ai'); inline(d, b.x.trim()); am._t.appendChild(d); }
      else am._t.appendChild(codeBox(b.x, b.l, stream && idx === arr.length - 1));
    });
  }
  function newAssistant() { var am = el('div', 'amsg'); am._t = el('div'); am._t.style.cssText = 'display:flex;flex-direction:column;gap:8px'; am._p = el('div'); am._p.style.cssText = 'display:flex;flex-direction:column;gap:8px'; am.appendChild(am._t); am.appendChild(am._p); return am; }

  function addUser(text, atts) {
    $('empty').hidden = true;
    if (text) msgs.appendChild(el('div', 'bub me', text));
    if (atts && atts.length) { var a = el('div', 'att'); atts.forEach(function (x) { var th = thumb(x); a.appendChild(th || el('span', '', x.name)); }); msgs.appendChild(a); }
    bottom();
  }

  /* ----- cartões de pasta / arquivo / imagem ----- */
  async function linkFor(chatId, path, download) { return API + (await api('POST', '/api/files/link', { chat: chatId, path: path, download: !!download })).url; }
  function download(url) {
    // No APK (Capacitor) o download vai pelo navegador do celular; no navegador comum, direto.
    var cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
    if (cap) { cap.open({ url: url }); return; }
    var a = document.createElement('a'); a.href = url; a.rel = 'noopener'; a.download = ''; document.body.appendChild(a); a.click(); a.remove();
  }
  function partCard(part, chatId) {
    if (part.kind === 'image') {
      var img = el('img', 'shot'); img.alt = part.name; img.loading = 'lazy';
      linkFor(chatId, part.path, false).then(function (u) { img.src = u; }).catch(function () {}); return img;
    }
    var card = el('div', 'folder'), head = el('div', 'fhead');
    var ic = el('span', 'ficon'); ic.innerHTML = part.kind === 'folder' ? I.folder : I.doc; head.appendChild(ic); head.appendChild(el('b', '', part.name));
    var inst = el('button', 'install', t('install')); inst.onclick = async function () { try { download(await linkFor(chatId, part.path, true)); } catch (e) { toast(errText(e)); } };
    head.appendChild(inst);
    var tree = el('div', 'ftree'); tree.hidden = true;
    var ar = el('button', 'icon'); ar.innerHTML = I.arrow; ar.setAttribute('aria-label', t(part.kind === 'folder' ? 'seeFiles' : 'view')); ar.title = t(part.kind === 'folder' ? 'seeFiles' : 'view');
    if (part.kind === 'folder') {
      var loaded = false;
      ar.onclick = async function () {
        tree.hidden = !tree.hidden; if (tree.hidden || loaded) return;
        try {
          var r = await api('GET', '/api/files/tree?chat=' + encodeURIComponent(chatId) + '&path=' + encodeURIComponent(part.path)); loaded = true;
          if (!r.items.length) tree.appendChild(el('div', 'emp', t('emptyFolder')));
          r.items.forEach(function (it) {
            var row = el('div', 'trow'); row.style.setProperty('--d', it.depth);
            var i2 = el('span'); i2.style.cssText = 'flex:none;display:flex'; i2.innerHTML = it.dir ? I.folder : I.doc; row.appendChild(i2); row.appendChild(el('span', '', it.name));
            if (!it.dir) { var eye = el('button'); eye.innerHTML = I.eye; eye.setAttribute('aria-label', t('view')); eye.title = t('view'); eye.onclick = function () { openViewer(chatId, it.path, it.name); }; row.appendChild(eye); }
            tree.appendChild(row);
          });
        } catch (e) { toast(errText(e)); }
      };
    } else ar.onclick = function () { openViewer(chatId, part.path, part.name); };
    head.appendChild(ar); card.appendChild(head); card.appendChild(tree); return card;
  }
  async function openViewer(chatId, path, name) {
    var v = $('viewer'), body = $('v-body'); body.innerHTML = ''; $('v-title').textContent = name; $('v-copy').innerHTML = ''; v.classList.add('on');
    try {
      var r = await api('GET', '/api/files/view?chat=' + encodeURIComponent(chatId) + '&path=' + encodeURIComponent(path));
      if (r.kind === 'image') { var im = el('img'); im.alt = name; im.src = await linkFor(chatId, path, false); body.appendChild(im); }
      else if (r.kind === 'binary') body.appendChild(el('p', 'emp', t('binary')));
      else {
        var pre = el('pre', '', r.text); body.appendChild(pre); var cb = $('v-copy'); cb.innerHTML = I.copy; cb.onclick = function () { copyText(r.text, cb, pre); };
        if (r.truncated) toast(t('truncated'));
      }
    } catch (e) { body.appendChild(el('p', 'emp', errText(e))); }
  }
  $('v-close').onclick = function () { $('viewer').classList.remove('on'); };

  function renderHistory(list, chatId) {
    clearMsgs(); $('empty').hidden = !!list.length;
    list.forEach(function (m) {
      if (m.role === 'user') addUser(m.text, (m.parts || []).filter(function (p) { return p.kind === 'attachment'; }));
      else { var am = newAssistant(); fillText(am, m.text, false); (m.parts || []).forEach(function (p) { am._p.appendChild(partCard(p, chatId)); }); msgs.appendChild(am); }
    });
    bottom();
  }

  /* ================= envio (streaming) ================= */
  function setBusy(b) { busy = b; if (!b) lsSet('orvex:run', null); $('ic-send').hidden = b; $('ic-stop').hidden = !b; $('b-send').setAttribute('aria-label', t(b ? 'stop' : 'send')); upd(); if (b) $('b-send').disabled = false; }
  function statusText(ev) { return t(ev.key, { f: ev.arg || '' }) + '...'; }

  function send() {
    var text = inp.value.trim(); if (!text && !pending.length) return;
    if (!cur) cur = { id: rid(), project_id: curProject };
    var atts = pending.slice(); pending = []; renderChips();
    inp.value = ''; inp.style.height = 'auto';
    addUser(text, atts);
    var job = { chatId: cur.id, projectId: cur.project_id || null, text: text, attachments: atts.map(function (a) { return a.id; }), speed: speed };
    if (navigator.onLine === false) { enqueue(job); return; }
    run(job);
  }
  function enqueue(job) {
    queue.push(job); setBusy(true);
    var st = el('div', 'status'); st.id = 'st-wait'; st.innerHTML = '<b></b>'; st.appendChild(el('span', '', t('waiting') + '...')); msgs.appendChild(st); bottom();
  }
  function flushQueue() {
    if (!queue.length || navigator.onLine === false) return;
    var w = $('st-wait'); if (w) w.remove(); var j = queue.shift(); run(j);
  }

  async function run(job) {
    setBusy(true); lsSet('orvex:run', job.chatId); var ac = new AbortController(); abortCtl = ac; var rs = { ac: ac, synced: false, stopped: false, chatId: job.chatId, last: Date.now() }; curRun = rs; var gotDone = false;
    var st = el('div', 'status'); st.innerHTML = '<b></b>'; var stSpan = el('span', '', t('think') + '...'); st.appendChild(stSpan); msgs.appendChild(st); bottom();
    var am = null; var text = ''; var raf = 0;
    function ensure() { if (!am) { am = newAssistant(); msgs.insertBefore(am, st); } return am; }
    function draw() { raf = 0; if (am) { fillText(am, text, true); bottom(); } }
    var gotAny = false;
    try {
      var res = await fetch(API + '/api/chats/' + job.chatId + '/send', {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ text: job.text, attachments: job.attachments, speed: job.speed, lang: L, project_id: job.projectId })
      });
      if (!res.ok) { var j = {}; try { j = await res.json(); } catch (e) {} var er = new Error(j.error || ('HTTP ' + res.status)); er.code = j.code; if (res.status === 401) doLogout(true); throw er; }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      for (;;) {
        var chunk = await reader.read(); if (chunk.done) break; gotAny = true; rs.last = Date.now();
        buf += dec.decode(chunk.value, { stream: true }); var idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          var block = buf.slice(0, idx); buf = buf.slice(idx + 2);
          block.split('\n').forEach(function (line) {
            if (line.indexOf('data: ') !== 0) return; var ev; try { ev = JSON.parse(line.slice(6)); } catch (e) { return; }
            if (ev.type === 'status') stSpan.textContent = statusText(ev);
            else if (ev.type === 'delta') { ensure(); text += ev.text; if (!raf) raf = requestAnimationFrame(draw); }
            else if (ev.type === 'present') { ensure()._p.appendChild(partCard(ev, job.chatId)); bottom(); }
            else if (ev.type === 'error') toast(ev.message);
            else if (ev.type === 'done') gotDone = true;
          });
        }
      }
      if (raf) { cancelAnimationFrame(raf); } if (am) fillText(am, text, false);
      if (!gotDone && !rs.stopped) { await resync(job, st, stSpan, rs); return; }
    } catch (e) {
      if (raf) cancelAnimationFrame(raf);
      if (rs.synced && !rs.stopped) { await resync(job, st, stSpan, rs); return; }
      if (e && e.name === 'AbortError') { if (am) fillText(am, text, false); }
      else if ((gotAny || document.hidden) && !rs.stopped && (e instanceof TypeError || e.net)) { await resync(job, st, stSpan, rs); return; }
      else if (!gotAny && navigator.onLine === false) { st.remove(); abortCtl = null; enqueue(job); return; }
      else { var msg = (e instanceof TypeError || e.net) ? t('netErr') : errText(e); ensure(); if (!text) { text = msg; } fillText(am, text, false); toast(msg); }
    }
    st.remove(); abortCtl = null; if (!queue.length) setBusy(false); else flushQueue();
    refreshLists();
  }
  /* Voltou para o app (ou a conexão caiu) com a IA ainda trabalhando: espera o servidor terminar e mostra o resultado. */
  var curRun = null;
  async function resync(job, st, stSpan, rs) {
    rs.synced = true; abortCtl = rs.ac; stSpan.textContent = t('think') + '...';
    var r = null; var misses = 0;
    for (var i = 0; i < 450; i++) {
      try { r = await api('GET', '/api/chats/' + job.chatId); misses = 0; if (!r.running || rs.stopped) break; }
      catch (e) { if (e.status === 404 || ++misses > 40) { r = null; break; } }
      await new Promise(function (ok) { setTimeout(ok, 2000); });
      if (curRun !== rs) return; // trocou de chat ou começou outra resposta
    }
    if (curRun !== rs) return;
    st.remove(); abortCtl = null; curRun = null;
    if (r && cur && cur.id === job.chatId) renderHistory(r.messages, r.chat.id);
    else if (!r) toast(t('netErr'));
    if (!queue.length) setBusy(false); else flushQueue();
    refreshLists();
  }
  function comeBack() {
    if (document.hidden || !curRun || curRun.synced || curRun.stopped) return;
    curRun.synced = true; try { curRun.ac.abort(); } catch (e) {}
  }
  // Se a conexão congelou (celular segurou o app em segundo plano) e nada chega por 40 s, busca o resultado no servidor.
  setInterval(function () { if (curRun && !curRun.synced && !curRun.stopped && curRun.last && Date.now() - curRun.last > 40000) { curRun.synced = true; try { curRun.ac.abort(); } catch (e) {} } }, 5000);
  // Chat que ainda está respondendo no servidor (voltou para o app ou a página recarregou): mostra "Pensando..." e espera o resultado.
  function watchRunning(id) {
    setBusy(true); lsSet('orvex:run', id);
    var st = el('div', 'status'); st.innerHTML = '<b></b>'; var sp = el('span', '', t('think') + '...'); st.appendChild(sp); msgs.appendChild(st); bottom();
    var rs = { ac: new AbortController(), synced: true, stopped: false, chatId: id }; curRun = rs; abortCtl = rs.ac;
    resync({ chatId: id }, st, sp, rs);
  }
  document.addEventListener('visibilitychange', comeBack);
  window.addEventListener('pageshow', comeBack); window.addEventListener('focus', comeBack);

  $('b-send').onclick = function () {
    if (busy) { if (curRun) { curRun.stopped = true; if (token) api('POST', '/api/chats/' + curRun.chatId + '/stop', {}).catch(function () {}); } if (abortCtl) abortCtl.abort(); else if (queue.length) { queue = []; var w = $('st-wait'); if (w) w.remove(); setBusy(false); } }
    else send();
  };

  /* ================= gaveta ================= */
  function closeDrawer() { $('drawer').classList.remove('on'); $('scrim').classList.remove('on'); }
  async function openDrawer() {
    $('drawer').classList.add('on'); $('scrim').classList.add('on'); drawChats();
    try { data.chats = (await api('GET', '/api/chats')).chats; drawChats(); } catch (e) {}
  }
  function drawChats() {
    var l = $('d-chats'); l.innerHTML = '';
    var list = data.chats.filter(function (c) { return !c.project_id; });
    if (!list.length) { var e = el('div', 'note', t('noChats')); e.style.padding = '8px 12px'; l.appendChild(e); return; }
    list.forEach(function (c) { var b = el('button'); b.appendChild(el('span', '', c.title || t('untitled'))); b.onclick = function () { openChat(c.id); }; l.appendChild(b); });
  }
  async function openChat(id) {
    if (abortCtl) abortCtl.abort(); closeDrawer();
    try {
      var r = await api('GET', '/api/chats/' + id);
      cur = { id: r.chat.id, project_id: r.chat.project_id }; curProject = r.chat.project_id || null;
      renderHistory(r.messages, r.chat.id); $('ctitle').textContent = projName(curProject) || 'ORVEX'; show('s-chat');
      if (r.running) watchRunning(id); else { curRun = null; abortCtl = null; setBusy(false); }
    } catch (e) { toast(errText(e)); }
  }
  function newChat(pid) { if (abortCtl) abortCtl.abort(); queue = []; setBusy(false); cur = null; curProject = pid || null; renderEmpty(); closeDrawer(); show('s-chat'); inp.focus(); }
  $('b-menu').onclick = openDrawer; $('scrim').onclick = closeDrawer;
  $('d-new').onclick = function () { newChat(null); };
  $('d-proj').onclick = function () { closeDrawer(); renderProjects(); show('s-projects'); };
  $('d-code').onclick = function () { closeDrawer(); $('cd-search').value = ''; loadCodes(); show('s-codes'); };
  $('d-set').onclick = function () { closeDrawer(); $('st-name').textContent = user.name; $('st-mail2').textContent = user.email; $('st-lang').textContent = L.toUpperCase(); $('st-ai').hidden = !user.admin; show('s-settings'); };
  document.querySelectorAll('[data-back]').forEach(function (b) { b.onclick = function () { show(b.getAttribute('data-back') || 's-chat'); }; });
  $('d-out').onclick = function () { doLogout(false); }; $('st-out').onclick = function () { doLogout(false); };

  /* ================= projetos ================= */
  $('pj-add').onclick = function () { $('pj-form').classList.toggle('on'); $('pj-name').focus(); };
  $('pj-create').onclick = async function () {
    var n = $('pj-name').value.trim(); if (!n) { $('e-proj').textContent = t('eProj'); return; }
    try { var r = await api('POST', '/api/projects', { name: n, type: $('pj-type').value }); data.projects.unshift(r.project); $('pj-name').value = ''; $('e-proj').textContent = ''; $('pj-form').classList.remove('on'); renderProjects(); }
    catch (e) { $('e-proj').textContent = errText(e); }
  };
  async function renderProjects() {
    try { data.projects = (await api('GET', '/api/projects')).projects; data.chats = (await api('GET', '/api/chats')).chats; } catch (e) {}
    var l = $('pj-list'); l.innerHTML = '';
    if (!data.projects.length) { l.appendChild(el('p', 'emp', t('noProj'))); return; }
    data.projects.forEach(function (p) {
      var n = data.chats.filter(function (c) { return c.project_id === p.id; }).length;
      var b = el('button', 'item'); b.appendChild(el('b', '', p.name)); b.appendChild(el('small', '', typeLabel(p.type) + ' · ' + n + ' chat' + (n === 1 ? '' : 's')));
      b.onclick = function () { openProject(p); }; l.appendChild(b);
    });
  }
  function openProject(p) {
    curProject = p.id; $('pd-title').textContent = p.name;
    var l = $('pd-list'); l.innerHTML = '';
    var list = data.chats.filter(function (c) { return c.project_id === p.id; });
    if (!list.length) l.appendChild(el('p', 'emp', t('noProjChats')));
    list.forEach(function (c) { var b = el('button', 'item'); b.appendChild(el('b', '', c.title || t('untitled'))); b.appendChild(el('small', '', fmt(c.ts))); b.onclick = function () { openChat(c.id); }; l.appendChild(b); });
    $('pd-new').onclick = function () { newChat(p.id); };
    show('s-project');
  }

  /* ================= códigos salvos ================= */
  $('cd-search').oninput = drawCodes;
  async function loadCodes() { try { data.codes = (await api('GET', '/api/codes')).codes; } catch (e) {} drawCodes(); }
  function drawCodes() {
    var qv = $('cd-search').value.trim().toLowerCase(), l = $('cd-list'); l.innerHTML = '';
    if (!data.codes.length) { l.appendChild(el('p', 'emp', t('noCodes'))); return; }
    var list = data.codes.filter(function (c) { return !qv || c.name.toLowerCase().indexOf(qv) > -1; });
    if (!list.length) { l.appendChild(el('p', 'emp', t('noMatch'))); return; }
    list.forEach(function (c) {
      var b = el('button', 'item'); b.appendChild(el('b', '', c.name)); b.appendChild(el('small', '', (c.lang || 'code') + ' · ' + fmt(c.ts)));
      var open = null;
      b.onclick = function () { if (open) { open.remove(); open = null; return; } open = codeBox(c.code, c.lang, true); open.onclick = function (e) { e.stopPropagation(); }; b.after(open); };
      l.appendChild(b);
    });
  }


  /* ================= conectores ================= */
  var CATS = ['host', 'code', 'msg', 'notes', 'other']; var conns = [];
  var plugIcon = SV + '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/></svg>';
  async function loadConnectors() { try { conns = (await api('GET', '/api/connectors')).connectors; } catch (e) { toast(errText(e)); } drawConnectors(); }
  function drawConnectors() {
    var l = $('cn-list'); l.innerHTML = '';
    CATS.forEach(function (cat) {
      var items = conns.filter(function (c) { return c.cat === cat; }); if (!items.length) return;
      l.appendChild(el('div', 'grp', t('cat_' + cat)));
      items.forEach(function (c) {
        var b = el('button', 'item'), r = el('div', 'row2'); r.appendChild(el('b', '', c.name));
        var st = el('div', 'cstat'); st.appendChild(el('span', '', c.connected ? (c.label || t('connected')) : t('notConnected'))); st.appendChild(el('i', 'dot' + (c.connected ? '' : ' off'))); r.appendChild(st);
        b.appendChild(r); b.onclick = function () { openConnector(c.id); }; l.appendChild(b);
      });
    });
  }
  function openConnector(id) {
    var c = conns.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    $('cn-title').textContent = c.name; var b = $('cn-body'); b.innerHTML = '';
    if (!c.connected) {
      var inputs = {};
      c.fields.forEach(function (f) {
        var w = el('div', 'field'), lb = el('label', '', t(f.label)); var i = el('input'); i.type = f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : 'text'; i.id = 'cf-' + f.k; lb.htmlFor = i.id;
        i.autocomplete = 'off'; i.autocapitalize = 'off'; i.spellcheck = false; inputs[f.k] = i; w.appendChild(lb); w.appendChild(i); b.appendChild(w);
      });
      if (c.help) { var a = el('a', 'alink', t('howToken')); a.href = c.help; a.target = '_blank'; a.rel = 'noopener noreferrer'; b.appendChild(a); }
      var er = el('p', 'err'); er.setAttribute('role', 'alert'); b.appendChild(er);
      var btn = el('button', 'btn solid', t('connect'));
      btn.onclick = async function () {
        var fields = {}; Object.keys(inputs).forEach(function (k) { fields[k] = inputs[k].value; });
        btn.disabled = true; btn.textContent = t('connecting'); er.textContent = '';
        try { var r = await api('POST', '/api/connectors/' + c.id + '/connect', { fields: fields }); replace(r.connector); openConnector(c.id); }
        catch (e) { er.textContent = errText(e); btn.disabled = false; btn.textContent = t('connect'); }
      };
      b.appendChild(btn);
    } else {
      var s = el('div', 'cstat'); s.appendChild(el('i', 'dot')); s.appendChild(el('span', '', t('connectedAs', { n: c.label || c.name }))); s.style.color = 'var(--fg)'; b.appendChild(s);
      b.appendChild(el('div', 'grp', t('perms')));
      c.perms.forEach(function (p) {
        var row = el('div', 'perm'), tx = el('div', 'pt'); tx.appendChild(el('b', '', t('p_' + p.id)));
        tx.appendChild(el('small', '', p.actions.length ? p.actions.join(', ') : t('noActions'))); row.appendChild(tx);
        var sw = el('button', 'sw'); sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', p.on); sw.setAttribute('aria-label', t('p_' + p.id));
        sw.onclick = async function () {
          var on = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', on); var o = {}; o[p.id] = on;
          try { replace((await api('POST', '/api/connectors/' + c.id + '/perms', { perms: o })).connector); } catch (e) { sw.setAttribute('aria-checked', !on); toast(errText(e)); }
        };
        row.appendChild(sw); b.appendChild(row);
      });
      b.appendChild(el('p', 'hint', t('permsHint')));
      var d = el('button', 'btn', t('disconnect')); d.style.marginTop = '12px';
      d.onclick = async function () { try { await api('DELETE', '/api/connectors/' + c.id); await loadConnectors(); show('s-connectors'); } catch (e) { toast(errText(e)); } };
      b.appendChild(d);
    }
    show('s-connector');
  }
  function replace(c) { conns = conns.map(function (x) { return x.id === c.id ? c : x; }); drawConnectors(); }
  function goConnectors() { closeDrawer(); $('cn-list').innerHTML = ''; drawConnectors(); show('s-connectors'); loadConnectors(); }
  $('d-conn').onclick = goConnectors; $('st-conn').onclick = goConnectors;

  /* ================= servidor (APK) ================= */
  function openServer(back) {
    $('sv-in').value = API; $('sv-cur').textContent = t('serverCur', { a: API || '-' }); $('sv-err').textContent = '';
    $('sv-back').onclick = function () { if (back === 's-settings') show('s-settings'); else { show('s-login'); step('st-home'); } };
    show('s-login'); step('st-server');
  }
  $('sv-save').onclick = function () {
    var v = $('sv-in').value.trim().replace(/\/+$/, '');
    try { var u = new URL(v); if (!/^https?:$/.test(u.protocol)) throw 0; } catch (e) { $('sv-err').textContent = t('serverBad'); return; }
    lsSet('orvex:server', v); lsSet('orvex:token', null); location.reload();
  };
  $('b-server').onclick = function () { openServer('home'); };
  $('st-server-btn').onclick = function () { openServer('s-settings'); };
  if (NATIVE) { $('b-server').hidden = false; $('st-server-btn').hidden = false; }

  /* ================= configurações da IA (dono) ================= */
  var aiFields = [], GROUPS = ['model', 'code', 'vision', 'image', 'terminal', 'limits'];
  async function openAI() {
    var b = $('ai-body'); b.innerHTML = ''; b.appendChild(el('p', 'hint', t('aiHint'))); show('s-ai');
    try { aiFields = (await api('GET', '/api/admin/settings')).fields; } catch (e) { toast(errText(e)); return; }
    var models = [], mErr = '';
    try { models = (await api('GET', '/api/admin/models')).models; } catch (e) { mErr = errText(e); }
    var dl = el('datalist'); dl.id = 'ai-models'; models.forEach(function (m) { var o = el('option'); o.value = m; dl.appendChild(o); }); b.appendChild(dl);
    var inputs = {};
    GROUPS.forEach(function (g) {
      b.appendChild(el('div', 'grp', t('g_' + g)));
      aiFields.filter(function (f) { return f.group === g; }).forEach(function (f) {
        var w = el('div', 'field'), lb = el('label', '', t('f_' + f.id)); lb.htmlFor = 'ai-' + f.id;
        var i;
        if (f.type === 'enum') { i = el('select'); f.options.forEach(function (o) { var op = el('option', '', f.id === 'exec' ? t('o_' + o) : o); op.value = o; i.appendChild(op); }); i.value = f.value; }
        else if (f.type === 'bool') {
          i = el('button', 'sw'); i.setAttribute('role', 'switch'); i.setAttribute('aria-checked', !!f.value); i.setAttribute('aria-label', t('f_' + f.id));
          i.onclick = function () { i.setAttribute('aria-checked', i.getAttribute('aria-checked') !== 'true'); };
          var row = el('div', 'perm'), tx = el('div', 'pt'); tx.appendChild(el('b', '', t('f_' + f.id))); row.appendChild(tx); row.appendChild(i); b.appendChild(row); inputs[f.id] = i; return;
        } else {
          i = el('input'); i.type = f.type === 'num' ? 'number' : f.type === 'secret' ? 'password' : f.type === 'url' ? 'url' : 'text'; i.value = f.value == null ? '' : f.value;
          if (f.type === 'num') { i.step = 'any'; i.inputMode = 'decimal'; }
          if (f.type === 'name' && g !== 'terminal' && f.id !== 'i_model') i.setAttribute('list', 'ai-models');
          i.autocomplete = 'off'; i.autocapitalize = 'off'; i.spellcheck = false;
        }
        i.id = 'ai-' + f.id; inputs[f.id] = i; w.appendChild(lb); w.appendChild(i); b.appendChild(w);
        if (f.id === 'exec') { var wn = el('p', 'hint', t('execWarn')); wn.id = 'ai-warn'; wn.hidden = f.value !== 'local'; i.onchange = function () { wn.hidden = i.value !== 'local'; }; b.appendChild(wn); }
      });
      if (g === 'model') b.appendChild(el('p', 'hint', mErr ? t('modelsErr', { e: mErr }) : t('modelsOk', { n: models.length })));
    });
    var er = el('p', 'err'); er.setAttribute('role', 'alert'); b.appendChild(er);
    var sv = el('button', 'btn solid', t('aiSave'));
    sv.onclick = async function () {
      var p = {}; aiFields.forEach(function (f) { var i = inputs[f.id]; p[f.id] = f.type === 'bool' ? i.getAttribute('aria-checked') === 'true' : i.value; });
      sv.disabled = true; er.textContent = '';
      try { aiFields = (await api('POST', '/api/admin/settings', p)).fields; toast(t('aiSaved')); } catch (e) { er.textContent = errText(e); }
      sv.disabled = false;
    };
    b.appendChild(sv);
    var rs = el('button', 'btn', t('resetDef')); rs.style.marginTop = '10px';
    rs.onclick = async function () { try { await api('POST', '/api/admin/settings/reset', {}); toast(t('aiSaved')); openAI(); } catch (e) { toast(errText(e)); } };
    b.appendChild(rs);
  }
  $('st-ai').onclick = openAI;

  /* ================= rede ================= */
  function net() {
    var n = $('net'), c = navigator.connection;
    if (navigator.onLine === false) { n.textContent = t('offline'); n.classList.add('on'); }
    else if (c && (c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || ''))) { n.textContent = t('weak'); n.classList.add('on'); }
    else n.classList.remove('on');
  }
  window.addEventListener('online', function () { net(); flushQueue(); });
  window.addEventListener('offline', net);
  if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', net);

  /* ================= início ================= */
  (async function boot() {
    if (NATIVE && !API) { openServer('home'); return; }
    try { srv = await api('GET', '/api/config'); } catch (e) {}
    initGoogle(); loginButtons();
    if (token) {
      try { var r = await api('GET', '/api/me'); user = r.user; lsSet('orvex:user', JSON.stringify(user)); if (user.complete) { enter(); var rid0 = lsGet('orvex:run'); if (rid0) openChat(rid0); } else { show('s-login'); step('st-profile'); } return; }
      catch (e) { if (e.net) { try { user = JSON.parse(lsGet('orvex:user') || 'null'); } catch (x) {} if (user && user.complete) { enter(); return; } } }
    }
    show('s-login'); step('st-home');
  })();
})();
