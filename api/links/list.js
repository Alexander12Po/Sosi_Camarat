const R_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";

export default async function handler(req, res) {
  console.log("LIST debug -> URL?", R_URL ? "SI(len=" + R_URL.length + ")" : "NO", "| TOK?", R_TOK ? "SI" : "NO");
  if (!R_URL || !R_TOK) {
    console.log("LIST: Upstash NO conectado en este environment -> devuelvo []");
    return res.status(200).json([]);
  }
  try {
    const r = await fetch(R_URL + "/get/links", { headers: { Authorization: "Bearer " + R_TOK } });
    const j = await r.json();
    const links = j.result ? JSON.parse(j.result) : [];
    console.log("LIST: devuelvo", links.length, "bots");
    return res.status(200).json(links);
  } catch (e) {
    console.log("LIST error:", String(e));
    return res.status(200).json([]);
  }
}
