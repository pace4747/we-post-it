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
    if (published) published = (await store.expireHostIfDue(slug)) || published;
    if (!published || store.isTakenDown(published)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send("Not found");
      return;
    }
    var origin = shopOrigin(slug);
    var paid = store.isHostedPaid(published) && published.status === "published";
    if (!paid) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.status(404).send("Not found");
      return;
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    res.setHeader("X-Robots-Tag", "index, follow");
    res.status(200).send(seo.llmsText(published, origin));
  } catch (e) {
    console.error("shop-llms", e.message || e);
    res.status(500).send("Error");
  }
};
