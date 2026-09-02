const store = require("../lib/site-store");
const { makeSlug } = require("../lib/escape");
const { tokenFromRequest } = require("../lib/edit-auth");

function collectJson(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    if (typeof req.body === "string") {
      try { resolve(JSON.parse(req.body || "{}")); } catch (e) { resolve({}); }
      return;
    }
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { resolve({}); }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  var slug = makeSlug(req.query.slug);
  var token = tokenFromRequest(req);
  if (!slug) {
    var body = await collectJson(req);
    slug = makeSlug(body.slug);
    if (!token) token = String(body.k || "").trim();
  }

  if (!slug) {
    res.status(400).json({ ok: false, error: "Missing shop slug" });
    return;
  }

  var auth = await store.authorize(slug, token);
  if (!auth.ok) {
    res.status(401).json({ ok: false, error: "Need a valid editor link." });
    return;
  }

  try {
    var published = await store.publish(slug);
    res.status(200).json({
      ok: true,
      storage: store.storageKind(),
      document: published,
      url: "/s/" + slug
    });
  } catch (e) {
    console.error("site-publish", e);
    var status = e.code === "NO_DRAFT" ? 400 : 500;
    res.status(status).json({ ok: false, error: e.message || "Could not publish." });
  }
};
