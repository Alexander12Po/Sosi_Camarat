// vars manuales
const R_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";

export default async function handler(req, res) {
  // FAIL-LOUD: si no hay conexion, NO devuelvo [] silencioso, devuelvo error.
  if (!R_URL || !R_TOK) {
    return res.status(500).json({ error: "UPSTASH_NO_CONECTADO_EN_PRODUCTION" });
  }
  try {
    const r = await fetch(R_URL + "/get/links", {
      headers: { Authorization: "Bearer " + R_TOK },
    });
    if (!r.ok) {
      return res.status(500).json({ error: "UPSTASH_READ_FAIL_" + r.status });
    }
    const j = await r.json();
    const links = j.result ? JSON.parse(j.result) : [];
    return res.status(200).json(links);
  } catch (e) {
    return res.status(500).json({ error: "UPSTASH_EXCEPCION: " + String(e && e.message || e) });
  }
}
