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
    var indexable = seo.shouldIndexShop(published);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    res.setHeader("X-Robots-Tag", indexable ? "index, follow" : "noindex, nofollow");
    res.status(200).send(seo.robotsTxt(origin, indexable));
  } catch (e) {
    console.error("shop-robots", e.message || e);
    res.status(500).send("Error");
  }
};
