const { generateShopPageHTML } = require("./shop-page-generator");
const store = require("../lib/site-store");
const { shopDataToDocument } = require("../lib/site-document");
const { makeSlug } = require("../lib/escape");

function sendHtml(res, html, cache) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", cache || "public, max-age=60");
  res.status(200).send(html);
}

module.exports = async function handler(req, res) {
  var slug = req.query.slug;

  if (!slug || typeof slug !== "string") {
    res.status(400).send("Missing shop slug");
    return;
  }

  slug = makeSlug(slug);

  if (!slug) {
    res.status(400).send("Invalid shop slug");
    return;
  }

  try {
    var published = await store.getPublished(slug);
    if (published && published.business && published.business.name) {
      sendHtml(res, generateShopPageHTML(published), "public, max-age=60, must-revalidate");
      return;
    }

    var stripeShop = await store.shopDataFromStripe(slug);
    if (stripeShop) {
      var doc = shopDataToDocument(stripeShop);
      sendHtml(res, generateShopPageHTML(doc), "public, max-age=300");
      return;
    }

    res.status(404).send("Shop not found");
  } catch (e) {
    console.error("Error serving shop page:", e);
    if (e.type === "StripeAuthenticationError") {
      res.status(404).send("Shop not found");
    } else {
      res.status(500).send("Error loading shop page");
    }
  }
};
