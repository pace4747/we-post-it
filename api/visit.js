const fs = require("fs");
const path = require("path");

const visitCache = new Map();
const RATE_LIMIT_MS = 5000;

const visitLog = [];
const MAX_LOG_SIZE = 10000;

function shouldRateLimit(fingerprint) {
  const now = Date.now();
  const last = visitCache.get(fingerprint);
  
  if (last && (now - last) < RATE_LIMIT_MS) {
    return true;
  }
  
  visitCache.set(fingerprint, now);
  
  if (visitCache.size > 1000) {
    const entries = Array.from(visitCache.entries());
    entries.sort((a, b) => a[1] - b[1]);
    entries.slice(0, 500).forEach(([key]) => visitCache.delete(key));
  }
  
  return false;
}

function getLogPath() {
  const locations = [
    "/tmp/wepostit-visits.jsonl",
    path.join(process.cwd(), "visits.jsonl")
  ];
  
  for (const loc of locations) {
    try {
      const dir = path.dirname(loc);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(loc, "");
      return loc;
    } catch (e) {
    }
  }
  
  return null;
}

async function sendToWebhook(visitData) {
  const webhookUrl = process.env.VISITOR_WEBHOOK || process.env.VISIT_WEBHOOK;
  if (!webhookUrl) {
    return { sent: false, reason: "no_webhook" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(visitData),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.error("Webhook failed:", response.status);
      return { sent: false, reason: "webhook_error", status: response.status };
    }

    return { sent: true };
  } catch (e) {
    console.error("Webhook error:", e.message);
    return { sent: false, reason: "webhook_error", error: e.message };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-admin-key");
  
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    const adminKey = req.headers["x-admin-key"];
    const expectedKey = process.env.VISITOR_ADMIN_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
    const recentVisits = visitLog.slice(-limit).reverse();

    res.status(200).json({
      ok: true,
      count: recentVisits.length,
      total: visitLog.length,
      visits: recentVisits
    });
    return;
  }
  
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  try {
    var body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch (e) {
      body = {};
    }

    const city = String(req.headers["x-vercel-ip-city"] || "").trim();
    const region = String(req.headers["x-vercel-ip-country-region"] || "").trim();
    const country = String(req.headers["x-vercel-ip-country"] || "").trim();
    const postalCode = String(req.headers["x-vercel-ip-postal-code"] || "").trim();
    const timezone = String(req.headers["x-vercel-ip-timezone"] || "").trim();
    const userAgent = String(req.headers["user-agent"] || "").trim();
    const acceptLanguage = String(req.headers["accept-language"] || "").trim();
    const host = String(req.headers["host"] || "").trim();
    
    const visitData = {
      at: new Date().toISOString(),
      path: String(body.path || "").trim(),
      host: host,
      referrer: String(body.referrer || "").trim(),
      utm_source: String(body.utm_source || "").trim(),
      utm_medium: String(body.utm_medium || "").trim(),
      utm_campaign: String(body.utm_campaign || "").trim(),
      utm_content: String(body.utm_content || "").trim(),
      utm_term: String(body.utm_term || "").trim(),
      city: city,
      region: region,
      country: country,
      postalCode: postalCode,
      ipTimezone: timezone,
      userAgent: userAgent,
      acceptLanguage: acceptLanguage,
      lang: String(body.lang || "").trim(),
      clientTimezone: String(body.clientTimezone || "").trim(),
      screenWidth: parseInt(body.screenWidth) || 0,
      screenHeight: parseInt(body.screenHeight) || 0,
      viewportWidth: parseInt(body.viewportWidth) || 0,
      viewportHeight: parseInt(body.viewportHeight) || 0,
      sessionId: String(body.sessionId || "").trim(),
      isLanding: body.isLanding === true || body.isLanding === "true",
      buttonClicked: String(body.buttonClicked || "").trim()
    };

    const fingerprint = `${city}-${region}-${country}-${userAgent.slice(0, 50)}-${body.path}`;
    
    if (shouldRateLimit(fingerprint)) {
      res.status(200).json({ ok: true, logged: false, reason: "rate_limited" });
      return;
    }

    visitLog.push(visitData);
    if (visitLog.length > MAX_LOG_SIZE) {
      visitLog.splice(0, visitLog.length - MAX_LOG_SIZE);
    }

    const writeResults = { fileWrite: false, webhook: false };

    const logPath = getLogPath();
    if (logPath) {
      try {
        fs.appendFileSync(logPath, JSON.stringify(visitData) + "\n");
        writeResults.fileWrite = true;
      } catch (e) {
      }
    }

    const webhookResult = await sendToWebhook(visitData);
    writeResults.webhook = webhookResult.sent;

    res.status(200).json({
      ok: true,
      logged: true,
      stored: {
        memory: true,
        file: writeResults.fileWrite,
        webhook: writeResults.webhook
      }
    });
  } catch (e) {
    console.error("visit log error:", e);
    res.status(500).json({ ok: false, error: "Failed to log visit" });
  }
};
