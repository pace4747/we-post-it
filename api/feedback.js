var rateLimitStore = globalThis.feedbackRateLimits || (globalThis.feedbackRateLimits = {});

function getClientIP(req) {
  return req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
}

function isRateLimited(ip) {
  var now = Date.now();
  var key = "ip:" + ip;
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = [];
  }
  
  var recent = rateLimitStore[key].filter(function (t) {
    return now - t < 3600000;
  });
  
  rateLimitStore[key] = recent;
  
  if (recent.length >= 5) {
    return true;
  }
  
  rateLimitStore[key].push(now);
  return false;
}

async function postWebhook(url, data) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    var body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch (e) {
      body = {};
    }

    var kind = String(body.kind || "").trim();
    var message = String(body.message || "").trim();
    var shop = String(body.shop || "").trim();
    var phone = String(body.phone || "").trim();
    var lang = String(body.lang || "en").trim();

    if (!kind || !["improve", "bug", "automate"].includes(kind)) {
      res.status(400).json({ ok: false, error: "Invalid kind." });
      return;
    }

    if (!message || message.length === 0) {
      res.status(400).json({ ok: false, error: "Message required." });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ ok: false, error: "Message too long." });
      return;
    }

    var ip = getClientIP(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ ok: false, error: "Too many requests." });
      return;
    }

    var webhook = process.env.FEEDBACK_WEBHOOK;
    if (webhook) {
      var payload = {
        kind: kind,
        message: message,
        shop: shop || null,
        phone: phone || null,
        lang: lang,
        ip: ip,
        when: new Date().toISOString()
      };
      postWebhook(webhook, payload).catch(function () {});
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ ok: false });
};
