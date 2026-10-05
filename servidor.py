from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import json

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlparse(self.path).path in ("/", "/main"):
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        print("POST", self.path, self.rfile.read(n).decode(errors="ignore"))
        body = json.dumps({"success": True, "ok": True}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

server = ThreadingHTTPServer(("127.0.0.1", 8080), Handler)
print("Abre:")
print("http://127.0.0.1:8080/main?id=5LSKIa63rGtVzQ6ahbt3")
server.serve_forever()
