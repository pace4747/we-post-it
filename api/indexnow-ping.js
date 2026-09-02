const indexnow = require("../lib/indexnow");

function cronOk(req) {
  var headers = (req && req.headers) || {};
  var secret = String(process.env.CRON_SECRET || "").trim();
  var auth = String(headers.authorization || headers.Authorization || "");
  if (secret && auth === "Bearer " + secret) return true;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!cronOk(req)) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  try {
    var result = await indexnow.ping(indexnow.marketingUrls(), { host: "www.yoursite.site" });
    res.status(200).json({ ok: true, indexnow: result });
  } catch (e) {
    console.error("indexnow-ping", e);
    res.status(500).json({ ok: false, error: "Ping failed" });
  }
};
