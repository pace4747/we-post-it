const store = require("../lib/site-store");
const { publicOrigin, shopOrigin, shopSlugFromHost } = require("../lib/host");
const seo = require("../lib/shop-seo");

var cache = { at: 0, xml: "" };
var TTL_MS = 60 * 60 * 1000;

function sitemapIndexXml(locs) {
  var body = locs.map(function (loc) {
    return "  <sitemap><loc>" + loc + "</loc></sitemap>";
  }).join("\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body + "\n" +
    "</sitemapindex>\n";
}

async function buildIndex() {
  var origin = publicOrigin();
  var locs = [origin + "/sitemap.xml"];
  var slugs = await store.listKnownSlugs();
  var i;
  for (i = 0; i < slugs.length; i++) {
    var slug = slugs[i];
    try {
      var published = await store.getPublished(slug);
      if (seo.shouldIndexShop(published)) {
        locs.push(shopOrigin(slug) + "/sitemap.xml");
      }
    } catch (e) {}
  }
  return sitemapIndexXml(locs);
}

module.exports = async function handler(req, res) {
  if (shopSlugFromHost(req)) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.status(404).send("Not found");
    return;
  }
  try {
    var now = Date.now();
    if (!cache.xml || now - cache.at > TTL_MS) {
      cache.xml = await buildIndex();
      cache.at = now;
    }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    res.status(200).send(cache.xml);
  } catch (e) {
    console.error("sitemap-index", e.message || e);
    res.status(500).send("Error");
  }
};
