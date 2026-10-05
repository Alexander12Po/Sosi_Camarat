const R_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";

export default async function handler(req, res) {
  if (!R_URL) return res.status(200).json([]);
  
  const r = await fetch(R_URL + "/get/links", { headers: { Authorization: "Bearer " + R_TOK } });
  const j = await r.json();
  const links = j.result ? JSON.parse(j.result) : [];
  
  return res.status(200).json(links);
}
