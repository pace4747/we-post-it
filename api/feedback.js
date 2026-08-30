const fs = require("fs");
const path = require("path");

// Simple rate limiting per session
const sessions = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000; // 1 minute

function rateLimit(ip) {
  const now = Date.now();
  const key = ip || "unknown";
  
  if (!sessions.has(key)) {
    sessions.set(key, { count: 1, first: now });
    return true;
  }
  
  const data = sessions.get(key);
  if (now - data.first > RATE_WINDOW) {
    sessions.set(key, { count: 1, first: now });
    return true;
  }
  
  if (data.count >= RATE_LIMIT) {
    return false;
  }
  
  data.count++;
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  
  if (!rateLimit(ip)) {
    res.status(429).json({ ok: false, error: "Too many requests. Try again later." });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (e) {
    body = {};
  }

  const type = String(body.type || "").trim();
  const message = String(body.message || "").trim();
  const shop = String(body.shop || "").trim();
  const phone = String(body.phone || "").trim();
  const lang = String(body.lang || "en").trim();

  if (!type || !message) {
    res.status(400).json({ ok: false, error: "Need type and message." });
    return;
  }

  const feedback = {
    type: type,
    message: message,
    shop: shop,
    phone: phone,
    lang: lang,
    at: new Date().toISOString(),
    ip: ip
  };

  // Save to file
  const line = JSON.stringify(feedback) + "\n";
  try {
    fs.appendFileSync("/tmp/wepostit-feedback.jsonl", line);
  } catch (e) {
    console.error("feedback file", e);
  }
  
  try {
    fs.appendFileSync(path.join(process.cwd(), "feedback.jsonl"), line);
  } catch (e) {}

  // Post to webhook if configured
  if (process.env.FEEDBACK_WEBHOOK) {
    try {
      const fetch = require("node-fetch");
      await fetch(process.env.FEEDBACK_WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(feedback)
      });
    } catch (e) {
      console.error("feedback webhook", e);
    }
  }

  console.log("feedback", JSON.stringify(feedback));
  res.status(200).json({ ok: true });
};
