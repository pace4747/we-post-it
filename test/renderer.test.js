const assert = require("assert");
const { generateShopPageHTML } = require("../api/shop-page-generator");
const { normalizeSiteDocument } = require("../lib/site-document");
const seed = require("../sites/rr-electric/published.json");

var legacy = generateShopPageHTML({
  shop: "Acme HVAC",
  category: "Heating",
  phone: "555-0100",
  city: "Rockdale",
  state: "TX",
  zip: "76567",
  address: "10 Oak St",
  scheme: "blue-gold"
});
assert.ok(legacy.indexOf("Acme HVAC") !== -1);
assert.ok(legacy.indexOf("scheme-blue-gold") !== -1);
assert.ok(legacy.indexOf("Heating Repair") !== -1);
assert.ok(legacy.indexOf("<script>alert") === -1);

var evil = generateShopPageHTML({
  shop: "<img src=x onerror=alert(1)>",
  phone: "555",
  category: "Electrician"
});
assert.ok(evil.indexOf("<img src=x onerror") === -1);
assert.ok(evil.indexOf("&lt;img") !== -1);

var fromSeed = generateShopPageHTML(normalizeSiteDocument(seed));
assert.ok(fromSeed.indexOf("R &amp; R Electric") !== -1);
assert.ok(fromSeed.indexOf("3621 FM1600") !== -1);
assert.ok(fromSeed.indexOf("Electrical Wiring") !== -1);
assert.ok(fromSeed.indexOf("Cameron") !== -1);
assert.ok(fromSeed.indexOf("Call for hours") !== -1);

var preview = generateShopPageHTML(seed, { editorPreview: true });
assert.ok(preview.indexOf("data-section=\"hero\"") !== -1);
assert.ok(preview.indexOf("wpi-select-section") !== -1);
assert.ok(preview.indexOf("noindex") !== -1);

var hidden = JSON.parse(JSON.stringify(seed));
hidden.pages.home.sections.forEach(function (s) {
  if (s.type === "services") s.enabled = false;
});
var htmlHidden = generateShopPageHTML(hidden);
assert.ok(htmlHidden.indexOf("Electrical Wiring") === -1);

console.log("renderer tests ok");
