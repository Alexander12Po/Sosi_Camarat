export default async function handler(req, res) {
  // 1) listar TODAS las env vars que huelan a base de datos, con nombre real
  const keys = Object.keys(process.env)
    .filter(k => /UPSTASH|KV_|REDIS|REST|DATABASE|DB_/i.test(k))
    .sort();
  const dump = {};
  for (const k of keys) {
    const v = String(process.env[k] || "");
    dump[k] = v.length > 24 ? v.slice(0, 10) + "…(len " + v.length + ")" : (v || "(vacía)");
  }

  // 2) probar varios nombres candidatos de URL y TOKEN
  const urlCands = ["UPSTASH_REDIS_REST_URL","UPSTASH_REST_URL","KV_REST_API_URL","UPSTASH_URL","REDIS_URL"];
  const tokCands = ["UPSTASH_REDIS_REST_TOKEN","UPSTASH_REST_TOKEN","KV_REST_API_TOKEN","UPSTASH_TOKEN","REDIS_PASSWORD"];
  const foundUrl = urlCands.find(k => process.env[k]) || null;
  const foundTok = tokCands.find(k => process.env[k]) || null;

  // 3) si encontramos un par, hacer un ping REAL a Upstash (write+read de una clave de prueba)
  let ping = null;
  if (foundUrl && foundTok) {
    try {
      const U = process.env[foundUrl], T = process.env[foundTok];
      const w = await fetch(U + "/set/__diag/hola", { headers: { Authorization: "Bearer " + T } });
      const r = await fetch(U + "/get/__diag", { headers: { Authorization: "Bearer " + T } });
      const rt = await r.text();
      ping = { writeStatus: w.status, readStatus: r.status, readBody: rt.slice(0, 120), ok: r.ok && /hola/.test(rt) };
    } catch (e) {
      ping = { error: String(e && e.message || e) };
    }
  }

  return res.status(200).json({
    envKeysFound: keys,        // <- los nombres REALES que Vercel inyectó
    dump,                      // <- valores mascarados (para ver si están vacíos o no)
    foundUrlKey: foundUrl,     // <- con cuál de mis candidatos coincidió
    foundTokKey: foundTok,
    ping                       // <- la BD responde de verdad, sí/no
  });
}
