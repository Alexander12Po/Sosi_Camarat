from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
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
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body_raw = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        
        print("\n" + "="*50)
        print(f"📩 PETICIÓN POST RECIBIDA")
        print(f"📍 Ruta: {self.path}")
        print(f"📦 Datos: {body_raw}")
        print("="*50 + "\n")

        try:
            data = json.loads(body_raw)
        except:
            data = {}

        # Guardamos en el archivo local por si acaso
        if "bot_token" in data or "chat_id" in data:
            bots = load_bots()
            new_bot = {
                "id": len(bots) + 1,
                "bot_name": data.get("bot_name", "Bot Nuevo"),
                "chat_id": data.get("chat_id", ""),
                "bot_token": data.get("bot_token", ""),
                "status": "ACTIVE"
            }
            # Evitamos duplicados simples
            bots = [b for b in bots if b.get("bot_token") != new_bot["bot_token"]]
            bots.append(new_bot)
            save_bots(bots)
            print(f"✅ Guardado en bots.json. Total bots: {len(bots)}")

        # Devolvemos una respuesta que CUALQUIER frontend puede entender
        response_data = {
            "success": True,
            "ok": True,
            "message": "Guardado correctamente",
            "data": data,
            "bot": new_bot if "bot_token" in data else None
        }

        body = json.dumps(response_data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
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
        pass # Silenciamos el log por defecto para ver solo nuestros prints

if __name__ == "__main__":
    print("🚀 Servidor listo en: http://127.0.0.1:8080")
    server = ThreadingHTTPServer(("127.0.0.1", 8080), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹️ Servidor detenido")
        server.shutdown()
