const store = require("../lib/site-store");
const { makeSlug } = require("../lib/escape");
const { tokenFromRequest } = require("../lib/edit-auth");
const { shopDataToDocument, emptyDocument } = require("../lib/site-document");

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

async function loadOrCreateDraft(slug) {
  var draft = await store.getDraft(slug);
  if (draft && draft.business && draft.business.name) return draft;
  var stripeShop = await store.shopDataFromStripe(slug);
  if (stripeShop) return store.ensureDraftFromLegacy(slug, stripeShop);
  var published = await store.getPublished(slug);
  if (published) return published;
  return emptyDocument(slug);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  var slug = makeSlug(req.query.slug);
  var token = tokenFromRequest(req);

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
    if (req.method === "GET") {
      var draft = await loadOrCreateDraft(slug);
      var published = await store.getPublished(slug);
      res.status(200).json({
        ok: true,
        slug: slug,
        storage: store.storageKind(),
        blob: store.blobEnabled(),
        document: draft,
        hasPublished: !!(published && published.business && published.business.name),
        publishedAt: published && published.updatedAt || ""
      });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      var body = await collectJson(req);
      var incoming = body.document || body;
      var saved = await store.saveDraft(slug, incoming);
      res.status(200).json({
        ok: true,
        storage: store.storageKind(),
        document: saved
      });
      return;
    }

    res.setHeader("Allow", "GET, PUT, POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("site-document", e);
    var status = e.code === "DOC_TOO_LARGE" ? 413 : 500;
    res.status(status).json({ ok: false, error: e.message || "Could not save." });
  }
};
