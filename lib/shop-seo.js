const { shopOrigin } = require("./host");
const { safeUrl } = require("./escape");

var TRADE_TYPE = {
  electrician: "Electrician",
  hvac: "HVACBusiness",
  plumber: "Plumber",
  roofing: "RoofingContractor",
  "general-contractor": "GeneralContractor",
  collision: "AutoRepair"
};

  var TRADE_WORK = {
  electrician: "Electrical work",
  hvac: "Heating and cooling",
  plumber: "Plumbing",
  roofing: "Roofing",
  "general-contractor": "Contractor work",
  collision: "Auto body work"
};

var DAY_MAP = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

function withinHostGrace(doc) {
  if (!doc || !doc.billing || !doc.billing.cancelled) return false;
  var until = Date.parse(doc.billing.hostUntil || "");
  if (isNaN(until)) return false;
  return Date.now() < until;
}

function shouldIndexShop(doc, options) {
  options = options || {};
  if (options.allowIndex === true) {
    if (options.previewBanner || options.editorPreview) return false;
    return true;
  }
  if (options.allowIndex === false) return false;
  if (options.previewBanner || options.editorPreview) return false;
  if (!doc) return false;
  if (doc.status !== "published") return false;
  if (!doc.billing || doc.billing.paid !== true) return false;
  if (doc.billing.cancelled && !withinHostGrace(doc)) return false;
  return true;
}

function absUrl(origin, src) {
  var s = String(src || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return safeUrl(s);
  if (s.charAt(0) === "/" && s.indexOf("//") !== 0) {
    return String(origin || "").replace(/\/$/, "") + s;
  }
  return "";
}

function mapsProfileUrl(doc) {
  var stored = safeUrl(doc && doc.mapsUrl);
  if (stored) return stored;
  var placeId = String((doc && doc.placeId) || "").trim();
  if (!placeId) return "";
  return "https://www.google.com/maps/place/?q=place_id:" + encodeURIComponent(placeId);
}

function directoryLabel(url) {
  try {
    var host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    if (host.indexOf("facebook") >= 0 || host === "fb.com") return "Facebook";
    if (host.indexOf("instagram") >= 0) return "Instagram";
    if (host.indexOf("yelp") >= 0) return "Yelp";
    if (host.indexOf("foursquare") >= 0) return "Foursquare";
    if (host.indexOf("bbb") >= 0) return "BBB";
    if (host.indexOf("nextdoor") >= 0) return "Nextdoor";
    if (host.indexOf("yellowpages") >= 0) return "Yellow Pages";
    return host;
  } catch (e) {
    return "Listing";
  }
}

function toHour(token) {
  var m = String(token || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return "";
  var h = parseInt(m[1], 10);
  var min = m[2] ? parseInt(m[2], 10) : 0;
  var ap = (m[3] || "").toUpperCase();
  if (ap === "AM") {
    if (h === 12) h = 0;
  } else if (ap === "PM") {
    if (h !== 12) h += 12;
  }
  if (h < 0 || h > 23 || min < 0 || min > 59) return "";
  return String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
}

function parseOpeningHours(hoursText) {
  var out = [];
  String(hoursText || "").split(/[;\n]/).forEach(function (chunk) {
    var line = chunk.trim();
    if (!line) return;
    var parts = line.split(":");
    if (parts.length < 2) return;
    var dayKey = parts[0].trim().toLowerCase();
    var day = DAY_MAP[dayKey];
    if (!day) return;
    var rest = parts.slice(1).join(":").trim();
    if (!rest || /^closed$/i.test(rest)) return;
    var range = rest.split(/[–—−-]/);
    if (range.length < 2) return;
    var opens = toHour(range[0]);
    var closes = toHour(range[1]);
    if (!opens || !closes) return;
    out.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: day,
      opens: opens,
      closes: closes
    });
  });
  return out;
}

function areaCities(city, towns) {
  var names = [];
  var seen = Object.create(null);
  function add(name) {
    var n = String(name || "").trim();
    if (!n) return;
    var key = n.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    names.push({ "@type": "City", name: n });
  }
  add(city);
  (Array.isArray(towns) ? towns : []).forEach(add);
  return names;
}

function schemaGraph(doc, origin, extras) {
  extras = extras || {};
  var biz = (doc && doc.business) || {};
  var trade = (doc && doc.theme && doc.theme.trade) || "other";
  var type = TRADE_TYPE[trade] || "LocalBusiness";
  var shop = biz.name || "Shop";
  var hideAddress = biz.hideAddress === true;
  var id = origin + "/#business";
  var maps = mapsProfileUrl(doc);
  var sameAs = [];
  if (maps) sameAs.push(maps);
  var links = (doc && doc.links) || {};
  ["facebook", "instagram", "yelp", "foursquare", "directory"].forEach(function (key) {
    var u = safeUrl(links[key]);
    if (u && sameAs.indexOf(u) === -1) sameAs.push(u);
  });
  var directory = safeUrl(doc && doc.directoryUrl);
  if (directory && sameAs.indexOf(directory) === -1) sameAs.push(directory);

  var entity = {
    "@type": type,
    "@id": id,
    name: shop,
    url: origin + "/"
  };
  if (biz.phoneE164) entity.telephone = biz.phoneE164;
  else if (biz.phone) entity.telephone = biz.phone;
  if (biz.email) entity.email = biz.email;
  if (extras.images && extras.images.length) entity.image = extras.images;
  else if (extras.image) entity.image = extras.image;

  var addr = { "@type": "PostalAddress", addressCountry: "US" };
  if (biz.city) addr.addressLocality = biz.city;
  if (biz.state) addr.addressRegion = biz.state;
  if (!hideAddress && biz.address) addr.streetAddress = biz.address;
  if (!hideAddress && biz.zip) addr.postalCode = biz.zip;
  if (addr.addressLocality || addr.streetAddress) entity.address = addr;

  if (doc && doc.lat != null && doc.lng != null) {
    entity.geo = {
      "@type": "GeoCoordinates",
      latitude: doc.lat,
      longitude: doc.lng
    };
  }

  var hours = [];
  if (Array.isArray(biz.hoursPeriods) && biz.hoursPeriods.length) {
    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    biz.hoursPeriods.forEach(function (p) {
      if (!p || p.day == null || !p.open || !p.close) return;
      hours.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: dayNames[p.day] || "Monday",
        opens: p.open,
        closes: p.close
      });
    });
  }
  if (!hours.length) hours = parseOpeningHours(biz.hours);
  if (hours.length) entity.openingHoursSpecification = hours;

  if (biz.rating > 0 && biz.reviewCount > 0) {
    entity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(biz.rating),
      reviewCount: String(biz.reviewCount),
      bestRating: "5",
      worstRating: "1"
    };
  }

  var served = areaCities(biz.city, extras.towns);
  if (served.length) entity.areaServed = served;

  if (maps) entity.hasMap = maps;
  if (sameAs.length) entity.sameAs = sameAs;

  var tel = biz.phoneE164 || biz.phone;
  if (tel) {
    entity.contactPoint = {
      "@type": "ContactPoint",
      telephone: tel,
      contactType: "customer service",
      availableLanguage: "English"
    };
  }

  var services = extras.services || [];
  if (services.length) {
    entity.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map(function (s) {
        var offer = {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: s.name || "Service",
            provider: { "@id": id }
          }
        };
        if (s.description) offer.itemOffered.description = s.description;
        if (served.length) offer.itemOffered.areaServed = served;
        return offer;
      })
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      entity,
      {
        "@type": "WebSite",
        "@id": origin + "/#website",
        url: origin + "/",
        name: shop,
        publisher: { "@id": id }
      }
    ]
  };
}

function jsonLdScript(obj) {
  return '<script type="application/ld+json">\n' +
    JSON.stringify(obj).replace(/</g, "\\u003c") +
    "\n</script>";
}

function llmsText(doc, origin) {
  var biz = (doc && doc.business) || {};
  var lines = [];
  lines.push("# " + (biz.name || "Shop"));
  if (biz.category) lines.push("Category: " + biz.category);
  if (biz.phone) lines.push("Phone: " + biz.phone);
  var loc = [biz.city, biz.state].filter(Boolean).join(", ");
  if (loc) lines.push("Location: " + loc);
  if (biz.hours) lines.push("Hours: " + biz.hours);
  if (origin) lines.push("Website: " + origin + "/");
  var maps = mapsProfileUrl(doc);
  if (maps) lines.push("Google Maps: " + maps);
  return lines.join("\n") + "\n";
}

function lastmodDay(value) {
  if (!value) return "";
  var d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function sitemapXml(origin, lastmod) {
  var loc = String(origin || "").replace(/\/$/, "") + "/";
  var day = lastmodDay(lastmod);
  var inner = "    <loc>" + loc + "</loc>";
  if (day) inner += "\n    <lastmod>" + day + "</lastmod>";
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "  <url>\n" + inner + "\n  </url>\n" +
    "</urlset>\n";
}

function robotsTxt(origin, indexable) {
  if (!indexable) {
    return "User-agent: *\nDisallow: /\n";
  }
  var sitemap = String(origin || "").replace(/\/$/, "") + "/sitemap.xml";
  return "User-agent: *\nAllow: /\n\nSitemap: " + sitemap + "\n";
}

function workHeading(trade, locationLine) {
  var work = TRADE_WORK[trade] || "Local work";
  var loc = String(locationLine || "").trim();
  return loc ? work + " in " + loc : work;
}

function servicesHeading(locationLine) {
  return "Services";
}

function photosHeading(shop, locationLine) {
  return "Photos";
}

function areaHeading(locationLine) {
  return "Where we work";
}

module.exports = {
  shouldIndexShop: shouldIndexShop,
  absUrl: absUrl,
  mapsProfileUrl: mapsProfileUrl,
  directoryLabel: directoryLabel,
  parseOpeningHours: parseOpeningHours,
  schemaGraph: schemaGraph,
  jsonLdScript: jsonLdScript,
  llmsText: llmsText,
  sitemapXml: sitemapXml,
  robotsTxt: robotsTxt,
  workHeading: workHeading,
  servicesHeading: servicesHeading,
  photosHeading: photosHeading,
  areaHeading: areaHeading,
  shopOrigin: shopOrigin
};
