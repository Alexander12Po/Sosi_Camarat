from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import json

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/main"):
            self.path = "/index.html"
            return super().do_GET()
        if path == "/api/csrf":
            body = json.dumps({"csrfToken": "fake-csrf-token-123"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

server = ThreadingHTTPServer(("127.0.0.1", 8080), Handler)
print("Abre:")
print("http://127.0.0.1:8080/main?id=5LSKIa63rGtVzQ6ahbt3")
server.serve_forever()
