const store = require("../lib/site-store");
const lifecycle = require("../lib/lifecycle-mail");
const indexnow = require("../lib/indexnow");

function cronOk(req) {
  var headers = (req && req.headers) || {};
  var secret = String(process.env.CRON_SECRET || "").trim();
  var auth = String(headers.authorization || headers.Authorization || "");
  if (secret && auth === "Bearer " + secret) return true;
  var ua = String(headers["user-agent"] || "");
  if (/vercel-cron/i.test(ua)) return true;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

async function mailClock(result) {
  var mailed = { lastChance: [], takenDown: [] };
  var rows = (result && result.rows) || [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || !row.slug || !row.lastChance) continue;
    try {
      var out = await lifecycle.sendLastChance(row.slug, { hostUntil: row.hostUntil });
      if (out && out.ok && out.emailed) mailed.lastChance.push(row.slug);
    } catch (e) {
      console.error("last-chance mail", row.slug, e && e.message || e);
    }
  }
  var seen = Object.create(null);
  var downs = [];
  function queueDown(slug) {
    slug = String(slug || "");
    if (!slug || seen[slug]) return;
    seen[slug] = true;
    downs.push(slug);
  }
  ((result && result.expired) || []).forEach(queueDown);
  rows.forEach(function (c) {
    if (c && c.takenDown) queueDown(c.slug);
  });
  for (var j = 0; j < downs.length; j++) {
    var slug = downs[j];
    try {
      var down = await lifecycle.sendTakenDown(slug, {});
      if (down && down.ok && down.emailed) mailed.takenDown.push(slug);
    } catch (e) {
      console.error("taken-down mail", slug, e && e.message || e);
    }
  }
  return mailed;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!cronOk(req)) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  try {
    var result = await store.expireDueAll();
    var mailed = await mailClock(result);
    var expired = result.expired || [];
    for (var i = 0; i < expired.length; i++) {
      indexnow.pingShopLater(expired[i]);
    }
    res.status(200).json({
      ok: true,
      checked: result.checked || 0,
      expired: (result.expired || []).length,
      slugs: result.expired || [],
      mailed: mailed
    });
  } catch (e) {
    console.error("host-expire", e);
    res.status(500).json({ ok: false, error: "Expire failed" });
  }
};
