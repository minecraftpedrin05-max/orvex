# Proxy com senha na frente do Ollama: só aceita quem manda "Authorization: Bearer <chave>".
import http.server, socketserver, urllib.request, urllib.error, sys, hmac

KEY, PORT, UP = sys.argv[1], int(sys.argv[2]), sys.argv[3].rstrip('/')

class H(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def _deny(self):
        b = b'{"error":"nao autorizado"}'
        self.send_response(401); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def _go(self):
        got = (self.headers.get('Authorization') or '').replace('Bearer ', '', 1)
        if not hmac.compare_digest(got.encode(), KEY.encode()): return self._deny()
        n = int(self.headers.get('Content-Length') or 0); body = self.rfile.read(n) if n else None
        req = urllib.request.Request(UP + self.path, data=body, method=self.command, headers={'Content-Type': self.headers.get('Content-Type', 'application/json')})
        try: r = urllib.request.urlopen(req, timeout=600)
        except urllib.error.HTTPError as e: r = e
        except Exception:
            b = b'{"error":"modelo indisponivel"}'; self.send_response(502); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        self.send_response(r.status); self.send_header('Content-Type', r.headers.get('Content-Type', 'application/json')); self.send_header('Cache-Control', 'no-store'); self.send_header('Transfer-Encoding', 'chunked'); self.end_headers()
        try:
            while True:
                c = r.read1(4096) if hasattr(r, 'read1') else r.read(4096)
                if not c: break
                self.wfile.write(b'%x\r\n' % len(c) + c + b'\r\n'); self.wfile.flush()
            self.wfile.write(b'0\r\n\r\n')
        except Exception: pass
    do_GET = do_POST = do_DELETE = do_HEAD = _go

class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
S(('127.0.0.1', PORT), H).serve_forever()
