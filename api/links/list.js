// Vercel KV (= Upstash) usa KV_REST_API_* ; dejo fallback por si acaso
const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export default async function handler(req, res) {
  if (!R_URL || !R_TOK) {
    return res.status(500).json({ error: "BD_NO_CONECTADA", keys: Object.keys(process.env).filter(k => /KV_|UPSTASH|REDIS/i.test(k)) });
  }
  try {
    // lectura FUERTE: garantiza que vea lo que create acaba de escribir
    const r = await fetch(R_URL + "/get/links", {
      headers: { Authorization: "Bearer " + R_TOK, "Upstash-Read-Behavior": "consistent" },
    });
    if (!r.ok) return res.status(500).json({ error: "READ_FAIL_" + r.status });
    const j = await r.json();
    const links = j.result ? JSON.parse(j.result) : [];
    return res.status(200).json(links);
  } catch (e) {
    return res.status(500).json({ error: "EXCEPCION: " + String(e && e.message || e) });
  }
}
