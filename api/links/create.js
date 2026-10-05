export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  let body = {};
  try {
    if (typeof req.body === "string") {
      body = JSON.parse(req.body);
    } else if (req.body && typeof req.body === "object") {
      body = req.body;
    }
  } catch (e) {}
  
  const { botToken, chatId } = body;
  
  let botName = "Bot";
  try {
    const me = await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then(r => r.json());
    if (me.ok) botName = me.result.username || me.result.first_name || "Bot";
  } catch (e) {}
  
  const link = {
    id: Math.random().toString(36).slice(2, 20),
    botName,
    botToken: botToken || "",
    chatId: chatId || "",
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  };
  
  return res.status(200).json(link);
}
