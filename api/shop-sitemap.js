const store = require("../lib/site-store");
const { makeSlug } = require("../lib/escape");
const { shopSlugFromHost, shopOrigin } = require("../lib/host");
const seo = require("../lib/shop-seo");

module.exports = async function handler(req, res) {
  var slug = makeSlug(req.query.slug || shopSlugFromHost(req));
  if (!slug) {
    res.status(400).send("Missing shop slug");
    return;
  }
  try {
    var published = await store.getPublished(slug);
    var origin = shopOrigin(slug);
    if (!seo.shouldIndexShop(published)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send("Not found");
      return;
    }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    res.setHeader("X-Robots-Tag", "index, follow");
    res.status(200).send(seo.sitemapXml(origin, published && published.updatedAt));
  } catch (e) {
    console.error("shop-sitemap", e.message || e);
    res.status(500).send("Error");
  }
};
