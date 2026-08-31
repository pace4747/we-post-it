const assert = require("assert");
const {
  shopDataToDocument,
  normalizeSiteDocument,
  isSiteDocument,
  emptyDocument,
  deriveServicesFromCategory
} = require("../lib/site-document");
const { escapeHTML, safeImageUrl, makeSlug } = require("../lib/escape");

var doc = shopDataToDocument({
  shop: "Test Electric",
  phone: "555-0100",
  category: "Electrician",
  city: "Cameron",
  state: "TX",
  zip: "76520",
  address: "1 Main St",
  photos: ["https://example.com/a.jpg", "javascript:alert(1)", "/towns/cameron-tx.jpg"]
});

assert.ok(isSiteDocument(doc));
assert.strictEqual(doc.templateId, "local-shop-v1");
assert.strictEqual(doc.business.name, "Test Electric");
assert.ok(doc.pages.home.sections.length >= 8);
assert.ok(doc.pages.home.sections.some(function (s) { return s.type === "services" && s.blocks.length > 0; }));

var photos = doc.pages.home.sections.filter(function (s) { return s.type === "photos"; })[0];
assert.deepStrictEqual(photos.settings.images, ["https://example.com/a.jpg", "/towns/cameron-tx.jpg"]);

var xss = normalizeSiteDocument({
  slug: "x",
  pages: { home: { sections: [{ type: "about", settings: { body: "<script>alert(1)</script>" } }] } }
}, "x");
assert.ok(xss.pages.home.sections.filter(function (s) { return s.type === "about"; })[0].settings.body.indexOf("<script>") !== -1);
assert.strictEqual(escapeHTML(xss.pages.home.sections.filter(function (s) { return s.type === "about"; })[0].settings.body).indexOf("<script>"), -1);

assert.strictEqual(safeImageUrl("javascript:alert(1)"), "");
assert.strictEqual(safeImageUrl("https://cdn.example/p.png"), "https://cdn.example/p.png");
assert.strictEqual(makeSlug("R & R Electric"), "r-r-electric");

var empty = emptyDocument("hello world");
assert.strictEqual(empty.slug, "hello-world");
assert.strictEqual(deriveServicesFromCategory("HVAC").length > 0, true);

assert.ok(shopDataToDocument(doc).business.name === "Test Electric");

console.log("site-document tests ok");
