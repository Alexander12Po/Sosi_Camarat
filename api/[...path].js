export default async function handler(req, res) {
  // Debug: loggear TODO
  console.log("=== REQUEST DEBUG ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Query:", JSON.stringify(req.query));
  console.log("Body type:", typeof req.body);
  console.log("Body:", req.body);
  
  let p = "";
  if (Array.isArray(req.query.path)) {
    p = req.query.path.join("/");
  } else if (typeof req.query.path === "string") {
    p = req.query.path;
  } else {
    const url = new URL(req.url, "http://localhost");
    p = url.pathname.replace(/^\/api\/?/, "");
  }
  
  console.log("Parsed path:", p);
  console.log("===================");

  if (p === "csrf") {
    return res.status(200).json({ csrfToken: "tok-" + Math.random().toString(36).slice(2) });
  }

  if (p === "auth/session") {
    return res.status(200).json({ uid: "user-1", name: "Admin" });
  }

  if (p === "auth/logout") {
    return res.status(200).json({ success: true });
  }

  if (p === "links/list") {
    return res.status(200).json([]);
  }

  if (p === "links/create") {
    console.log("CREATE endpoint hit!");
    let body = {};
    try {
      if (typeof req.body === "string") {
        body = JSON.parse(req.body);
      } else if (req.body && typeof req.body === "object") {
        body = req.body;
      }
    } catch (e) {
      console.log("Error parsing body:", e);
    }
    
    console.log("Parsed body:", JSON.stringify(body));
    
    const { botToken, chatId } = body;
    const link = {
      id: Math.random().toString(36).slice(2, 20),
      botName: "TestBot",
      botToken: botToken || "unknown",
      chatId: chatId || "unknown",
      status: "ACTIVE"
    };
    
    console.log("Returning link:", JSON.stringify(link));
    return res.status(200).json(link);
  }

  if (p === "send") {
    return res.status(200).json({ success: true });
  }

  console.log("404 - No match for path:", p);
  return res.status(404).json({ error: "Not found: " + p, method: req.method });
}
