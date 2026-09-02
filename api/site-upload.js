const store = require("../lib/site-store");
const { makeSlug, safeImageUrl } = require("../lib/escape");
const { tokenFromRequest } = require("../lib/edit-auth");
const { sectionByType, MAX_PHOTOS } = require("../lib/site-document");

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
  var body = await collectJson(req);
  if (!slug) slug = makeSlug(body.slug);
  if (!token) token = String(body.k || "").trim();

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
    var url = safeImageUrl(body.url || body.src || "");
    if (!url) {
      res.status(400).json({
        ok: false,
        error: store.blobEnabled()
          ? "Paste a photo URL (https://…)."
          : "Paste a photo URL. File upload needs BLOB_READ_WRITE_TOKEN on Vercel."
      });
      return;
    }

    var draft = await store.getDraft(slug);
    if (!draft) {
      res.status(404).json({ ok: false, error: "No draft to update." });
      return;
    }
    var photos = sectionByType(draft, "photos");
    if (!photos) {
      res.status(400).json({ ok: false, error: "This template has no photos section." });
      return;
    }
    photos.settings = photos.settings || {};
    photos.settings.images = photos.settings.images || [];
    if (photos.settings.images.indexOf(url) === -1) {
      if (photos.settings.images.length >= MAX_PHOTOS) {
        res.status(400).json({ ok: false, error: "At most " + MAX_PHOTOS + " photos." });
        return;
      }
      photos.settings.images.push(url);
    }
    photos.enabled = true;
    var saved = await store.saveDraft(slug, draft);
    res.status(200).json({ ok: true, url: url, document: saved, blob: store.blobEnabled() });
  } catch (e) {
    console.error("site-upload", e);
    res.status(500).json({ ok: false, error: e.message || "Could not add photo." });
  }
};
