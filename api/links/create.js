const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const H = () => ({ Authorization: "Bearer " + R_TOK, "Upstash-Read-Behavior": "consistent" });

async function readLinks() {
  const r = await fetch(R_URL + "/get/links", { headers: H() });
  if (!r.ok) throw new Error("read " + r.status);
  const j = await r.json();
  return j.result ? JSON.parse(j.result) : [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!R_URL || !R_TOK) return res.status(500).json({ error: "BD_NO_CONECTADA" });

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) {}
  const { botToken, chatId } = body;
  if (!botToken || !chatId) return res.status(400).json({ error: "Faltan botToken o chatId" });

  let botName = "Bot";
  try {
    const me = await fetch("https://api.telegram.org/bot" + botToken + "/getMe").then(r => r.json());
    if (me.ok) botName = me.result.username || me.result.first_name || "Bot";
  } catch (e) {}

  const id = Math.random().toString(36).slice(2, 20);
  const link = { id, botName, botToken, chatId, status: "ACTIVE", createdAt: new Date().toISOString() };

  try {
    const links = await readLinks();
    links.push(link);
    const w = await fetch(R_URL + "/set/links/" + encodeURIComponent(JSON.stringify(links)), { headers: H() });
    const wj = await w.json().catch(() => ({}));
    if (!w.ok || wj.result !== "OK") throw new Error("write " + w.status + " " + JSON.stringify(wj).slice(0, 120));
  } catch (e) {
    return res.status(500).json({ error: "NO_SE_GUARDO: " + String(e && e.message || e) });
  }
  return res.status(200).json(link); // 200 = write devolvio OK de verdad
}
