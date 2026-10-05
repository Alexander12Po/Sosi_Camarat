from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import json


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/main"):
            self.path = "/index.html"
            return super().do_GET()
        if path == "/api/csrf":
            return self.send_json({"csrfToken": "fake-csrf-token-123"})
        if path.startswith("/api/"):
            return self.send_json({"success": True, "ok": True})
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        print("POST", path, raw.decode(errors="ignore"))
        self.send_json({"success": True, "ok": True})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


server = ThreadingHTTPServer(("127.0.0.1", 8080), Handler)
print("Abre:")
print("http://127.0.0.1:8080/main?id=5LSKIa63rGtVzQ6ahbt3")
server.serve_forever()
