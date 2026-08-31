const { generateShopPageHTML } = require("./shop-page-generator");
const store = require("../lib/site-store");
const { makeSlug } = require("../lib/escape");
const { tokenFromRequest } = require("../lib/edit-auth");
const { normalizeSiteDocument } = require("../lib/site-document");

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

function sendHtml(res, html) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.status(200).send(html);
}

module.exports = async function handler(req, res) {
  var slug = makeSlug(req.query && req.query.slug);
  var token = tokenFromRequest(req);
  var mode = String((req.query && req.query.mode) || "draft");

  try {
    var body = {};
    if (req.method === "POST") {
      body = await collectJson(req);
      if (!slug) slug = makeSlug(body.slug);
      if (!token) token = String(body.k || "").trim();
      if (body.mode) mode = String(body.mode);
    }

    if (!slug) {
      res.status(400).send("Missing shop slug");
      return;
    }

    var auth = await store.authorize(slug, token);
    if (!auth.ok) {
      res.status(401).send("Need a valid editor link.");
      return;
    }

    var doc = null;
    if (body.document) {
      doc = normalizeSiteDocument(body.document, slug);
    } else if (mode === "live" || mode === "published") {
      doc = await store.getPublished(slug);
    } else {
      doc = await store.getDraft(slug);
      if (!doc) doc = await store.getPublished(slug);
    }

    if (!doc) {
      res.status(404).send("No site document yet.");
      return;
    }

    sendHtml(res, generateShopPageHTML(doc, { editorPreview: mode !== "live" && mode !== "published" }));
  } catch (e) {
    console.error("site-preview", e);
    res.status(500).send("Error rendering preview");
  }
};
