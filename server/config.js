'use strict';
const path = require('path');
const fs = require('fs');

// Lê um arquivo .env simples (CHAVE=valor) se existir. Sem dependências.
(function loadEnv() {
  const f = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
})();

const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);
const num = (k, d) => { const v = Number(env(k, d)); return Number.isFinite(v) ? v : d; };

const dataDir = path.resolve(env('DATA_DIR', path.join(__dirname, '..', 'data')));
fs.mkdirSync(path.join(dataDir, 'ws'), { recursive: true });
fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });

module.exports = {
  port: num('PORT', 3000),
  host: env('HOST', '0.0.0.0'),
  dataDir,
  publicDir: path.join(__dirname, '..', 'public'),

  // Segredo para assinar links de download. Se não existir, é gerado e guardado em data/.
  secret: (() => {
    if (process.env.APP_SECRET) return process.env.APP_SECRET;
    const f = path.join(dataDir, '.secret');
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
    const s = require('crypto').randomBytes(32).toString('hex');
    fs.writeFileSync(f, s, { mode: 0o600 });
    return s;
  })(),

  // Login
  googleClientId: env('GOOGLE_CLIENT_ID', ''),
  githubClientId: env('GITHUB_CLIENT_ID', ''),
  githubClientSecret: env('GITHUB_CLIENT_SECRET', ''),
  publicUrl: env('PUBLIC_URL', '').replace(/\/+$/, ''), // opcional: endereço do servidor para o retorno do GitHub
  resendApiKey: env('RESEND_API_KEY', ''),
  smtpUser: env('SMTP_USER', ''), // e-mail do Gmail que envia os códigos
  smtpPass: env('SMTP_PASS', '').replace(/\s+/g, ''), // senha de app do Gmail (16 letras)
  smtpHost: env('SMTP_HOST', 'smtp.gmail.com'),
  smtpPort: num('SMTP_PORT', 465),
  smtpSecure: env('SMTP_SECURE', '1') !== '0',
  mailFrom: env('MAIL_FROM', 'ORVEX <onboarding@resend.dev>'),
  devCodes: env('ALLOW_DEV_CODES', '0') === '1', // devolve o código na resposta (só para testes locais)
  minAge: num('MIN_AGE', 13),

  // Modelo. provider: "openai" (Ollama, llama.cpp, vLLM, qualquer API compatível) ou "mock" (testes).
  provider: env('MODEL_PROVIDER', 'openai'),
  modelBase: env('MODEL_BASE_URL', 'http://127.0.0.1:11434/v1'),
  modelKey: env('MODEL_API_KEY', ''),
  models: {
    fast: env('MODEL_FAST', env('MODEL', 'qwen2.5:3b')),
    mid: env('MODEL_MID', env('MODEL', 'qwen2.5:7b')),
    slow: env('MODEL_SLOW', env('MODEL', 'qwen2.5:7b')),
  },
  // Modelo de código: usado sozinho quando o pedido é de programação.
  codeModels: {
    fast: env('MODEL_CODE_FAST', 'qwen2.5-coder:3b'),
    mid: env('MODEL_CODE', 'qwen2.5-coder:7b'),
    slow: env('MODEL_CODE_SLOW', env('MODEL_CODE', 'qwen2.5-coder:7b')),
  },
  // Modelo de visão: liga sozinho quando chega foto ou vídeo e descreve para a IA principal. "off" desliga.
  visionModel: env('MODEL_VISION', 'qwen3-vl:4b') === 'off' ? '' : env('MODEL_VISION', 'qwen3-vl:4b'),
  // Gerador de imagem. api: "a1111" (stable-diffusion.cpp sd-server, AUTOMATIC1111, Forge) ou "openai" (/v1/images/generations).
  image: {
    baseUrl: env('IMAGE_BASE_URL', ''),
    api: env('IMAGE_API', 'a1111'),
    model: env('IMAGE_MODEL', ''),
    size: num('IMAGE_SIZE', 1024),
    steps: num('IMAGE_STEPS', 4),
    cfg: num('IMAGE_CFG', 1),
    dailyLimit: num('IMAGE_DAILY_LIMIT', 10),
  },

  // Terminal da IA: "docker" (isolado, recomendado), "local" (roda direto no servidor) ou "off".
  exec: env('EXEC_MODE', 'off'),
  dockerImage: env('EXEC_DOCKER_IMAGE', 'node:22-bookworm'),
  execNetwork: env('EXEC_NETWORK', 'none'), // nome da rede docker; "none" = sem internet
  chromeBin: env('CHROME_BIN', ''),

  // Deixa a IA e os conectores acessarem endereços da rede interna (localhost, 192.168.x.x). Padrão: bloqueado.
  allowPrivateUrls: env('ALLOW_PRIVATE_URLS', '0') === '1',

  // Modo simples: pedidos de criar pasta/projeto vão sem ferramentas e com um exemplo na instrução (melhor para modelos pequenos).
  simpleFiles: env('SIMPLE_FILES', '1') !== '0',

  dailyLimit: num('DAILY_LIMIT', 200),
  // Pontos: cada comando da IA (mensagem, ferramenta, arquivo entregue) custa pontos. Ao zerar, espera o tempo de espera.
  pointsTotal: num('POINTS_TOTAL', 100),
  pointsCost: num('POINTS_COST', 0.5),
  cooldownHours: num('COOLDOWN_HOURS', 3),
  cooldownMinutes: num('COOLDOWN_MINUTES', 20),
  maxUploadMB: num('MAX_UPLOAD_MB', 25),
  corsOrigin: env('CORS_ORIGIN', '*'),
};
