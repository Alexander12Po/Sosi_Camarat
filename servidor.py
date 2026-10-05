from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json
import os

DATA_FILE = "bots.json"

def load_bots():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return []
    return []

def save_bots(bots):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(bots, f, indent=2)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path in ("/", "/main"):
            self.path = "/index.html"
        elif parsed.path == "/api/bots":
            bots = load_bots()
            body = json.dumps(bots).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body_raw = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        
        print(f"📩 POST {self.path}: {body_raw[:100]}...")

        if parsed.path == "/api/send":
            try:
                data = json.loads(body_raw)
                bots = load_bots()
                
                new_bot = {
                    "id": len(bots) + 1,
                    "bot_name": data.get("bot_name", f"Bot_{len(bots)+1}"),
                    "chat_id": data.get("chat_id", ""),
                    "bot_token": data.get("bot_token", ""),
                    "status": "ACTIVE"
                }
                bots.append(new_bot)
                save_bots(bots)
                
                print(f"✅ Bot guardado: {new_bot['bot_name']}")
                
                response_data = {"success": True, "bot": new_bot, "bots": bots}
            except Exception as e:
                print(f"❌ Error: {e}")
                response_data = {"success": False, "error": str(e)}

            body = json.dumps(response_data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return

        elif parsed.path == "/api/csrf":
            body = json.dumps({"csrf": "ok"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        body = json.dumps({"success": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

if __name__ == "__main__":
    print(" Servidor corriendo en: http://127.0.0.1:8080")
    print("📱 Abre: http://127.0.0.1:8080/main")
    server = ThreadingHTTPServer(("127.0.0.1", 8080), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n Servidor detenido")
        server.shutdown()
