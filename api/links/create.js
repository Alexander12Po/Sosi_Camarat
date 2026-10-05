const R_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";

async function getLinks() {
  if (!R_URL || !R_TOK) return [];
  const r = await fetch(R_URL + "/get/links", {
    headers: { Authorization: "Bearer " + R_TOK },
  });
  const j = await r.json();
  return j.result ? JSON.parse(j.result) : [];
}

async function setLinks(links) {
  if (!R_URL || !R_TOK) return;
  await fetch(
    R_URL + "/set/links/" + encodeURIComponent(JSON.stringify(links)),
    { headers: { Authorization: "Bearer " + R_TOK } }
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {}

  const { botToken, chatId } = body;
  if (!botToken || !chatId)
    return res.status(400).json({ error: "Faltan botToken o chatId" });

  let botName = "Bot";
  try {
    const me = await fetch(
      "https://api.telegram.org/bot" + botToken + "/getMe"
    ).then((r) => r.json());
    if (me.ok) botName = me.result.username || me.result.first_name || "Bot";
  } catch (e) {}

  const links = await getLinks();
  const link = {
    id: Math.random().toString(36).slice(2, 20),
    botName,
    botToken,
    chatId,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };
  links.push(link);
  await setLinks(links);

  return res.status(200).json(link);
}
