const fs = require("fs");
const path = require("path");

// Rate limiting: simple in-memory cache (resets on cold start, good enough for hobby)
const visitCache = new Map();
const RATE_LIMIT_MS = 5000; // 5 seconds between visits from same fingerprint

function shouldRateLimit(fingerprint) {
  const now = Date.now();
  const last = visitCache.get(fingerprint);
  
  if (last && (now - last) < RATE_LIMIT_MS) {
    return true;
  }
  
  visitCache.set(fingerprint, now);
  
  // Clean up old entries (keep last 1000)
  if (visitCache.size > 1000) {
    const entries = Array.from(visitCache.entries());
    entries.sort((a, b) => a[1] - b[1]);
    entries.slice(0, 500).forEach(([key]) => visitCache.delete(key));
  }
  
  return false;
}

function getLogPath() {
  // Try multiple locations, fallback gracefully
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
      // Test write access
      fs.appendFileSync(loc, "");
      return loc;
    } catch (e) {
      // Try next location
    }
  }
  
  return null; // No writable location found
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

  try {
    var body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch (e) {
      body = {};
    }

    // Extract Vercel geo headers (NO full IP stored)
    var city = String(req.headers["x-vercel-ip-city"] || "").trim();
    var region = String(req.headers["x-vercel-ip-country-region"] || "").trim();
    var country = String(req.headers["x-vercel-ip-country"] || "").trim();
    var postalCode = String(req.headers["x-vercel-ip-postal-code"] || "").trim();
    
    // Extract user agent
    var userAgent = String(req.headers["user-agent"] || "").trim();
    
    // Client-provided data
    var visitData = {
      at: new Date().toISOString(),
      path: String(body.path || "").trim(),
      referrer: String(body.referrer || "").trim(),
      utm_source: String(body.utm_source || "").trim(),
      utm_medium: String(body.utm_medium || "").trim(),
      utm_campaign: String(body.utm_campaign || "").trim(),
      lang: String(body.lang || "").trim(),
      timezone: String(body.timezone || "").trim(),
      viewportWidth: parseInt(body.viewportWidth) || 0,
      city: city,
      region: region,
      country: country,
      postalCode: postalCode,
      userAgent: userAgent
    };

    // Simple fingerprint for rate limiting (not for tracking, just anti-flood)
    var fingerprint = `${country}-${region}-${city}-${userAgent.slice(0, 50)}-${body.path}`;
    
    if (shouldRateLimit(fingerprint)) {
      // Still return success, just don't log
      res.status(200).json({ ok: true, logged: false, reason: "rate_limited" });
      return;
    }

    // Try to log (gracefully fail if not possible on Vercel Hobby)
    var logPath = getLogPath();
    if (logPath) {
      try {
        fs.appendFileSync(logPath, JSON.stringify(visitData) + "\n");
        res.status(200).json({ ok: true, logged: true });
      } catch (e) {
        // Logging failed, but that's OK - return geo data worked
        res.status(200).json({ ok: true, logged: false, reason: "write_failed" });
      }
    } else {
      // No writable location (expected on Vercel Hobby ephemeral filesystem)
      // Still successful - geo endpoint works even if logging doesn't persist
      res.status(200).json({ ok: true, logged: false, reason: "no_persistent_storage" });
    }
  } catch (e) {
    console.error("visit log error:", e);
    res.status(500).json({ ok: false, error: "Failed to log visit" });
  }
};
