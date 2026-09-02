const { escapeHTML, makeSlug, safeImageUrl } = require("./escape");

var TEMPLATE_ID = "local-shop-v1";
var PALETTES = ["navy-red", "blue-gold"];
var SECTION_TYPES = ["hero", "about", "photos", "services", "reviews", "area", "map", "contact"];
var MAX_SERVICES = 20;
var MAX_REVIEWS = 10;
var MAX_PHOTOS = 8;
var MAX_TOWNS = 16;
var MAX_TEXT = 4000;
var MAX_SHORT = 200;

function clip(str, n) {
  return String(str == null ? "" : str).slice(0, n);
}

function newId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10);
}

function defaultSections() {
  return [
    { id: "hero", type: "hero", enabled: true, settings: { headline: "", tagline: "", ctaLabel: "" } },
    { id: "about", type: "about", enabled: true, settings: { body: "" } },
    { id: "photos", type: "photos", enabled: true, settings: { images: [] } },
    { id: "services", type: "services", enabled: true, blocks: [] },
    { id: "reviews", type: "reviews", enabled: true, blocks: [] },
    { id: "area", type: "area", enabled: false, settings: { towns: "", note: "" } },
    { id: "map", type: "map", enabled: true, settings: {} },
    { id: "contact", type: "contact", enabled: true, settings: {} }
  ];
}

function emptyDocument(slug) {
  return {
    slug: makeSlug(slug || "shop"),
    templateId: TEMPLATE_ID,
    status: "draft",
    theme: { palette: "navy-red" },
    business: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      hours: "",
      category: ""
    },
    pages: { home: { sections: defaultSections() } },
    updatedAt: ""
  };
}

function isSiteDocument(data) {
  return !!(data && typeof data === "object" && data.pages && data.pages.home);
}

function normalizePalette(value) {
  return PALETTES.indexOf(value) !== -1 ? value : "navy-red";
}

function normalizeImages(list) {
  var out = [];
  (Array.isArray(list) ? list : []).forEach(function (item) {
    if (out.length >= MAX_PHOTOS) return;
    var url = "";
    if (typeof item === "string") url = safeImageUrl(item);
    else if (item && typeof item === "object") url = safeImageUrl(item.url || item.src || "");
    if (url && out.indexOf(url) === -1) out.push(url);
  });
  return out;
}

function normalizeServiceBlocks(blocks) {
  var out = [];
  (Array.isArray(blocks) ? blocks : []).forEach(function (b) {
    if (out.length >= MAX_SERVICES) return;
    if (!b || typeof b !== "object") return;
    out.push({
      id: clip(b.id, 40) || newId("svc"),
      name: clip(b.name, MAX_SHORT),
      description: clip(b.description, 600)
    });
  });
  return out;
}

function normalizeReviewBlocks(blocks) {
  var out = [];
  (Array.isArray(blocks) ? blocks : []).forEach(function (b) {
    if (out.length >= MAX_REVIEWS) return;
    if (!b || typeof b !== "object") return;
    var rating = parseInt(b.rating, 10);
    if (isNaN(rating) || rating < 1) rating = 5;
    if (rating > 5) rating = 5;
    out.push({
      id: clip(b.id, 40) || newId("rev"),
      rating: rating,
      text: clip(b.text || b.comment, 800),
      author: clip(b.author || b.name, MAX_SHORT)
    });
  });
  return out;
}

function normalizeSection(section, index) {
  var type = SECTION_TYPES.indexOf(section && section.type) !== -1 ? section.type : "about";
  var id = clip(section && section.id, 40) || type;
  var enabled = section && section.enabled === false ? false : true;
  var settings = (section && section.settings && typeof section.settings === "object") ? section.settings : {};
  var base = { id: id, type: type, enabled: enabled };

  if (type === "hero") {
    base.settings = {
      headline: clip(settings.headline, MAX_SHORT),
      tagline: clip(settings.tagline, 300),
      ctaLabel: clip(settings.ctaLabel, MAX_SHORT)
    };
    return base;
  }
  if (type === "about") {
    base.settings = { body: clip(settings.body, MAX_TEXT) };
    return base;
  }
  if (type === "photos") {
    base.settings = { images: normalizeImages(settings.images || settings.photos) };
    return base;
  }
  if (type === "services") {
    base.blocks = normalizeServiceBlocks(section.blocks);
    return base;
  }
  if (type === "reviews") {
    base.blocks = normalizeReviewBlocks(section.blocks);
    return base;
  }
  if (type === "area") {
    base.settings = {
      towns: clip(settings.towns, 400),
      note: clip(settings.note, 300)
    };
    return base;
  }
  base.settings = {};
  return base;
}

function mergeSections(incoming) {
  var defaults = defaultSections();
  var byType = {};
  (Array.isArray(incoming) ? incoming : []).forEach(function (s) {
    if (s && s.type && SECTION_TYPES.indexOf(s.type) !== -1 && !byType[s.type]) {
      byType[s.type] = normalizeSection(s);
    }
  });
  return defaults.map(function (d) {
    return byType[d.type] || d;
  });
}

function normalizeSiteDocument(raw, slugHint) {
  var src = raw && typeof raw === "object" ? raw : {};
  var biz = src.business && typeof src.business === "object" ? src.business : {};
  var theme = src.theme && typeof src.theme === "object" ? src.theme : {};
  var home = src.pages && src.pages.home && typeof src.pages.home === "object" ? src.pages.home : {};
  var slug = makeSlug(src.slug || slugHint || biz.name || "shop");
  var status = src.status === "published" ? "published" : "draft";

  return {
    slug: slug,
    templateId: TEMPLATE_ID,
    status: status,
    theme: { palette: normalizePalette(theme.palette || src.scheme) },
    business: {
      name: clip(biz.name || src.shop, MAX_SHORT),
      phone: clip(biz.phone || src.phone, 40),
      email: clip(biz.email || src.email, 120),
      address: clip(biz.address || src.address, 200),
      city: clip(biz.city || src.city, 80),
      state: clip(biz.state || src.state, 40),
      zip: clip(biz.zip || src.zip, 20),
      hours: clip(biz.hours || src.hours, 200),
      category: clip(biz.category || src.category, 120)
    },
    pages: {
      home: {
        sections: mergeSections(home.sections)
      }
    },
    updatedAt: clip(src.updatedAt, 40)
  };
}

function deriveServicesFromCategory(category) {
  var cat = String(category || "").toLowerCase();
  var services = [];

  if (cat.indexOf("electric") !== -1) {
    services = [
      { name: "Electrical Wiring", description: "Complete wiring installation and repair for homes and businesses." },
      { name: "Panel Upgrades", description: "Upgrade your electrical panel to meet current safety standards and power needs." },
      { name: "Outlets & Switches", description: "Install and repair outlets, switches, and electrical fixtures." },
      { name: "Lighting", description: "Professional lighting installation and repair for any space." },
      { name: "Electrical Repair", description: "Fast troubleshooting and repair of all types of electrical issues." },
      { name: "New Construction Electrical", description: "Full electrical systems for new builds and major renovations." }
    ];
  } else if (cat.indexOf("hvac") !== -1 || cat.indexOf("heating") !== -1 || cat.indexOf("cooling") !== -1 || cat.indexOf("air condition") !== -1) {
    services = [
      { name: "Heating Repair", description: "Fast, reliable repair of furnaces, heat pumps, and heating systems." },
      { name: "Air Conditioning Repair", description: "Expert AC repair and maintenance to keep you cool." },
      { name: "HVAC Installation", description: "Professional installation of new heating and cooling systems." },
      { name: "Maintenance Plans", description: "Regular HVAC maintenance to prevent breakdowns and extend system life." },
      { name: "Duct Work", description: "Duct installation, repair, and cleaning for better airflow." },
      { name: "Emergency Service", description: "24/7 emergency HVAC repair when you need it most." }
    ];
  } else if (cat.indexOf("plumb") !== -1) {
    services = [
      { name: "Drain Cleaning", description: "Clear clogs and keep your drains flowing smoothly." },
      { name: "Leak Repair", description: "Fast repair of leaking pipes, faucets, and fixtures." },
      { name: "Water Heater Service", description: "Water heater installation, repair, and maintenance." },
      { name: "Fixture Installation", description: "Install sinks, toilets, faucets, and other plumbing fixtures." },
      { name: "Pipe Repair", description: "Repair or replace damaged pipes to prevent water damage." },
      { name: "Emergency Plumbing", description: "24/7 emergency plumbing service for urgent issues." }
    ];
  } else if (cat.indexOf("auto") !== -1 && (cat.indexOf("body") !== -1 || cat.indexOf("repair") !== -1 || cat.indexOf("collision") !== -1)) {
    services = [
      { name: "Collision Repair", description: "Expert repair of accident damage to get you back on the road." },
      { name: "Dent Removal", description: "Paintless and traditional dent repair services." },
      { name: "Auto Painting", description: "Professional automotive painting and refinishing." },
      { name: "Frame Straightening", description: "Precision frame repair to restore structural integrity." },
      { name: "Glass Replacement", description: "Windshield and auto glass replacement services." },
      { name: "Insurance Claims", description: "We work with your insurance to streamline the repair process." }
    ];
  }

  if (cat.indexOf("utility") !== -1 && services.length > 0) {
    services.push({ name: "Utility Work", description: "Professional utility contractor services for residential and commercial projects." });
  }

  return services.map(function (s, i) {
    return { id: "svc-" + (i + 1), name: s.name, description: s.description };
  });
}

function generateAboutPlain(shop, category, city, state, address) {
  var cat = String(category || "").toLowerCase();
  var location = (city && state) ? city + ", " + state : "";
  var shopName = shop || "This shop";
  var locationText = location ? " in " + location : "";
  var addressText = address ? " Based at " + address + "." : "";

  var trade = "local business";
  if (cat.indexOf("electric") !== -1) trade = "electrician";
  else if (cat.indexOf("hvac") !== -1 || cat.indexOf("heating") !== -1 || cat.indexOf("cooling") !== -1) trade = "HVAC contractor";
  else if (cat.indexOf("plumb") !== -1) trade = "plumber";
  else if (cat.indexOf("auto") !== -1 && cat.indexOf("body") !== -1) trade = "auto body shop";

  var body = shopName + " is a local " + trade + locationText + ". We provide " +
    (category ? String(category).toLowerCase() : "quality") +
    " services for residential and commercial clients." + addressText;
  if (location) body += "\n\nCall us for reliable service" + locationText + ".";
  return body;
}

function sectionByType(doc, type) {
  var sections = doc && doc.pages && doc.pages.home && doc.pages.home.sections;
  if (!Array.isArray(sections)) return null;
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].type === type) return sections[i];
  }
  return null;
}

function shopDataToDocument(shopData) {
  var src = shopData && typeof shopData === "object" ? shopData : {};
  if (isSiteDocument(src)) return normalizeSiteDocument(src);

  var doc = emptyDocument(src.slug || src.shop);
  doc.status = "published";
  doc.theme.palette = normalizePalette(src.scheme || src.palette);
  doc.business = {
    name: clip(src.shop || src.name, MAX_SHORT),
    phone: clip(src.phone, 40),
    email: clip(src.email, 120),
    address: clip(src.address, 200),
    city: clip(src.city, 80),
    state: clip(src.state, 40),
    zip: clip(src.zip, 20),
    hours: clip(src.hours, 200),
    category: clip(src.category, 120)
  };

  var hero = sectionByType(doc, "hero");
  if (hero) {
    hero.settings.headline = doc.business.name;
    var loc = [doc.business.city, doc.business.state].filter(Boolean).join(", ");
    hero.settings.tagline = [doc.business.category, loc ? "in " + loc : ""].filter(Boolean).join(" ");
    hero.settings.ctaLabel = doc.business.phone ? "Call " + doc.business.phone : "Call Now";
  }

  var about = sectionByType(doc, "about");
  if (about) {
    about.settings.body = generateAboutPlain(
      doc.business.name,
      doc.business.category,
      doc.business.city,
      doc.business.state,
      doc.business.address
    );
  }

  var photos = sectionByType(doc, "photos");
  if (photos) {
    photos.settings.images = normalizeImages(src.photos || []);
    photos.enabled = photos.settings.images.length > 0;
  }

  var services = sectionByType(doc, "services");
  if (services) {
    if (Array.isArray(src.services) && src.services.length) {
      services.blocks = normalizeServiceBlocks(src.services);
    } else {
      services.blocks = deriveServicesFromCategory(doc.business.category);
    }
    services.enabled = services.blocks.length > 0;
  }

  var reviews = sectionByType(doc, "reviews");
  if (reviews) {
    var rawReviews = src.reviews || [];
    reviews.blocks = normalizeReviewBlocks(rawReviews);
    reviews.enabled = reviews.blocks.length > 0;
  }

  var map = sectionByType(doc, "map");
  if (map) {
    map.enabled = !!(doc.business.address && (doc.business.city || doc.business.zip));
  }

  return normalizeSiteDocument(doc);
}

function documentSize(doc) {
  return Buffer.byteLength(JSON.stringify(doc || {}), "utf8");
}

function assertDocumentSize(doc) {
  if (documentSize(doc) > 200 * 1024) {
    var err = new Error("Site document is too large");
    err.code = "DOC_TOO_LARGE";
    throw err;
  }
}

module.exports = {
  TEMPLATE_ID: TEMPLATE_ID,
  PALETTES: PALETTES,
  SECTION_TYPES: SECTION_TYPES,
  MAX_PHOTOS: MAX_PHOTOS,
  MAX_SERVICES: MAX_SERVICES,
  MAX_REVIEWS: MAX_REVIEWS,
  MAX_TOWNS: MAX_TOWNS,
  emptyDocument: emptyDocument,
  defaultSections: defaultSections,
  isSiteDocument: isSiteDocument,
  normalizeSiteDocument: normalizeSiteDocument,
  shopDataToDocument: shopDataToDocument,
  deriveServicesFromCategory: deriveServicesFromCategory,
  generateAboutPlain: generateAboutPlain,
  sectionByType: sectionByType,
  documentSize: documentSize,
  assertDocumentSize: assertDocumentSize,
  escapeHTML: escapeHTML,
  makeSlug: makeSlug
};
