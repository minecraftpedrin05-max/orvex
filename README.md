# ORVEX

IA com chat, projetos, códigos salvos, pastas geradas, terminal e memória de conversas. Servidor em Node.js **sem nenhuma dependência** (só o que o Node 22 já traz) e app web em preto e branco que vira APK.

## Rodar

Precisa de Node 22.5 ou mais novo.

```bash
cp .env.example .env     # ajuste o que quiser
npm start                # abre em http://localhost:3000
```

Para testar sem baixar nenhum modelo: `MODEL_PROVIDER=mock ALLOW_DEV_CODES=1 npm start`.
Para rodar os testes: `npm test` (servidor) e `python3 test/e2e.py` (navegador, precisa de Playwright).

## Modelos (grátis)

O ORVEX fala com qualquer servidor compatível com a API da OpenAI. O jeito grátis é o **Ollama**. Tamanhos de download vêm das páginas do Ollama; a memória real é um pouco maior.

**Conversa e código.** O ORVEX troca sozinho: pedido de programação usa o modelo de código, o resto usa o modelo geral.

| Uso | Modelo (`ollama pull ...`) | Download | Observação |
|---|---|---|---|
| Geral (Rápido/Médio/Devagar) | `qwen2.5:3b` / `qwen2.5:7b` | pequeno | padrão do `.env.example`; bom em vários idiomas |
| Código, leve | `qwen2.5-coder:3b` / `:7b` | 1,9 / 4,7 GB | padrão; suporta ferramentas |
| Código, forte | `devstral:24b` | 14 GB | Apache 2.0; as fontes divergem sobre a nota (46,8% a 68% no SWE-Bench Verified) |
| Código, forte | `qwen3-coder:30b` | 19 GB | MoE, contexto de 256K |
| Código, forte | `gpt-oss:20b` | 14 GB | Apache 2.0 |

**Visão (foto e vídeo).** Liga sozinho só quando chega foto ou vídeo, descreve para a IA principal e desliga. Padrão `qwen3-vl:4b` (3,3 GB). Alternativas: `qwen3-vl:2b` (1,9 GB), `qwen3-vl:8b` (6,1 GB, lê bem texto em imagem), `gemma3:4b` / `gemma3:12b` (3,3 / 8,1 GB, 140+ idiomas). O Qwen3-VL pede Ollama 0.12.7 ou mais novo. Para vídeo o servidor precisa do `ffmpeg`.

**Gerar imagem.** Precisa de um servidor de imagem à parte, apontado em `IMAGE_BASE_URL`. O Ollama só gera imagem no macOS (até janeiro de 2026), então em Linux, PC ou Termux use o `sd-server` do [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp), que roda em CPU e Vulkan, e no Android pelo Termux. Modelos que ele suporta: SDXL-Turbo, FLUX.1 schnell (Apache 2.0), Z-Image Turbo (Apache 2.0), Qwen-Image, entre outros. Para pouca memória, SDXL com Lightning ou Turbo e imagem de 512 px. O limite é `IMAGE_DAILY_LIMIT` (10) por pessoa por dia, e cada imagem passa por uma segunda revisão do modelo de visão antes de aparecer. Sem modelo de visão, não há revisão.

Rodar esses modelos no próprio celular só serve para os bem pequenos. O normal é rodar em um PC ou servidor e o app (APK) só conversar com ele.

Como cada velocidade funciona:

| Velocidade | O que a IA faz |
|---|---|
| Rápido | Responde e gera o código na hora, sem terminal e sem checar erro. |
| Médio | Pode usar o terminal e corrige se der erro. Até 8 passos. |
| Devagar | Sempre roda o código no terminal antes de entregar e corrige o que aparecer. Até 16 passos. |

## O que a IA consegue fazer

Terminal, criar arquivos e pastas (cartão com **Instalar**, seta para ver os arquivos e olho para ver o conteúdo), pesquisar na internet, acessar sites e APIs, abrir páginas e mandar a captura de tela no chat (precisa de Chromium no servidor), analisar imagem e vídeo (precisa de modelo de visão e `ffmpeg`), lembrar de conversas passadas e guardar anotações sobre você.

## Conectores

Menu > **Conectores** (e também em Configurações). Lista todos os lugares onde a IA pode se conectar. Em cada um você cola o seu token, vê o que a IA pode fazer e liga ou desliga cada permissão. Nada é perguntado no chat: se a IA tentar algo desligado, ela não faz e avisa para você liberar ali.

| Conector | Permissões |
|---|---|
| Railway, Netlify, Vercel, Hugging Face | ver, **hospedar**, apagar |
| GitHub | ver, criar e alterar (inclui enviar uma pasta inteira) |
| Discord, Telegram, Slack | ver, enviar mensagens |
| Notion | ver, criar e alterar |
| **Servidor MCP** | qualquer servidor MCP remoto: as ferramentas dele viram ferramentas da IA (as marcadas como só leitura entram em "ver", o resto em "criar e alterar") |
| **API personalizada** | qualquer site com API: GET é "ver", POST/PUT/PATCH/DELETE é "criar e alterar" |

Só "ver" vem ligado de início. Hospedar, apagar, criar e enviar vêm desligados. Para hospedar um site, a IA monta a pasta e usa Netlify, Vercel ou Hugging Face (sobem a pasta direto) ou GitHub + Railway (Railway puxa do repositório).

O token fica criptografado (AES-256-GCM) no banco, nunca volta para o app nem aparece para o modelo. Cuidado: um texto que a IA lê de fora (issue, mensagem, página) pode tentar mandá-la fazer coisas. As permissões desligadas são a proteção.

Falta: conectores que só funcionam com login OAuth (Google Drive, Gmail, Agenda, Slack de usuário). Qualquer um que tenha servidor MCP já dá para ligar pelo conector "Servidor MCP".

## Segurança do terminal

`EXEC_MODE` controla o terminal:

- `off`: desligado (padrão).
- `docker`: cada comando roda em um contêiner descartável, sem internet, com limite de memória e processos. **Use este se mais de uma pessoa usar o servidor.**
- `local`: roda direto no servidor, sem isolamento. Só para uso pessoal, porque a IA consegue ler e apagar o que o usuário do servidor consegue.

## Login

- **E-mail com código:** crie uma chave em resend.com e coloque em `RESEND_API_KEY`. Sem ela, o código aparece no console do servidor.
- **Google:** crie um ID de cliente OAuth do tipo Web e coloque em `GOOGLE_CLIENT_ID`. Adicione o endereço do seu site em "Origens JavaScript autorizadas".

Depois do primeiro login, o app pede nome e data de nascimento. Menores de `MIN_AGE` (13) são recusados.

## APK

1. Mande esta pasta para um repositório no GitHub.
2. Na aba **Actions**, rode **Gerar APK do ORVEX**. O APK sai como arquivo do resultado (`orvex-apk`).
3. Abra o APK. Na primeira vez ele pede o **endereço do servidor**: `http://localhost:3000` se o servidor roda no Termux do mesmo celular, ou o endereço https de um servidor seu. Dá para trocar depois em Configurações > Servidor.
4. (Opcional) Em **Settings > Secrets and variables > Actions > Variables**, crie `ORVEX_SERVER_URL` para o APK já vir apontado.

O APK aceita http (sem https) para funcionar com o Termux.

## Configurar a IA pelo app

O primeiro a criar conta no servidor é o dono (ou o e-mail em `ADMIN_EMAIL`). Para o dono aparece **Configurações > Configurações da IA**: servidor e chave dos modelos, modelo de cada velocidade (conversa e código), modelo de visão, servidor de imagem e limite, modo do terminal, limites e rede. A lista de modelos instalados vem do servidor. Vale na hora e fica salvo em `data/settings.json`. O que está no `.env` é só o ponto de partida.

No APK, o botão Instalar abre o navegador do celular para baixar o arquivo.

## Ainda não está pronto

- **Login com Google dentro do APK:** o Google bloqueia o login dentro do WebView. No APK use o e-mail por enquanto. Falta o plugin nativo de Google.
- **Voz para texto no APK:** funciona no Chrome, mas o WebView do Android não tem. Falta um plugin de voz.
- **Conectores não testados nos sites de verdade:** não havia internet aqui. O motor, as permissões, o MCP e o envio do zip para o Netlify foram testados com servidores de mentira. As chamadas do Railway, Vercel, Hugging Face, Notion, Slack, Discord e Telegram seguem a documentação, mas nunca falaram com o site real. O Railway é o mais incerto.
- **Gerador de imagem:** o formato do pedido ao `sd-server` não foi conferido. Se não responder, teste `IMAGE_API=openai`.
- **Modelos reais:** nenhum modelo foi baixado aqui. O fluxo todo foi testado com um modelo de mentira.
- **Gerar APK pela IA:** depende de ter o Android SDK no terminal dela.
- **Planos pagos e bônus, bloqueio por pedido ilegal, aviso em massa se houver invasão:** só existe o limite diário (`DAILY_LIMIT`). O resto precisa ser projetado.

## Hospedar (servidor sempre ligado)

- `Dockerfile`: só o ORVEX (app + API). Serve em qualquer lugar com Docker (Railway, Render, Fly, um VPS). O modelo fica em outro lugar (`MODEL_BASE_URL`).
- `Dockerfile.ollama`: ORVEX + Ollama no mesmo contêiner, para Space do Hugging Face (tipo Docker). Os modelos vêm de `MODELS_TO_PULL`. Não foi testado.

O banco e as pastas ficam em `/data`. Em hospedagem grátis sem disco permanente, isso some quando o servidor reinicia (contas, chats e pastas). Com o servidor em https, o APK funciona sem Termux e o login com Google funciona com o endereço dele em "Origens JavaScript autorizadas".
