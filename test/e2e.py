# Teste no navegador de verdade (Chromium via Playwright): login, chat, pasta, projetos, códigos, claro/escuro.
import re, sys, os, threading, http.server, json
from playwright.sync_api import sync_playwright, expect
BASE = 'http://127.0.0.1:3111'; OUT = '/tmp/orvex-shots'; os.makedirs(OUT, exist_ok=True)
errors = []
class Fake(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.send_header('content-type','application/json'); self.end_headers(); self.wfile.write(b'{"ok":true}')
    def log_message(self,*a): pass
fake = http.server.ThreadingHTTPServer(('127.0.0.1', 3222), Fake); threading.Thread(target=fake.serve_forever, daemon=True).start()
def ok(n): print('  ok ', n)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, color_scheme='dark', locale='pt-BR', device_scale_factor=2)
    ctx.grant_permissions([])
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.goto(BASE); pg.wait_for_selector('#b-email')
    assert 'Entre no ORVEX' in pg.inner_text('#st-home h1'); ok('idioma pt-BR automático')
    pg.screenshot(path=OUT + '/1-login-dark.png')
    pg.click('#b-email'); pg.fill('#m-mail', 'ana@exemplo.com'); pg.click('#m-next')
    pg.wait_for_selector('#toast.on'); code = re.search(r'DEV: (\d{6})', pg.inner_text('#toast')).group(1)
    for i, d in enumerate(code): pg.locator('#codes input').nth(i).fill(d)
    pg.screenshot(path=OUT + '/2-code-dark.png')
    pg.click('#c-next'); pg.wait_for_selector('#st-profile.on'); ok('login por código')
    pg.fill('#p-name', 'Ana Souza'); pg.fill('#p-birth', '2000-05-10'); pg.click('#p-next')
    pg.wait_for_selector('#s-chat.on'); assert 'Olá, Ana' in pg.inner_text('#hello'); ok('nome e nascimento -> chat')
    pg.screenshot(path=OUT + '/3-chat-empty-dark.png')

    # velocidade
    pg.click('#b-speed'); pg.screenshot(path=OUT + '/4-speed-dark.png'); pg.click('[data-speed=slow]')
    pg.mouse.click(300, 300)
    assert pg.inner_text('#speed-lbl') == 'Devagar'; ok('seletor de velocidade')

    # pasta
    pg.fill('#inp', 'crie uma pasta com um site'); pg.click('#b-send')
    pg.wait_for_selector('.folder', timeout=15000); pg.wait_for_selector('.status', state='detached', timeout=15000)
    assert 'meu-site' in pg.inner_text('.folder'); ok('cartão de pasta com botão instalar')
    pg.click('.folder .fhead .icon'); pg.wait_for_selector('.trow'); assert 'index.html' in pg.inner_text('.ftree'); ok('seta mostra os arquivos')
    pg.screenshot(path=OUT + '/5-folder-dark.png')
    pg.locator('.trow button').first.click(); pg.wait_for_selector('#viewer.on pre'); assert 'ORVEX' in pg.inner_text('#v-body') or 'console' in pg.inner_text('#v-body'); ok('olho abre o conteúdo do arquivo')
    pg.screenshot(path=OUT + '/6-viewer-dark.png'); pg.click('#v-close')
    with pg.expect_download() as dl:
        pg.click('.folder .install')
    assert dl.value.suggested_filename.endswith('.zip'); ok('botão instalar baixa o .zip')

    # modo rápido + bloco de código (em um chat novo)
    pg.click('#b-menu'); pg.click('#d-new'); pg.wait_for_selector('#empty:not([hidden])')
    pg.click('#b-speed'); pg.click('[data-speed=fast]'); pg.mouse.click(300, 300)
    pg.fill('#inp', 'oi, me mostra um codigo'); pg.click('#b-send')
    pg.wait_for_selector('.codebox'); pg.wait_for_selector('.status', state='detached')
    assert pg.locator('.codebar svg').count() >= 3 and 'Copiar' not in pg.inner_text('.codebar'); ok('copiar/compartilhar são só ícones')
    # salvar código
    pg.locator('.codebar button').nth(2).click(); pg.fill('.codebar input', 'meu-ola'); pg.click('.codebar button'); pg.wait_for_selector('.codebar .lang:has-text("meu-ola")'); ok('salvar código com nome')
    pg.screenshot(path=OUT + '/7-code-dark.png')

    # gaveta e histórico
    pg.click('#b-menu'); pg.wait_for_selector('#drawer.on #d-chats button'); n = pg.locator('#d-chats button').count(); assert n >= 2, n; ok('gaveta lista os chats antigos (%d)' % n)
    pg.screenshot(path=OUT + '/8-drawer-dark.png')
    pg.locator('#d-chats button').last.click(); pg.wait_for_selector('.folder'); ok('abrir chat antigo mostra a pasta')

    # projetos
    pg.click('#b-menu'); pg.click('#d-proj'); pg.click('#pj-add'); pg.fill('#pj-name', 'Minha Loja'); pg.select_option('#pj-type', 'site'); pg.click('#pj-create')
    pg.wait_for_selector('#pj-list .item'); pg.screenshot(path=OUT + '/9-projects-dark.png')
    pg.click('#pj-list .item'); pg.click('#pd-new'); pg.wait_for_selector('#s-chat.on'); assert pg.inner_text('#ctitle') == 'Minha Loja'; ok('projeto: chat dentro do projeto')
    pg.fill('#inp', 'oi'); pg.click('#b-send'); pg.wait_for_selector('.amsg .bub'); pg.wait_for_selector('.status', state='detached')
    pg.click('#b-menu'); pg.wait_for_selector('#drawer.on #d-chats'); assert pg.locator('#d-chats button').count() == n; ok('chat do projeto fica fora da lista normal'); pg.click('#scrim', position={'x':370,'y':400})

    # códigos
    pg.click('#b-menu'); pg.click('#d-code'); pg.wait_for_selector('#cd-list .item'); assert 'meu-ola' in pg.inner_text('#cd-list'); pg.fill('#cd-search', 'zzz'); assert 'Nenhum código' in pg.inner_text('#cd-list'); pg.fill('#cd-search', 'ola'); ok('tela de códigos com busca')
    pg.screenshot(path=OUT + '/10-codes-dark.png')


    # conectores
    pg.locator('.screen.on [data-back]').first.click(); pg.wait_for_selector('#s-chat.on')
    pg.click('#b-menu'); pg.click('#d-conn'); pg.wait_for_selector('#s-connectors.on .item')
    names = pg.inner_text('#cn-list')
    for n in ['GitHub','Railway','Netlify','Vercel','Hugging Face','Discord','Telegram','Slack','Notion','Servidor MCP','API personalizada','Hospedagem','Mensagens']: assert n.lower() in names.lower(), n
    ok('tela Conectores lista todos os lugares')
    pg.screenshot(path=OUT + '/13-connectors-dark.png', full_page=False)
    pg.locator('#cn-list .item', has_text='Railway').click(); pg.wait_for_selector('#cf-token'); pg.fill('#cf-token', 'token-falso'); pg.click('#cn-body .btn.solid')
    pg.wait_for_selector('#cn-body .err:not(:empty)', timeout=20000); assert 'Não consegui conectar' in pg.inner_text('#cn-body .err'); assert 'token-falso' not in pg.inner_text('#cn-body'); ok('conectar com token ruim mostra o erro sem vazar o token')
    pg.screenshot(path=OUT + '/14-connector-form-dark.png')
    pg.click('[data-back=s-connectors]'); pg.locator('#cn-list .item', has_text='API personalizada').click()
    pg.fill('#cf-url', 'http://127.0.0.1:3222'); pg.fill('#cf-token', 'abc12345'); pg.click('#cn-body .btn.solid')
    pg.wait_for_selector('#cn-body .sw'); assert pg.locator('#cn-body .sw').count() == 2; assert pg.locator('#cn-body .sw').nth(0).get_attribute('aria-checked') == 'true' and pg.locator('#cn-body .sw').nth(1).get_attribute('aria-checked') == 'false'; ok('conectado: leitura ligada e escrita desligada por padrão')
    pg.locator('#cn-body .sw').nth(1).click(); pg.wait_for_timeout(400); pg.screenshot(path=OUT + '/15-connector-perms-dark.png')
    pg.reload(); pg.wait_for_selector('#s-chat.on'); pg.click('#b-menu'); pg.click('#d-set'); pg.click('#st-conn'); pg.wait_for_selector('#cn-list .item')
    pg.locator('#cn-list .item', has_text='API personalizada').click(); pg.wait_for_selector('#cn-body .sw'); assert pg.locator('#cn-body .sw').nth(1).get_attribute('aria-checked') == 'true'; ok('permissão fica salva e a tela de conectores abre também pelas configurações')
    pg.click('#cn-body .btn:not(.solid)'); pg.wait_for_selector('#s-connectors.on'); assert 'Não conectado' in pg.locator('#cn-list .item', has_text='API personalizada').inner_text(); ok('desconectar')
    pg.locator('.screen.on [data-back]').first.click()

    # configurações da IA (dono)
    pg.click('#b-menu'); pg.click('#d-set'); pg.wait_for_selector('#st-ai:visible'); pg.click('#st-ai'); pg.wait_for_selector('#ai-m_mid')
    pg.fill('#ai-m_mid', 'qwen2.5:14b'); pg.locator('#ai-exec').select_option('local'); pg.wait_for_selector('#ai-warn:visible')
    pg.click('#ai-body .btn.solid'); pg.wait_for_selector('#toast.on'); pg.screenshot(path=OUT + '/16-ai-settings-dark.png')
    pg.reload(); pg.wait_for_selector('#s-chat.on'); pg.click('#b-menu'); pg.click('#d-set'); pg.click('#st-ai'); pg.wait_for_selector('#ai-m_mid'); assert pg.input_value('#ai-m_mid') == 'qwen2.5:14b'; ok('configurações da IA: salvar e continuar salvo')
    pg.click('#ai-body .btn:not(.solid)'); pg.wait_for_timeout(500); pg.locator('.screen.on [data-back]').first.click(); pg.click('#st-out') if False else None
    pg.click('#b-menu') if pg.locator('#b-menu:visible').count() else None

    # recarregar: continua logado
    pg.reload(); pg.wait_for_selector('#s-chat.on'); ok('continua logado depois de recarregar')

    # claro
    ctx2 = b.new_context(viewport={'width': 390, 'height': 844}, color_scheme='light', locale='en-US', device_scale_factor=2)
    p2 = ctx2.new_page(); p2.goto(BASE); p2.wait_for_selector('#b-email'); assert 'Sign in to ORVEX' in p2.inner_text('#st-home h1'); ok('idioma en automático')
    p2.screenshot(path=OUT + '/11-login-light-en.png')
    expect(p2.locator('body')).to_have_css('background-color', 'rgb(255, 255, 255)'); ok('modo claro = branco')
    ctx3 = b.new_context(viewport={'width': 390, 'height': 844}, locale='es-MX'); p3 = ctx3.new_page(); p3.goto(BASE); p3.wait_for_selector('#b-email'); assert 'Entra a ORVEX' in p3.inner_text('#st-home h1'); ok('idioma es automático')
    # sem Wi-Fi
    pg.context.set_offline(True); pg.wait_for_timeout(300); assert pg.locator('#net.on').count() == 1; ok('aviso de sem Wi-Fi')
    pg.fill('#inp', 'mensagem offline'); pg.click('#b-send'); pg.wait_for_selector('#st-wait'); pg.screenshot(path=OUT + '/12-offline-dark.png')
    pg.context.set_offline(False); pg.wait_for_selector('#st-wait', state='detached', timeout=15000); pg.wait_for_selector('.amsg .bub', timeout=15000); ok('responde quando o Wi-Fi volta')
    b.close()
print('ERROS NO NAVEGADOR:' if errors else 'sem erros no console', *errors, sep='\n' if errors else ' ')
sys.exit(1 if errors else 0)
