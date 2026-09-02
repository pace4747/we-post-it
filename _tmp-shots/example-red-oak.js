#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { emptyDocument, sectionByType } = require("../lib/site-document");
const { applyTradePack } = require("../lib/trade-pack");
const { generateShopPageHTML } = require("../lib/render-shop-page");

var PHOTOS = [
  "/stock/generic/general-contractor/framing.png",
  "/stock/generic/general-contractor/kitchen-frame.png",
  "/stock/generic/general-contractor/addition.png",
  "/stock/generic/general-contractor/pickup.png",
  "/stock/generic/general-contractor/lumber.png",
  "/stock/generic/general-contractor/sawhorses.png"
];

var STAMP = `
<style>
.example-stamp {
  position: fixed;
  top: 5.25rem;
  left: 50%;
  transform: translateX(-50%) rotate(-7deg);
  z-index: 400;
  background: #e85d04;
  color: #111;
  font-weight: 800;
  font-size: 1.2rem;
  letter-spacing: 0.06em;
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  pointer-events: none;
  text-transform: uppercase;
}
</style>
<div class="example-stamp">Example · not a real business</div>
`;

function buildDoc() {
  var doc = emptyDocument("example-construction");
  doc.status = "published";
  doc.billing = { paid: true, cancelled: false };
  doc.business.name = "Example Construction";
  doc.business.phone = "(555) 010-0000";
  doc.business.phoneE164 = "+15550100000";
  doc.business.city = "Sample";
  doc.business.state = "TX";
  doc.business.zip = "00000";
  doc.business.category = "Example shop";
  doc.business.hideAddress = true;
  doc.business.hours = "Mon–Fri 7 AM–5 PM; Sat 8 AM–12 PM";
  doc.business.hoursPeriods = [
    { day: 1, open: "07:00", close: "17:00" },
    { day: 2, open: "07:00", close: "17:00" },
    { day: 3, open: "07:00", close: "17:00" },
    { day: 4, open: "07:00", close: "17:00" },
    { day: 5, open: "07:00", close: "17:00" },
    { day: 6, open: "08:00", close: "12:00" }
  ];
  applyTradePack(doc, { trade: "general-contractor", refreshTowns: true, refreshAbout: true });
  doc.theme.palette = "charcoal-orange";
  doc.theme.look = "photo";
  doc.theme.heroSrc = PHOTOS[0];

  var hero = sectionByType(doc, "hero");
  if (hero) {
    hero.settings = hero.settings || {};
    hero.settings.headline = "Example Construction";
    hero.settings.tagline = "Example shop · not a real business";
    hero.settings.ctaLabel = "Call (555) 010-0000";
  }

  var about = sectionByType(doc, "about");
  if (about) {
    about.settings = about.settings || {};
    about.settings.body = "This is an example page. It is not a real business. Example Construction is a sample shop so you can see the layout.";
  }

  var area = sectionByType(doc, "area");
  if (area) {
    area.enabled = true;
    area.settings = area.settings || {};
    area.settings.towns = "Sample, Demo, Example, Placeholder";
    area.settings.note = "Example towns. Not a real service area.";
  }

  var photos = sectionByType(doc, "photos");
  if (photos) {
    photos.enabled = true;
    photos.settings = photos.settings || {};
    photos.settings.images = PHOTOS.slice();
  }

  var reviews = sectionByType(doc, "reviews");
  if (reviews) {
    reviews.enabled = true;
    reviews.blocks = [
      {
        id: "rev-1",
        rating: 5,
        text: "Example review. This quote is made up for the sample page.",
        author: "Example customer"
      },
      {
        id: "rev-2",
        rating: 5,
        text: "Another example review. Not from a real job.",
        author: "Sample name"
      },
      {
        id: "rev-3",
        rating: 5,
        text: "Sample quote so the Reviews block looks filled.",
        author: "Demo customer"
      }
    ];
  }

  var map = sectionByType(doc, "map");
  if (map) map.enabled = false;

  return doc;
}

var doc = buildDoc();
var html = generateShopPageHTML(doc, {});
html = html.replace(/<body([^>]*)>/, "<body$1>" + STAMP);
var out = path.join(__dirname, "example-red-oak.html");
fs.writeFileSync(out, html);
console.log("Wrote", out);
console.log("name", doc.business.name);
console.log("tagline", sectionByType(doc, "hero").settings.tagline);
console.log("photos", (sectionByType(doc, "photos").settings.images || []).length);
